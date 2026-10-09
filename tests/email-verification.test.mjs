import test, {before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {loadMigrations,migrate} from '../scripts/database/migrations.mjs';
const require=createRequire(import.meta.url), ts=require('typescript');
const pg=new PGlite({extensions:{citext,pgcrypto}});
const query=async(text,params=[]) => (await pg.query(text,params)).rows;
let session=null, sent=[], providerMode='success', failDb=false, failOutcome=false;
const modules=new Map();
function load(file){
 file=resolve(file);if(modules.has(file))return modules.get(file).exports;
 const module={exports:{}};modules.set(file,module);
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=specifier=>{
  if(specifier==='server-only')return {};
  if(specifier==='@/lib/db')return {query:async(...args)=>{if(failDb || (failOutcome && args[0].includes("SET status='sent'")))throw Error('secret DB');return query(...args);}};
  if(specifier==='./account-provisioning')return {getCurrentAccount:async()=>session};
  if(specifier==='resend')return {Resend:class {emails={send:async(message,options)=>{
   sent.push({message,options});if(providerMode==='throw')throw Error('raw token secret');
   if(providerMode==='timeout')return new Promise(()=>{});
   if(providerMode==='fail')return {data:null,error:{message:message.text+' API secret'}};
   return {data:{id:crypto.randomUUID()},error:null};
  }};}};
  if(specifier.startsWith('@/'))return load(resolve(specifier.slice(2)+'.ts'));
  if(specifier.startsWith('.'))return load(resolve(dirname(file),specifier+'.ts'));
  return require(specifier);
 };
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,module,module.exports);return module.exports;
}
const service=load('lib/auth/email-verification.ts'), actions=load('lib/auth/verification-actions.ts'), proofs=load('lib/email/proof.ts'), config=load('lib/email/config.ts'), route=load('app/api/account/verify-email/route.ts');
const account=async(status='pending_verification')=>(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() ELSE NULL END) RETURNING *",[crypto.randomUUID(),crypto.randomUUID()+'@example.com',status]))[0];
const issue=async(a)=>service.issueEmailVerification(a.id);
const tokenFromLast=()=>new URLSearchParams(new URL(sent.at(-1).message.text.match(/Verify email: (.+)/)[1]).hash.slice(1)).get('token');
const row=async(table,id)=>(await query('SELECT * FROM uss.'+table+' WHERE '+(table==='accounts'?'id':'account_id')+'=$1 ORDER BY '+(table==='notification_deliveries'?'queued_at':'created_at')+' DESC LIMIT 1',[id]))[0];
const fixture=async(a,{expired=false,consumed=false,invalid=false,emailHash=true}={})=>{
 const token=proofs.createVerificationProof();
 await query(`INSERT INTO uss.email_verification_tokens(account_id,token_hash,email_hash,created_at,expires_at,consumed_at,invalidated_at)
 VALUES($1,$2,CASE WHEN $3 THEN encode(sha256(convert_to(lower($4),'UTF8')),'hex') ELSE NULL END,now()-interval '2 hours',CASE WHEN $5 THEN now()-interval '1 hour' ELSE now()+interval '1 hour' END,CASE WHEN $6 THEN now() ELSE NULL END,CASE WHEN $7 THEN now() ELSE NULL END)`,[a.id,proofs.hashVerificationProof(token),emailHash,a.email,expired,consumed,invalid]);return token;
};
before(async()=>{
 Object.assign(process.env,{RESEND_API_KEY:'fake-key',EMAIL_FROM_ADDRESS:'no-reply@example.com',APP_BASE_URL:'https://uss.example.com',EMAIL_PROVIDER_TIMEOUT_MS:'100',EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS:'1'});
 await migrate({query,transaction:statements=>pg.transaction(async tx=>{for(const s of statements)await tx.query(s.text,s.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));
});
after(async()=>{await pg.close();});
test('pending issuance stores only SHA256, bound email, configured expiry and code-owned delivery',async()=>{
 const a=await account();assert.deepEqual(await issue(a),{ok:true,code:'VERIFICATION_ISSUED'});
 const token=tokenFromLast();assert.match(token,/^[A-Za-z0-9_-]{43}$/);
 const proof=await row('email_verification_tokens',a.id), delivery=await row('notification_deliveries',a.id);
 assert.equal(proof.token_hash,proofs.hashVerificationProof(token));assert.equal(new Date(proof.expires_at)-new Date(proof.created_at),1800000);
 assert.equal(delivery.status,'sent');assert.equal(delivery.attempt_count,1);assert.equal(delivery.provider,'resend');assert.equal(delivery.template_id,null);
 assert.equal(sent.at(-1).options.idempotencyKey,delivery.idempotency_key);
 const stored=JSON.stringify(await query('SELECT * FROM uss.audit_logs WHERE actor_account_id=$1',[a.id]))+JSON.stringify(proof)+JSON.stringify(delivery);
 assert.ok(!stored.includes(token));assert.ok(!stored.includes('fake-key'));assert.ok(!JSON.stringify(await query('SELECT * FROM uss.audit_logs WHERE actor_account_id=$1',[a.id])).includes(a.email));
 assert.match(sent.at(-1).message.html,/Verify email/);assert.equal((await row('accounts',a.id)).status,'pending_verification');
});
test('active is safe; suspended/deactivated never issue',async()=>{
 for(const [status,code] of [['active','ACCOUNT_ALREADY_ACTIVE'],['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){
 const a=await account(status);assert.equal((await issue(a)).code,code);assert.equal(await row('email_verification_tokens',a.id),undefined);
 }
});
test('valid proof consumes once and activates with timestamp and append-only audit',async()=>{
 const a=await account();await issue(a);const token=tokenFromLast();
 assert.deepEqual(await service.verifyEmailProof(token),{ok:true,code:'VERIFICATION_SUCCESS'});
 const activated=await row('accounts',a.id);assert.equal(activated.status,'active');assert.ok(activated.email_verified_at);
 assert.equal((await service.verifyEmailProof(token)).code,'VERIFICATION_ALREADY_USED');
 assert.deepEqual((await row('accounts',a.id)).email_verified_at,activated.email_verified_at);
 const audit=await query('SELECT action FROM uss.audit_logs WHERE actor_account_id=$1',[a.id]);assert.ok(audit.some(r=>r.action==='account.activated'));
});
test('expired, malformed, unknown, consumed, revoked and pre-binding proofs rejected',async()=>{
 for(const [flags,code] of [[{expired:true},'VERIFICATION_EXPIRED'],[{consumed:true},'VERIFICATION_ALREADY_USED'],[{invalid:true},'VERIFICATION_INVALID'],[{emailHash:false},'VERIFICATION_INVALID']]){
 const a=await account();assert.equal((await service.verifyEmailProof(await fixture(a,flags))).code,code);assert.equal((await row('accounts',a.id)).status,'pending_verification');}
 for(const token of [null,'',[],"';drop table",proofs.createVerificationProof()])assert.equal((await service.verifyEmailProof(token)).code,'VERIFICATION_INVALID');
});
test('suspended/deactivated and changed-email accounts cannot activate',async()=>{
 for(const status of ['suspended','deactivated']){const a=await account(status);const token=await fixture(a);assert.equal((await service.verifyEmailProof(token)).code,'ACCOUNT_'+status.toUpperCase());assert.equal((await row('accounts',a.id)).status,status);}
 const a=await account();const token=await fixture(a);await query('UPDATE uss.accounts SET email=$2 WHERE id=$1',[a.id,'changed-'+a.email]);assert.equal((await service.verifyEmailProof(token)).code,'VERIFICATION_INVALID');
});
test('already active valid proof consumes safely without replacing verification timestamp',async()=>{
 const a=await account('active'),token=await fixture(a);assert.equal((await service.verifyEmailProof(token)).code,'ACCOUNT_ALREADY_ACTIVE');assert.deepEqual((await row('accounts',a.id)).email_verified_at,a.email_verified_at);
});
test('cooldown and concurrent resend only issue one proof; allowed resend supersedes old proof',async()=>{
 const a=await account();const results=await Promise.all([issue(a),issue(a)]);assert.deepEqual(results.map(r=>r.code).sort(),['VERIFICATION_ISSUED','VERIFICATION_RESEND_COOLDOWN'].sort());
 const old=tokenFromLast();assert.ok((await issue(a)).retryAfterSeconds>=1);
 await new Promise(resolve=>setTimeout(resolve,1100));assert.equal((await issue(a)).code,'VERIFICATION_ISSUED');const replacement=tokenFromLast();
 assert.equal((await service.verifyEmailProof(old)).code,'VERIFICATION_INVALID');assert.equal((await service.verifyEmailProof(replacement)).code,'VERIFICATION_SUCCESS');
 assert.equal((await query("SELECT count(*)::int AS n FROM uss.email_verification_tokens WHERE account_id=$1 AND consumed_at IS NULL AND invalidated_at IS NULL",[a.id]))[0].n,0);
});
test('DB-backed rolling limit counts revoked proofs and survives new app calls',async()=>{
 const a=await account();for(let i=0;i<5;i++)await query("INSERT INTO uss.email_verification_tokens(account_id,token_hash,email_hash,created_at,expires_at,invalidated_at) VALUES($1,$2,$3,now()-interval '2 minutes',now()+interval '28 minutes',now()-interval '1 minute')",[a.id,proofs.hashVerificationProof(proofs.createVerificationProof()),'a'.repeat(64)]);
 assert.equal((await issue(a)).code,'VERIFICATION_RATE_LIMITED');
});
test('parallel same-token consumption yields exactly one activation',async()=>{
 const a=await account(),token=await fixture(a);const results=await Promise.all([service.verifyEmailProof(token),service.verifyEmailProof(token)]);
 assert.deepEqual(results.map(r=>r.code).sort(),['VERIFICATION_SUCCESS','VERIFICATION_ALREADY_USED'].sort());
 assert.equal((await query("SELECT count(*)::int AS n FROM uss.audit_logs WHERE actor_account_id=$1 AND action='account.activated'",[a.id]))[0].n,1);
});
test('verify/resend race and status-change interleavings preserve lifecycle',async()=>{
 const a=await account(),old=await fixture(a);const [verify,resend]=await Promise.all([service.verifyEmailProof(old),issue(a)]);assert.equal(verify.code,'VERIFICATION_SUCCESS');assert.equal(resend.code,'ACCOUNT_ALREADY_ACTIVE');
 const b=await account(),stale=await fixture(b);assert.equal((await issue(b)).code,'VERIFICATION_ISSUED');assert.equal((await service.verifyEmailProof(stale)).code,'VERIFICATION_INVALID');
 const latest=tokenFromLast();await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[b.id]);assert.equal((await service.verifyEmailProof(latest)).code,'ACCOUNT_SUSPENDED');
});
test('outstanding uniqueness and immutable email binding remain database-enforced',async()=>{
 const a=await account();await fixture(a);await assert.rejects(fixture(a),e=>e.code==='23505');
 await assert.rejects(query("UPDATE uss.email_verification_tokens SET email_hash=$2 WHERE account_id=$1",[a.id,'b'.repeat(64)]),e=>e.code==='23514');
});
test('activation rolls back proof/account/audit on a mandatory audit-write failure',async()=>{
 const a=await account(),token=await fixture(a);
 await pg.exec("CREATE FUNCTION uss.test_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='account.activated' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_audit_failure BEFORE INSERT ON uss.audit_logs FOR EACH ROW EXECUTE FUNCTION uss.test_audit_failure()");
 try{assert.equal((await service.verifyEmailProof(token)).code,'VERIFICATION_UNAVAILABLE');assert.equal((await row('accounts',a.id)).status,'pending_verification');assert.equal((await row('email_verification_tokens',a.id)).consumed_at,null);}
 finally{await pg.exec('DROP TRIGGER test_audit_failure ON uss.audit_logs; DROP FUNCTION uss.test_audit_failure()');}
 assert.equal((await service.verifyEmailProof(token)).code,'VERIFICATION_SUCCESS');
});
test('provider failure/throw/timeout sanitized; proof remains valid, pending account intact',async()=>{
 for(const mode of ['fail','throw','timeout']){providerMode=mode;const a=await account();assert.equal((await issue(a)).code,'EMAIL_DELIVERY_FAILED');
 const d=await row('notification_deliveries',a.id);assert.equal(d.status,'failed');assert.equal(d.attempt_count,1);assert.equal(d.last_error_summary,'Transactional email delivery did not complete.');assert.ok(!JSON.stringify(d).includes('secret'));assert.equal((await row('accounts',a.id)).status,'pending_verification');}
 providerMode='success';
});
test('input-free own account request ignores role/account/email; anonymous never looks up email',async()=>{
 session=null;assert.deepEqual(await actions.requestOwnEmailVerification({email:'exists@example.com',accountId:'fake'}),{ok:false,code:'UNAUTHENTICATED'});
 const a=await account();session={id:a.id};assert.equal((await actions.requestOwnEmailVerification({accountId:'spoof',role:'super_admin'})).code,'VERIFICATION_ISSUED');session=null;
});
test('trusted URL, missing config and database errors fail safely without startup failure',async()=>{
 const original=process.env.APP_BASE_URL;
 for(const base of ['https://user:secret@example.com','https://example.com/?returnTo=evil','https://example.com/path','http://evil.example.com']){process.env.APP_BASE_URL=base;assert.throws(config.getEmailConfig,e=>e.message==='EMAIL_NOT_CONFIGURED');}
 delete process.env.APP_BASE_URL;assert.equal((await issue(await account())).code,'EMAIL_NOT_CONFIGURED');process.env.APP_BASE_URL=original;
 const key=process.env.RESEND_API_KEY;delete process.env.RESEND_API_KEY;assert.throws(config.getEmailConfig);process.env.RESEND_API_KEY=key;
 const sender=process.env.EMAIL_FROM_ADDRESS;delete process.env.EMAIL_FROM_ADDRESS;assert.throws(config.getEmailConfig);process.env.EMAIL_FROM_ADDRESS=sender;
 failDb=true;assert.equal((await service.verifyEmailProof(proofs.createVerificationProof())).code,'VERIFICATION_UNAVAILABLE');failDb=false;
});
test('GET never consumes; fragment confirmation clears URL, restrictive CSP and explicit POST',async()=>{
 const response=await route.GET();assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/default-src 'none'/);
 const body=await response.text();assert.match(body,/history.replaceState/);assert.match(body,/method="post"/);assert.doesNotMatch(body,/fetch\(/);
 const a=await account(),token=await fixture(a);
 const result=await route.POST(new Request('https://uss.example.com/api/account/verify-email',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})}));assert.equal(result.status,200);assert.equal((await result.json()).code,'VERIFICATION_SUCCESS');
 for(const body of [JSON.stringify({token,returnTo:'https://evil.example.com'}),'x'.repeat(2049)]){const r=await route.POST(new Request('https://uss.example.com/api/account/verify-email',{method:'POST',headers:{'content-type':'application/json'},body}));assert.equal(r.status,400);}
 const b=await account(),formToken=await fixture(b);const r=await route.POST(new Request('https://uss.example.com/api/account/verify-email',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:formToken})}));assert.equal((await r.json()).code,'VERIFICATION_SUCCESS');
});

