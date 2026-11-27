// D2.6 scheduled delivery job + D4.1 automatic event pass. PGlite only; the email provider is always a fake.
import {completeMemberFixture} from './member-identity-fixtures.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {migrate,loadMigrations} from '../scripts/database/migrations.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),pg=new PGlite({extensions:{citext,pgcrypto}});
process.env.EVENT_PASS_TOKEN_KEYS=JSON.stringify({job:randomBytes(32).toString('hex')});process.env.EVENT_PASS_TOKEN_KEY_ID='job';
const SECRET='s'.repeat(40);
let dbCalls=0,resendMode='ok';const resendCalls=[];
const query=async(text,params=[])=>{dbCalls++;return(await pg.query(text,params)).rows;};
const sql={query:(text,params=[])=>({text,params}),transaction:(statements,opts)=>{dbCalls++;assert.equal(opts.isolationLevel,'ReadCommitted');return pg.transaction(async tx=>{const out=[];for(const q of statements)out.push((await tx.query(q.text,q.params)).rows);return out;});}};
// Resend SDK replaced: the route test below runs the production adapter path without any network call.
class FakeResend{emails={send:async(message,options)=>{resendCalls.push({message,options});if(resendMode==='transient')return{error:{name:'rate_limit_exceeded',message:'PRIVATE'}};return{data:{id:'resend-'+randomUUID()}};}}}
const modules=new Map();function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='resend')return{Resend:FakeResend};if(s==='./account-provisioning')return{getCurrentAccount:async()=>null};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const job=load('lib/notifications/notification-job.ts'),auth=load('lib/notifications/job-auth.ts'),policy=load('lib/notifications/notification-job-policy.ts'),route=load('app/api/jobs/notifications/route.ts'),templates=load('lib/notifications/notification-templates.ts');
let mode='ok';const calls=[];
const fake={name:'fake',idempotencyRetentionSeconds:86400,send:async msg=>{calls.push(msg);if(mode==='throw')throw Error('RAW SECRET');if(mode==='transient')return{ok:false,code:'EMAIL_DELIVERY_FAILED',retryable:true};if(mode==='permanent')return{ok:false,code:'EMAIL_DELIVERY_FAILED',retryable:false};return{ok:true,messageId:'msg-'+randomUUID()};}};
const delivery={provider:fake,from:'USS Running <no-reply@example.test>',baseUrl:'https://uss.example.test'};
const migrations=await loadMigrations(new URL('../database/migrations/',import.meta.url));
before(async()=>{await migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},migrations);});after(async()=>pg.close());
const member=async(complete=true)=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING *",[randomUUID(),randomUUID()+'@example.test']))[0];if(complete)await completeMemberFixture(query,a.id);return a;};
const event=async()=>(await query("INSERT INTO uss.events(slug,title,starts_at,ends_at,status) VALUES($1,'Job Run',now()+interval '2 days',now()+interval '3 days','registration_open') RETURNING *",[randomUUID()]))[0];
const register=async(status='confirmed',complete=true)=>{const a=await member(complete),e=await event();const r=(await query('INSERT INTO uss.event_registrations(event_id,account_id,status) VALUES($1,$2,$3) RETURNING *',[e.id,a.id,status]))[0];return{a,e,r};};
const intents=async r=>query('SELECT * FROM uss.notification_deliveries WHERE registration_id=$1 ORDER BY queued_at,id',[r.id]);
const due=async()=>query("UPDATE uss.notification_deliveries SET next_attempt_at=now()-interval '1 second' WHERE schema_version=1 AND status='failed' AND retryable");
// Isolate each test's assertions from other tests' rows: settle everything already queued.
const drain=async()=>{await query("UPDATE uss.notification_deliveries SET cancelled_at=now(),last_error_code='TEST_DRAINED' WHERE schema_version=1 AND cancelled_at IS NULL AND status<>'sent'");calls.length=0;resendCalls.length=0;};
const req=(authorization)=>new Request('https://uss.example.test/api/jobs/notifications',{headers:authorization===undefined?{}:{authorization}});

