// D2.5 participants per event: list + status filter, staff cancellation with audited reason, bounded audited CSV export.
import {completeMemberFixture} from './member-identity-fixtures.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {migrate,loadMigrations} from '../scripts/database/migrations.mjs';
const require=createRequire(import.meta.url),ts=require('typescript'),pg=new PGlite({extensions:{citext,pgcrypto}});
let current=null;
const query=async(text,params=[])=>(await pg.query(text,params)).rows;
const sql={query:(text,params=[])=>({text,params}),transaction:(statements,opts)=>{assert.equal(opts.isolationLevel,'ReadCommitted');return pg.transaction(async tx=>{const out=[];for(const q of statements)out.push((await tx.query(q.text,q.params)).rows);return out;});}};
const modules=new Map();function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
before(async()=>{await migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));admin=await account('admin');});after(async()=>pg.close());
const api=load('lib/registrations/registration-actions.ts'),csv=load('lib/registrations/participant-csv.ts');
const account=async(role='member',status='active')=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() END) RETURNING *",[randomUUID(),randomUUID()+'@example.test',status]))[0];await query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2',[a.id,role]);if(status==='active')await completeMemberFixture(query,a.id);return{id:a.id,email:a.email,status:a.status,emailVerifiedAt:a.email_verified_at};};
const event=async()=>(await query("INSERT INTO uss.events(slug,title,starts_at,ends_at,status) VALUES($1,'Ops Run',now()+interval '2 days',now()+interval '3 days','registration_open') RETURNING *",[randomUUID()]))[0];
const register=async(e,status='confirmed',name=null)=>{const a=await account();if(name)await query('UPDATE uss.member_profiles SET full_name=$2 WHERE account_id=$1',[a.id,name]);const r=(await query('INSERT INTO uss.event_registrations(event_id,account_id,status) VALUES($1,$2,$3) RETURNING *',[e.id,a.id,status]))[0];return{a,r};};
const good=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
let admin;

test('participants list is permission-checked, status-filtered and exposes staff identity only',async()=>{current=admin;const e=await event();const c=await register(e,'confirmed','Ada Runner'),w=await register(e,'waitlisted');
 const page=good(await api.getEventParticipants({eventId:e.id}));assert.equal(page.items.length,2);const row=page.items.find(i=>i.id===c.r.id);
 assert.equal(row.participant.displayName,'Ada Runner');assert.match(row.participant.memberId,/^USS-\d{6,}$/);assert.notEqual(row.participant.email,c.a.email);assert.match(row.participant.email,/^.•••@.•••\.test$/);
 const json=JSON.stringify(page);for(const secret of ['barcode','token_hash','phone','emergency'])assert.ok(!json.includes(secret),secret);
 assert.deepEqual(good(await api.getEventParticipants({eventId:e.id,status:'waitlisted'})).items.map(i=>i.id),[w.r.id]);
 for(const bad of [{},{eventId:'x'},{eventId:e.id,status:'gone'},{eventId:e.id,limit:999},{eventId:e.id,accountId:c.a.id}])assert.equal((await api.getEventParticipants(bad)).code,'REGISTRATION_VALIDATION_ERROR');
 current=c.a;assert.equal((await api.getEventParticipants({eventId:e.id})).code,'INSUFFICIENT_PERMISSION');
 current=null;assert.equal((await api.getEventParticipants({eventId:e.id})).code,'UNAUTHENTICATED');
 current=await account('admin','suspended');assert.equal((await api.getEventParticipants({eventId:e.id})).code,'ACCOUNT_SUSPENDED');});

test('staff cancellation requires a reason, records it only in the audit log and queues the cancellation email',async()=>{current=admin;const e=await event(),{a,r}=await register(e);const row=good(await api.getEventParticipants({eventId:e.id})).items[0];
 for(const reason of [undefined,'','  ab ','<script>x</script>','x'.repeat(241)])assert.equal((await api.cancelEventParticipant({eventId:e.id,registrationId:r.id,expectedVersion:row.version,...(reason===undefined?{}:{reason})})).code,'REGISTRATION_VALIDATION_ERROR');
 assert.equal((await query('SELECT status FROM uss.event_registrations WHERE id=$1',[r.id]))[0].status,'confirmed');
 const done=good(await api.cancelEventParticipant({eventId:e.id,registrationId:r.id,expectedVersion:row.version,reason:'Duplicate   entry for runner'}));assert.equal(done.status,'cancelled');
 const audit=(await query("SELECT * FROM uss.audit_logs WHERE entity_id=$1 AND action='registration.cancelled'",[r.id]))[0];assert.equal(audit.actor_account_id,admin.id);assert.equal(audit.change_summary.reason,'Duplicate entry for runner');assert.equal(audit.change_summary.initiator,'admin');
 assert.equal((await query("SELECT count(*)::int n FROM uss.notification_deliveries WHERE registration_id=$1 AND notification_type='registration_cancelled'",[r.id]))[0].n,1);
});