test('issuance failure rolls back new proof, supersession, delivery and rate history',async()=>{
 const a=await account(),old=await fixture(a);
 await pg.exec("CREATE FUNCTION uss.test_issue_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='account.verification_issued' THEN RAISE EXCEPTION 'forced'; END IF; RETURN NEW; END $$; CREATE TRIGGER test_issue_failure BEFORE INSERT ON uss.audit_logs FOR EACH ROW EXECUTE FUNCTION uss.test_issue_failure()");
 try{assert.equal((await issue(a)).code,'VERIFICATION_UNAVAILABLE');assert.equal((await row('email_verification_tokens',a.id)).invalidated_at,null);assert.equal(await row('notification_deliveries',a.id),undefined);}
 finally{await pg.exec('DROP TRIGGER test_issue_failure ON uss.audit_logs; DROP FUNCTION uss.test_issue_failure()');}
 assert.equal((await service.verifyEmailProof(old)).code,'VERIFICATION_SUCCESS');
});
test('delivery claim is idempotent and provider acceptance with DB failure is controlled',async()=>{
 const emailService=load('lib/email/service.ts');const a=await account();
 const d=(await query("INSERT INTO uss.notification_deliveries(notification_type,account_id,recipient,idempotency_key) VALUES('test',$1,$2,$3) RETURNING id",[a.id,a.email,crypto.randomUUID()]))[0];let calls=0;
 const provider={name:'fake',send:async()=>{calls++;return {ok:true,messageId:crypto.randomUUID()};}};
 const args=[d.id,a.email,{subject:'Test',html:'Test',text:'Test'},'USS <no-reply@example.com>',provider];
 const results=await Promise.all([emailService.sendTransactionalEmail(...args),emailService.sendTransactionalEmail(...args)]);assert.equal(calls,1);assert.equal(results.filter(r=>r.ok).length,1);
 failOutcome=true;const b=await account();assert.equal((await issue(b)).code,'EMAIL_DELIVERY_UNCERTAIN');failOutcome=false;
 assert.equal((await row('notification_deliveries',b.id)).status,'sending');assert.equal((await row('accounts',b.id)).status,'pending_verification');assert.equal((await service.verifyEmailProof(tokenFromLast())).code,'VERIFICATION_SUCCESS');
});
test('actual pinned Resend SDK does not log provider responses with embedded secrets',async()=>{
 const {Resend}=require('resend');const originalFetch=globalThis.fetch,originalError=console.error;let logs=0;
 globalThis.fetch=async()=>new Response(JSON.stringify({name:'validation_error',message:'sensitive verification link',statusCode:422}),{status:422,headers:{'content-type':'application/json'}});
 console.error=()=>{logs++;};
 try{const result=await new Resend('fake-key').emails.send({from:'no-reply@example.com',to:'test@example.com',subject:'Test',html:'Test'});assert.ok(result.error);assert.equal(logs,0);}
 finally{globalThis.fetch=originalFetch;console.error=originalError;}
});