test('job route rejects missing/wrong secret with 401 and touches neither DB nor provider',async()=>{await drain();const f=await register();process.env.CRON_SECRET=SECRET;const before=dbCalls;
 for(const h of [undefined,'','Bearer','Bearer wrong',`Bearer ${SECRET}x`,`bearer ${SECRET}`,`Basic ${SECRET}`,SECRET,'Bearer '+'x'.repeat(5000)]){const res=await route.GET(req(h));assert.equal(res.status,401,String(h));assert.equal((await res.json()).code,'UNAUTHORIZED');assert.equal(res.headers.get('cache-control'),'no-store');}
 assert.equal((await route.POST(req('Bearer nope'))).status,401);
 assert.equal(dbCalls,before,'no database access before authentication');assert.equal(resendCalls.length,0);
 const n=(await intents(f.r))[0];assert.equal(n.status,'queued');assert.equal(n.attempt_count,0);});

test('job route fails closed (503, no side effects) when CRON_SECRET is unset or too short',async()=>{const before=dbCalls;for(const value of [undefined,'',' ','short-secret']){if(value===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=value;const res=await route.GET(req(`Bearer ${value??''}`));assert.equal(res.status,503);assert.equal((await res.json()).code,'JOB_NOT_CONFIGURED');}assert.equal(dbCalls,before);process.env.CRON_SECRET=SECRET;});

test('secret comparison is constant-time over fixed-length digests',()=>{const src=readFileSync('lib/notifications/job-auth.ts','utf8');assert.match(src,/timingSafeEqual\(digest\(/);assert.equal(auth.authorizeJobRequest('Bearer '+SECRET,SECRET),'AUTHORIZED');assert.equal(auth.authorizeJobRequest('Bearer '+SECRET.slice(1),SECRET),'UNAUTHORIZED');assert.equal(auth.authorizeJobRequest(null,SECRET),'UNAUTHORIZED');});

test('authorized route delivers through the Resend adapter (mocked) with the intent idempotency key',async()=>{await drain();const f=await register('waitlisted');Object.assign(process.env,{RESEND_API_KEY:'test-key',EMAIL_FROM_ADDRESS:'no-reply@example.test',APP_BASE_URL:'https://uss.example.test'});
 try{const res=await route.GET(req('Bearer '+SECRET));assert.equal(res.status,200);const body=await res.json();assert.equal(body.sent,1);assert.ok(!JSON.stringify(body).includes(f.a.email));
  const n=(await intents(f.r))[0];assert.equal(n.status,'sent');assert.equal(resendCalls.length,1);assert.equal(resendCalls[0].options.idempotencyKey,n.idempotency_key);assert.equal(resendCalls[0].message.to,f.a.email);
  assert.equal((await (await route.GET(req('Bearer '+SECRET))).json()).sent,0,'second run sends nothing');assert.equal(resendCalls.length,1);}
 finally{for(const k of ['RESEND_API_KEY','EMAIL_FROM_ADDRESS','APP_BASE_URL'])delete process.env[k];}});

test('authorized route without email configuration reports provider unavailable and claims nothing',async()=>{await drain();const f=await register('waitlisted');const res=await route.GET(req('Bearer '+SECRET));assert.equal(res.status,503);assert.equal((await res.json()).code,'NOTIFICATION_PROVIDER_UNAVAILABLE');assert.equal((await intents(f.r))[0].attempt_count,0);});

test('confirmation, waitlist and cancellation intents are delivered by one scheduled run',async()=>{await drain();const c=await register('confirmed'),w=await register('waitlisted'),x=await register('confirmed');await query("UPDATE uss.event_registrations SET status='cancelled',cancelled_at=now() WHERE id=$1",[x.r.id]);
 const report=await job.runNotificationJob(delivery);assert.equal(report.code,'NOTIFICATION_JOB_COMPLETED');
 for(const [f,type] of [[c,'registration_confirmed'],[w,'registration_waitlisted'],[x,'registration_cancelled']]){const sent=(await intents(f.r)).filter(n=>n.status==='sent');assert.equal(sent.length,1,type);assert.equal(sent[0].notification_type,type);}
 assert.ok((await intents(x.r)).some(n=>n.notification_type==='registration_confirmed'&&n.cancelled_at&&n.status!=='sent'),'superseded confirmation never sent');});

test('confirmed registration gets an automatic event pass and one email linking it (D4.1)',async()=>{await drain();const f=await register('confirmed');const report=await job.runNotificationJob(delivery);assert.equal(report.passesIssued,1);
 const passes=await query('SELECT * FROM uss.event_passes WHERE registration_id=$1',[f.r.id]);assert.equal(passes.length,1);assert.equal(passes[0].status,'active');assert.equal(passes[0].format_version,1);assert.equal(passes[0].token_key_id,'job');
 const mail=calls.find(m=>m.to===f.a.email);assert.ok(mail);assert.match(mail.text,/Open Event Pass: https:\/\/uss\.example\.test\/dashboard\/registrations\/[0-9a-f-]+\?eventId=/);assert.ok(mail.text.includes(f.e.id));assert.ok(!mail.text.includes(passes[0].token_hash));assert.ok(!mail.text.includes('USS-EVENT:'));
 const ns=await intents(f.r),announce=ns.find(n=>n.notification_type==='event_pass_available');assert.ok(announce);assert.equal(announce.last_error_code,'NOTIFICATION_MERGED');assert.equal(announce.status,'queued');assert.ok(announce.cancelled_at);
 assert.equal(calls.filter(m=>m.to===f.a.email).length,1,'no duplicate pass email');
 const audit=(await query("SELECT * FROM uss.audit_logs WHERE entity_id=$1 AND action='event_pass.issued'",[passes[0].id]))[0];assert.equal(audit.actor_account_id,null);assert.equal(audit.change_summary.initiator,'system');});

test('event pass is distinct from the member barcode and issuance is idempotent',async()=>{await drain();const f=await register('confirmed');await job.runNotificationJob(delivery);const pass=(await query('SELECT * FROM uss.event_passes WHERE registration_id=$1',[f.r.id]))[0];const acct=(await query('SELECT barcode_value,member_id FROM uss.accounts WHERE id=$1',[f.a.id]))[0];
 assert.notEqual(pass.token_hash,acct.barcode_value);assert.ok(!String(acct.barcode_value).startsWith('USS-EVENT:'));
 const svc=load('lib/passes/pass-service.ts');for(let i=0;i<3;i++){const again=await svc.issuePassForConfirmedRegistration(f.e.id,f.r.id);assert.equal(again.code,'EVENT_PASS_EXISTS');assert.equal(again.pass_id,pass.id);}
 assert.equal((await query('SELECT count(*)::int n FROM uss.event_passes WHERE registration_id=$1',[f.r.id]))[0].n,1);
 await query("UPDATE uss.event_passes SET status='revoked',revoked_at=now(),revoked_reason='admin_revoked' WHERE id=$1",[pass.id]);assert.equal((await svc.issuePassForConfirmedRegistration(f.e.id,f.r.id)).code,'EVENT_PASS_EXISTS','revoked pass is never silently re-issued');});

test('incomplete profile or ineligible registration gets no pass, confirmation still sent without pass link',async()=>{await drain();const f=await register('confirmed',false);const report=await job.runNotificationJob(delivery);assert.equal(report.passIssueSkipped,1);assert.equal((await query('SELECT count(*)::int n FROM uss.event_passes WHERE registration_id=$1',[f.r.id]))[0].n,0);const mail=calls.find(m=>m.to===f.a.email);assert.match(mail.text,/View registration:/);assert.doesNotMatch(mail.text,/Open Event Pass/);
 const svc=load('lib/passes/pass-service.ts'),w=await register('waitlisted');assert.equal((await svc.issuePassForConfirmedRegistration(w.e.id,w.r.id)).code,'EVENT_PASS_NOT_ELIGIBLE');});

test('missing pass keyring degrades to a confirmation without pass link',async()=>{await drain();const saved=process.env.EVENT_PASS_TOKEN_KEY_ID;delete process.env.EVENT_PASS_TOKEN_KEY_ID;try{const f=await register('confirmed');const report=await job.runNotificationJob(delivery);assert.equal(report.passIssueSkipped,1);assert.equal(report.sent,1);assert.equal((await query('SELECT count(*)::int n FROM uss.event_passes WHERE registration_id=$1',[f.r.id]))[0].n,0);}finally{process.env.EVENT_PASS_TOKEN_KEY_ID=saved;}});

test('concurrent job runs never send the same intent twice',async()=>{await drain();const fs=[];for(let i=0;i<6;i++)fs.push(await register('waitlisted'));const reports=await Promise.all([job.runNotificationJob(delivery),job.runNotificationJob(delivery),job.runNotificationJob(delivery)]);
 for(const f of fs){assert.equal(calls.filter(m=>m.to===f.a.email).length,1);assert.equal((await intents(f.r))[0].attempt_count,1);}
 assert.equal(reports.reduce((n,r)=>n+r.sent,0),6);assert.match(readFileSync('database/migrations/021_notification_delivery_job.sql','utf8'),/FOR UPDATE SKIP LOCKED/);});

test('fresh sending lease is skipped; stale lease is reclaimed with the same idempotency key',async()=>{await drain();const f=await register('waitlisted');const n=(await intents(f.r))[0];
 mode='transient';await job.runNotificationJob(delivery);mode='ok';const first=calls.at(-1);
 await query("UPDATE uss.notification_deliveries SET status='sending',claimed_at=now(),next_attempt_at=NULL WHERE id=$1",[n.id]);
 calls.length=0;assert.equal((await job.runNotificationJob(delivery)).claimed,0);assert.equal(calls.length,0);
 await query("UPDATE uss.notification_deliveries SET claimed_at=now()-interval '6 minutes' WHERE id=$1",[n.id]);
 await job.runNotificationJob(delivery);assert.equal(calls.length,1);assert.deepEqual(calls[0],first,'identical envelope + key on reclaim');assert.equal((await intents(f.r))[0].status,'sent');});

test('transient failures retry with exponential backoff, then become terminal failed',async()=>{await drain();const f=await register('waitlisted');mode='transient';
 assert.deepEqual([1,2,3].map(policy.retryDelaySeconds),[60,240,960]);
 let r=await job.runNotificationJob(delivery);assert.equal(r.retryScheduled,1);let n=(await intents(f.r))[0];assert.equal(n.status,'failed');assert.equal(n.retryable,true);
 const gap=(new Date(n.next_attempt_at)-new Date(n.failed_at))/1000;assert.ok(gap>=59&&gap<=61,String(gap));
 assert.equal((await job.runNotificationJob(delivery)).claimed,0,'not retried before next_attempt_at');
 await due();await job.runNotificationJob(delivery);n=(await intents(f.r))[0];const gap2=(new Date(n.next_attempt_at)-new Date(n.failed_at))/1000;assert.ok(gap2>=239&&gap2<=241,String(gap2));assert.equal(n.attempt_count,2);
 await due();r=await job.runNotificationJob(delivery);n=(await intents(f.r))[0];assert.equal(r.failed,1);assert.equal(n.attempt_count,3);assert.equal(n.status,'failed');assert.equal(n.retryable,false);assert.equal(n.next_attempt_at,null);
 assert.equal((await query("SELECT count(*)::int n FROM uss.audit_logs WHERE entity_id=$1 AND action='notification.failed'",[n.id]))[0].n,1);
 await query("UPDATE uss.notification_deliveries SET next_attempt_at=now() WHERE id=$1",[n.id]);const sends=calls.length;await job.runNotificationJob(delivery);assert.equal(calls.length,sends,'terminal stays terminal');mode='ok';
 const retried=(await query("SELECT * FROM uss.audit_logs WHERE entity_id=$1 AND action='notification.retry_requested' ORDER BY created_at",[n.id]));assert.equal(retried.length,2);assert.ok(!JSON.stringify(retried).includes(f.a.email));});

test('permanent rejection and thrown provider errors are sanitized',async()=>{await drain();const p=await register('waitlisted');mode='permanent';await job.runNotificationJob(delivery);let n=(await intents(p.r))[0];assert.equal(n.status,'failed');assert.equal(n.retryable,false);
 const t=await register('waitlisted');mode='throw';await job.runNotificationJob(delivery);n=(await intents(t.r))[0];assert.equal(n.last_error_code,'EMAIL_DELIVERY_FAILED');assert.ok(!JSON.stringify(n).includes('RAW SECRET'));assert.equal(n.retryable,true);mode='ok';});

test('suspended recipient intent is superseded without a provider call',async()=>{await drain();const f=await register('waitlisted');await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[f.a.id]);await job.runNotificationJob(delivery);assert.equal(calls.length,0);const n=(await intents(f.r))[0];assert.ok(n.cancelled_at);assert.equal(n.last_error_code,'NOTIFICATION_SUPERSEDED');});

test('changed envelope on retry is terminal and visible instead of replaying different content',async()=>{await drain();const f=await register('waitlisted');mode='transient';await job.runNotificationJob(delivery);mode='ok';await due();const before=calls.length;await job.runNotificationJob({...delivery,baseUrl:'https://other.example.test'});assert.equal(calls.length,before);const n=(await intents(f.r))[0];assert.equal(n.status,'failed');assert.equal(n.retryable,false);assert.equal(n.last_error_code,'NOTIFICATION_ENVELOPE_CHANGED');});

test('batch is bounded and time budget defers remaining work',async()=>{await drain();for(let i=0;i<policy.NOTIFICATION_JOB_POLICY.batchSize+3;i++)await register('waitlisted');const r=await job.runNotificationJob(delivery);assert.equal(r.scanned,policy.NOTIFICATION_JOB_POLICY.batchSize);
 let t=0;const r2=await job.runNotificationJob(delivery,()=>(t+=policy.NOTIFICATION_JOB_POLICY.timeBudgetMs+1));assert.equal(r2.sent,0);assert.equal(r2.deferred,r2.scanned);await job.runNotificationJob(delivery);});

test('SQL job claim rejects invalid parameters and is not executable by PUBLIC',async()=>{for(const args of [['bad','fake',300,3],['a'.repeat(64),'BAD PROVIDER',300,3],['a'.repeat(64),'fake',5,3],['a'.repeat(64),'fake',300,9]])await assert.rejects(query('SELECT * FROM uss.claim_notification_for_job($1,$2,$3,$4,$5)',[randomUUID(),...args]));
 const acl=(await query("SELECT proacl::text acl FROM pg_proc WHERE proname IN ('claim_notification_for_job','issue_event_pass_for_job')")).map(r=>r.acl??'');for(const a of acl)assert.ok(!/(^|[{,])=X/.test(a),a);});

test('vercel.json schedules the authenticated job every 5 minutes',()=>{const v=JSON.parse(readFileSync('vercel.json','utf8'));assert.deepEqual(v.crons,[{path:'/api/jobs/notifications',schedule:'*/5 * * * *'}]);});

test('template pass link carries only trusted ids and stays HTML-escaped',async()=>{const f=await register('confirmed');const n=(await intents(f.r))[0];const v=templates.renderNotification(n.notification_type,n.payload,delivery.baseUrl,1,{eventId:f.e.id,passReady:true});assert.match(v.html,/Open Event Pass/);assert.throws(()=>templates.renderNotification(n.notification_type,n.payload,delivery.baseUrl,1,{eventId:'../../admin',passReady:true}));const w=templates.renderNotification('registration_waitlisted',{...n.payload,registrationStatus:'waitlisted'},delivery.baseUrl,1,{passReady:true});assert.doesNotMatch(w.text,/Event Pass/);await drain();});