test('member cannot cancel others via the staff action; stale version conflicts; checked-in not cancellable',async()=>{current=admin;const e=await event(),x=await register(e),y=await register(e);const rows=good(await api.getEventParticipants({eventId:e.id})).items,rx=rows.find(i=>i.id===x.r.id),ry=rows.find(i=>i.id===y.r.id);
 current=x.a;assert.equal((await api.cancelEventParticipant({eventId:e.id,registrationId:y.r.id,expectedVersion:ry.version,reason:'Not allowed here'})).code,'INSUFFICIENT_PERMISSION');
 current=admin;await query("UPDATE uss.event_registrations SET admin_note='touched',updated_at=now()+interval '1 second' WHERE id=$1",[y.r.id]);assert.equal((await api.cancelEventParticipant({eventId:e.id,registrationId:y.r.id,expectedVersion:ry.version,reason:'Stale version'})).code,'REGISTRATION_CONFLICT');
 await query('INSERT INTO uss.check_ins(registration_id,event_id) VALUES($1,$2)',[x.r.id,e.id]);assert.equal((await api.cancelEventParticipant({eventId:e.id,registrationId:x.r.id,expectedVersion:rx.version,reason:'Already here'})).code,'REGISTRATION_NOT_CANCELLABLE');
 assert.equal(good(await api.cancelEventRegistration({eventId:e.id,registrationId:y.r.id,expectedVersion:good(await api.getEventRegistration({eventId:e.id,registrationId:y.r.id})).version})).status,'cancelled','generic action stays backward compatible without reason');});

test('CSV cells neutralize formula injection and quote safely',()=>{for(const [v,out] of [['=1+1','"\'=1+1"'],['+cmd','"\'+cmd"'],['-2','"\'-2"'],['@SUM(A1)','"\'@SUM(A1)"'],['\tTAB','"\'\tTAB"'],['a"b','"a""b"'],['plain','"plain"'],[null,'""']])assert.equal(csv.csvCell(v),out,String(v));
 assert.equal(csv.csvDocument(['a'],[['=x']]),'﻿"a"\r\n"\'=x"\r\n');});

test('CSV export is permission-checked, audited, filtered and safe against hostile names',async()=>{current=admin;const e=await event();await register(e,'confirmed','=HYPERLINK("http://evil","x")');await register(e,'waitlisted','@Mallory');await register(e,'confirmed','Plain Runner');
 const out=good(await api.exportEventParticipantsCsv({eventId:e.id}));assert.equal(out.rowCount,3);assert.equal(out.truncated,false);
 const lines=out.csv.replace(/^﻿/,'').trim().split('\r\n');assert.equal(lines[0],'"member_id","name","email","registration_status","registered_at_utc","cancelled_at_utc","checked_in_at_utc","event_pass_status"');
 assert.ok(out.csv.includes('"\'=HYPERLINK(""http://evil"",""x"")"'));assert.ok(out.csv.includes('"\'@Mallory"'));for(const line of lines.slice(1))assert.ok(!/(^|,)"[=+\-@]/.test(line),line);
 const audit=(await query("SELECT * FROM uss.audit_logs WHERE entity_id=$1 AND action='event.participants_exported' ORDER BY created_at DESC",[e.id]))[0];assert.equal(audit.actor_account_id,admin.id);assert.equal(audit.change_summary.rowCount,3);assert.ok(!JSON.stringify(audit).includes('@example.test'));
 assert.equal(good(await api.exportEventParticipantsCsv({eventId:e.id,status:'waitlisted'})).rowCount,1);
 const before=(await query("SELECT count(*)::int n FROM uss.audit_logs WHERE action='event.participants_exported'"))[0].n;
 const m=await account();current=m;assert.equal((await api.exportEventParticipantsCsv({eventId:e.id})).code,'INSUFFICIENT_PERMISSION');current=null;assert.equal((await api.exportEventParticipantsCsv({eventId:e.id})).code,'UNAUTHENTICATED');
 current=admin;assert.equal((await api.exportEventParticipantsCsv({eventId:randomUUID()})).code,'REGISTRATION_NOT_AVAILABLE');for(const bad of [{eventId:e.id,status:'x'},{eventId:e.id,limit:100000},{}])assert.equal((await api.exportEventParticipantsCsv(bad)).code,'REGISTRATION_VALIDATION_ERROR');
 assert.equal((await query("SELECT count(*)::int n FROM uss.audit_logs WHERE action='event.participants_exported'"))[0].n,before,'denied/invalid exports write no audit');});

test('CSV export is bounded and reports truncation',async()=>{current=admin;const e=await event();const policy=load('lib/registrations/registration-policy.ts').REGISTRATION_POLICY;assert.equal(policy.maxExportRows,5000);
 const src=readFileSync('lib/registrations/registration-repository.ts','utf8');assert.match(src,/ORDER BY r\.registered_at,r\.id LIMIT \$6/);
 // Exercise truncation with a small slice of accounts: the repository reads limit+1 to detect overflow.
 const repo=load('lib/registrations/registration-repository.ts');for(let i=0;i<3;i++)await register(e);const row=await repo.exportParticipants(admin.id,e.id,null,2+1);assert.equal(row.items.length,3);
 const svcRows=await repo.exportParticipants(admin.id,e.id,null,2);assert.equal(svcRows.items.length,3,'limit+1 read');const audit=(await query("SELECT change_summary FROM uss.audit_logs WHERE entity_id=$1 AND action='event.participants_exported' ORDER BY created_at DESC LIMIT 1",[e.id]))[0];assert.equal(audit.change_summary.truncated,true);assert.equal(audit.change_summary.rowCount,2);});

test('K-03: participant emails are masked for admin and full only for super_admin, in list and CSV',async()=>{const e=await event();const {a}=await register(e,'confirmed','Grace Runner');const sa=await account('super_admin');
 current=admin;const masked=good(await api.getEventParticipants({eventId:e.id})).items[0].participant.email;assert.ok(!masked.includes(a.email.split('@')[0]));assert.match(masked,/•••/);
 const adminCsv=good(await api.exportEventParticipantsCsv({eventId:e.id})).csv;assert.ok(!adminCsv.includes(a.email));
 current=sa;assert.equal(good(await api.getEventParticipants({eventId:e.id})).items[0].participant.email,a.email);assert.ok(good(await api.exportEventParticipantsCsv({eventId:e.id})).csv.includes(a.email));current=null;});
