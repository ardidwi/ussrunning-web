import {completeMemberFixture} from './member-identity-fixtures.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {migrate,loadMigrations} from '../scripts/database/migrations.mjs';
const require=createRequire(import.meta.url),ts=require('typescript');
const pg=new PGlite({extensions:{citext,pgcrypto}});
const query=async(text,params=[]) => (await pg.query(text,params)).rows;
let current=null,failDb=false,statusRace=null;
const sql={query:(text,params=[])=>({text,params}),transaction:async(statements,options)=>{
 assert.equal(options.isolationLevel,'ReadCommitted');
 return pg.transaction(async tx=>{const results=[];for(let i=0;i<statements.length;i++){
 if(i===2&&statusRace){await tx.query('UPDATE uss.accounts SET status=$2 WHERE id=$1',[current.id,statusRace]);statusRace=null;}
 results.push((await tx.query(statements[i].text,statements[i].params)).rows);
 }return results;});
}};
const modules=new Map();
function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const module={exports:{}};modules.set(file,module);
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=specifier=>{
  if(specifier==='server-only')return {};
  if(specifier==='@/lib/db')return {query:async(...args)=>{if(failDb)throw Error('secret DB and PII');return query(...args);},getSql:()=>{if(failDb)throw Error('secret DB and PII');return sql;}};
  if(specifier==='./account-provisioning')return {getCurrentAccount:async()=>current};
  if(specifier.startsWith('@/'))return load(resolve(specifier.slice(2)+'.ts'));
  if(specifier.startsWith('.'))return load(resolve(dirname(file),specifier+'.ts'));
  return require(specifier);
 };
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,module,module.exports);return module.exports;
}
const actions=load('lib/member/profile-actions.ts');
const validation=load('lib/member/profile-validation.ts');
const use=async(a)=>{current={id:a.id,email:a.email,memberId:a.member_id,barcodeValue:a.barcode_value,status:a.status,emailVerifiedAt:a.email_verified_at,displayName:a.display_name};};
const create=async(status='active',withProfile=true)=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() ELSE NULL END) RETURNING *",[crypto.randomUUID(),crypto.randomUUID()+'@example.com',status]))[0];if(withProfile)await query('INSERT INTO uss.member_profiles(account_id) VALUES($1)',[a.id]);await use(a);return a;};
const read=async()=>{const result=await actions.getOwnMemberProfile();assert.equal(result.ok,true);return result.data;};
const update=async(changes,version)=>actions.updateOwnMemberProfile({expectedVersion:version||(await read()).profile.version,changes});
const stored=async(id)=>(await query('SELECT * FROM uss.member_profiles WHERE account_id=$1',[id]))[0];
const audit=async(id)=>query("SELECT action,change_summary FROM uss.audit_logs WHERE actor_account_id=$1 ORDER BY created_at",[id]);
before(async()=>{await migrate({query,transaction:statements=>pg.transaction(async tx=>{for(const s of statements)await tx.query(s.text,s.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));});
after(async()=>pg.close());
test('active owner reads minimal safe DTO and centrally defined completion',async()=>{
 const a=await create();const data=await read();assert.equal(data.account.id,a.id);assert.equal(data.account.emailVerified,true);assert.equal(data.profile.fullName,null);assert.equal(data.completion.percentage,0);assert.deepEqual(data.completion.missingFields,['fullName','phone','emergencyContact','avatar']);
 assert.match(data.profile.version,/^[0-9a-f]{64}$/);assert.equal(data.account.barcodeValue,undefined);assert.equal(data.account.auth_provider_user_id,undefined);assert.equal(data.profile.created_at,undefined);assert.deepEqual(data.profile.runningPreferences,{});
 await query("UPDATE uss.member_profiles SET full_name='Bootstrap Name' WHERE account_id=$1",[a.id]);assert.equal((await read()).completion.percentage,25);
});
test('unauthenticated/pending/suspended/deactivated cannot read, mutate or get barcode',async()=>{
 for(const [status,code] of [[null,'UNAUTHENTICATED'],['pending_verification','EMAIL_NOT_VERIFIED'],['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){
 if(status)await create(status);else current=null;
 for(const result of [await actions.getOwnMemberProfile(),await actions.getOwnMemberCard(),await actions.updateOwnMemberProfile({})])assert.deepEqual(result,{ok:false,code});
 }
});
test('allowed PATCH normalizes fields, completion and minimal atomic audit',async()=>{
 const a=await create();const beforeAccount=(await query('SELECT * FROM uss.accounts WHERE id=$1',[a.id]))[0];
 const result=await update({fullName:'  Runner   One  ',phone:'+44 (7700) 900-123',birthDate:'1990-05-21',gender:'prefer_not_to_say',city:' London ',emergencyContactName:'  Contact ',emergencyContactPhone:'+1 (202) 555-0100',instagramHandle:'@Runner.One',jerseySize:'xl',runningPreferences:{distancesKm:[5,10,5],days:['mon','wed'],goals:['Stay consistent']},marketingConsent:true,privacyConsent:true});
 assert.equal(result.ok,true);const p=result.data.profile;assert.equal(p.fullName,'Runner One');assert.equal(p.phone,'+447700900123');assert.equal(p.instagramHandle,'runner.one');assert.equal(p.jerseySize,'XL');assert.deepEqual(p.runningPreferences.distancesKm,[5,10]);assert.equal(result.data.completion.percentage,75);assert.ok(p.privacyConsentAt);assert.ok(p.marketingConsentAt);
 const logs=await audit(a.id);assert.deepEqual(logs.map(r=>r.action).sort(),['member.communication_preferences.updated','member.privacy_consent.accepted','member.profile.updated'].sort());
 const serialized=JSON.stringify(logs);for(const secret of ['Runner One','447700900123','2025550100',a.email,'Stay consistent'])assert.ok(!serialized.includes(secret));
 assert.deepEqual((await query('SELECT * FROM uss.accounts WHERE id=$1',[a.id]))[0],beforeAccount);
});
test('identity, roles, lifecycle, email and timestamp mutation rejected by allowlist',async()=>{
 const a=await create(),beforeProfile=await stored(a.id);
 for(const field of ['accountId','memberId','barcodeValue','role','status','authProviderUserId','email','createdAt','privacyConsentAt','marketingConsentAt','__proto__']){
 const changes=JSON.parse(JSON.stringify({[field]:'spoof'}));assert.equal((await update(changes)).code,'PROFILE_VALIDATION_ERROR');
 }
 assert.deepEqual(await stored(a.id),beforeProfile);assert.equal((await audit(a.id)).length,0);
 await assert.rejects(query("UPDATE uss.accounts SET member_id='USS-00000000-0000-4000-8000-000000000000' WHERE id=$1",[a.id]),e=>e.code==='23514');
 await assert.rejects(query("UPDATE uss.accounts SET barcode_value='USS-00000000-0000-4000-8000-000000000000' WHERE id=$1",[a.id]),e=>e.code==='23514');
});
test('client account IDs never select another member, including administrative role holders',async()=>{
 const a=await create(),b=await create();await use(a);
 const readResult=await actions.getOwnMemberProfile({accountId:b.id});assert.equal(readResult.data.account.id,a.id);
 assert.equal((await actions.updateOwnMemberProfile({accountId:b.id,expectedVersion:(await read()).profile.version,changes:{city:'Other'}})).code,'PROFILE_VALIDATION_ERROR');
 assert.equal((await update({accountId:b.id,city:'Other'})).code,'PROFILE_VALIDATION_ERROR');
 await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code='super_admin'",[a.id]);assert.equal((await update({city:'Own city'})).ok,true);assert.equal((await stored(b.id)).city,null);
});
test('invalid phone, dates, HTML, oversized and malformed values rejected',async()=>{
 await create();const future=new Date();future.setUTCDate(future.getUTCDate()+1);
 for(const changes of [{phone:'abc+123'},{phone:'++447700900123'},{phone:'123'},{phone:'9'.repeat(16)},{birthDate:future.toISOString().slice(0,10)},{birthDate:'2023-02-29'},{birthDate:'1800-01-01'},{birthDate:'not-a-date'},{fullName:'  '},{fullName:'A'},{fullName:'x'.repeat(121)},{city:'x'.repeat(101)},{city:'<script>alert(1)</script>'},{instagramHandle:'https://example.com'},{jerseySize:'huge'},{gender:'invalid'},{marketingConsent:'true'},{privacyConsent:false},{privacyConsent:null},{avatarMediaId:'bad-id'},{runningPreferences:{nested:{object:true}}},{runningPreferences:{days:['funday']}},{runningPreferences:{distancesKm:[NaN]}},{runningPreferences:{goals:['x'.repeat(61)]}}]){
 const result=await update(changes);assert.equal(result.code,'PROFILE_VALIDATION_ERROR',JSON.stringify(changes));assert.ok(!JSON.stringify(result).includes('script'));}
 assert.equal((await actions.updateOwnMemberProfile({expectedVersion:'not-a-date',changes:{city:'Valid'}})).code,'PROFILE_VALIDATION_ERROR');
 assert.equal((await update({city:'x'.repeat(9000)})).code,'PROFILE_VALIDATION_ERROR');
 const cyclic={};cyclic.self=cyclic;assert.throws(()=>validation.validateProfileUpdate(cyclic),e=>e.code==='PROFILE_VALIDATION_ERROR');
});
test('emergency consistency uses merged stored fields and empty optional values clear deliberately',async()=>{
 await create();assert.equal((await update({emergencyContactName:'Contact'})).code,'PROFILE_VALIDATION_ERROR');
 await update({emergencyContactName:'Contact',emergencyContactPhone:'+12025550100',phone:'07700900123',city:'City'});
 assert.equal((await update({emergencyContactPhone:null})).code,'PROFILE_VALIDATION_ERROR');
 assert.equal((await update({emergencyContactName:'Changed name'})).ok,true);
 assert.equal((await update({emergencyContactName:null,emergencyContactPhone:'',phone:'',city:null})).ok,true);const p=(await read()).profile;assert.equal(p.emergencyContactName,null);assert.equal(p.phone,null);assert.equal(p.city,null);
});
test('privacy evidence retained, marketing changes are separate and no-op submits do not churn audits',async()=>{
 const a=await create();await update({privacyConsent:true,marketingConsent:true});const first=(await read()).profile;
 await update({marketingConsent:false});const second=(await read()).profile;assert.equal(second.privacyConsentAt,first.privacyConsentAt);assert.equal(second.marketingConsent,false);assert.ok(second.marketingConsentAt);
 const auditCount=(await audit(a.id)).length;const version=second.version;await update({privacyConsent:true,marketingConsent:false});const third=(await read()).profile;assert.equal(third.version,version);assert.equal(third.privacyConsentAt,first.privacyConsentAt);assert.equal((await audit(a.id)).length,auditCount);
});
test('stale and parallel updates conflict, rapid repeated submit does not duplicate audit',async()=>{
 const a=await create();const version=(await read()).profile.version;
 const results=await Promise.all([update({city:'First'},version),update({city:'Second'},version)]);assert.equal(results.filter(r=>r.ok).length,1);assert.equal(results.filter(r=>r.code==='CONFLICT').length,1);assert.equal((await audit(a.id)).length,1);
 assert.equal((await update({city:'Again'},version)).code,'CONFLICT');assert.equal((await audit(a.id)).length,1);
 const latest=(await read()).profile.version;assert.equal((await update({phone:'+12025550100'},latest)).ok,true);assert.ok((await read()).profile.city);
});
test('status recheck after account lock rejects a stale previously active session',async()=>{
 for(const [status,code] of [['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED'],['pending_verification','EMAIL_NOT_VERIFIED']]){
 const a=await create();const version=(await read()).profile.version;statusRace=status;assert.equal((await update({city:'Denied'},version)).code,code);assert.equal((await stored(a.id)).city,null);assert.equal((await audit(a.id)).length,0);
 }
});
test('fresh read rechecks DB status instead of trusting memoized account',async()=>{
 const a=await create();await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[a.id]);assert.equal((await actions.getOwnMemberProfile()).code,'ACCOUNT_SUSPENDED');assert.equal((await actions.getOwnMemberCard()).code,'ACCOUNT_SUSPENDED');
});
test('missing profile controlled, partial data retained and no fake PII generated',async()=>{
 const a=await create('active',false);assert.equal((await actions.getOwnMemberProfile()).code,'PROFILE_NOT_FOUND');assert.equal((await actions.getOwnMemberCard()).code,'PROFILE_NOT_FOUND');
 assert.equal((await actions.updateOwnMemberProfile({expectedVersion:'0'.repeat(64),changes:{city:'City'}})).code,'PROFILE_NOT_FOUND');
 await query("INSERT INTO uss.member_profiles(account_id,full_name,city) VALUES($1,'Existing','Existing city')",[a.id]);await update({phone:'+12025550100'});const p=(await read()).profile;assert.equal(p.fullName,'Existing');assert.equal(p.city,'Existing city');assert.equal(p.emergencyContactName,null);assert.equal((await read()).completion.percentage,50);
});
test('legacy owned/public, foreign, archived, non-image, unknown references and clear operations are all rejected',async()=>{
 const a=await create();const b=await create();await use(a);
 const media=async(owner,status='active',mime='image/png',url='https://cdn.example.com/avatar.png')=>(await query('INSERT INTO uss.media_assets(storage_provider,storage_key,public_url,mime_type,byte_size,uploaded_by,status) VALUES($1,$2,$3,$4,100,$5,$6) RETURNING id',['test',crypto.randomUUID(),url,mime,owner,status]))[0].id;
 const own=await media(a.id);assert.equal((await update({avatarMediaId:own})).code,'PROFILE_VALIDATION_ERROR');assert.equal((await read()).profile.avatar,null);
 for(const id of [crypto.randomUUID(),await media(b.id),await media(a.id,'archived'),await media(a.id,'active','image/svg+xml'),await media(a.id,'active','text/html')])assert.equal((await update({avatarMediaId:id})).code,'PROFILE_VALIDATION_ERROR');
 await query("UPDATE uss.media_assets SET public_url='javascript:alert(1)' WHERE id=$1",[own]);assert.equal((await read()).profile.avatar,null);
 await completeMemberFixture(query,a.id);const privateAvatar=(await stored(a.id)).avatar_media_id;
 assert.equal((await update({avatarMediaId:null})).code,'PROFILE_VALIDATION_ERROR');assert.equal((await stored(a.id)).avatar_media_id,privateAvatar);
});
test('member card contains only display identity/status/avatar, not contact or session data',async()=>{
 const a=await create();await completeMemberFixture(query,a.id);await update({fullName:'Runner',phone:'+12025550100'});const result=await actions.getOwnMemberCard();assert.equal(result.ok,true);assert.deepEqual(Object.keys(result.data).sort(),['avatar','barcodeValue','displayName','memberId','status'].sort());assert.equal(result.data.barcodeValue,a.barcode_value);assert.equal(result.data.displayName,'Runner');assert.ok(!JSON.stringify(result).includes(a.email));assert.ok(!JSON.stringify(result).includes('12025550100'));
});
test('mandatory audit failure rolls profile/consent changes back atomically',async()=>{
 const a=await create();const initial=await stored(a.id);
 await pg.exec("CREATE FUNCTION uss.member_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='member.communication_preferences.updated' THEN RAISE EXCEPTION 'secret PII'; END IF; RETURN NEW; END $$; CREATE TRIGGER member_test_failure BEFORE INSERT ON uss.audit_logs FOR EACH ROW EXECUTE FUNCTION uss.member_test_failure()");
 try{assert.deepEqual(await update({city:'Changed',marketingConsent:true,privacyConsent:true}),{ok:false,code:'PROFILE_UNAVAILABLE'});assert.deepEqual(await stored(a.id),initial);assert.equal((await audit(a.id)).length,0);}
 finally{await pg.exec('DROP TRIGGER member_test_failure ON uss.audit_logs; DROP FUNCTION uss.member_test_failure()');}
});
test('non-owner runtime grants support new service without permission escalation',async()=>{
 const a=await create();await pg.exec('CREATE ROLE member_app_test NOLOGIN');await pg.exec(readFileSync('database/runtime-grants.sql','utf8').replaceAll(':"app_role"','"member_app_test"'));await pg.exec('SET ROLE member_app_test');
 try{assert.equal((await update({city:'Runtime city'})).ok,true);assert.equal((await read()).profile.city,'Runtime city');}
 finally{await pg.exec('RESET ROLE');}
});
test('DB failure and malformed stored preferences are controlled, no raw PII errors',async()=>{
 const a=await create();failDb=true;assert.deepEqual(await actions.getOwnMemberProfile(),{ok:false,code:'PROFILE_UNAVAILABLE'});assert.deepEqual(await actions.getOwnMemberCard(),{ok:false,code:'PROFILE_UNAVAILABLE'});failDb=false;
 await query('UPDATE uss.member_profiles SET running_preferences=$2 WHERE account_id=$1',[a.id,JSON.stringify({legacyUnknown:{nested:'private'}})]);assert.deepEqual(await actions.getOwnMemberProfile(),{ok:false,code:'PROFILE_UNAVAILABLE'});
});

test('SQL-looking profile text is bound data; optional demographics/marketing do not affect completion',async()=>{
 const a=await create();const text="A'); UPDATE uss.accounts SET status='active'; --";
 assert.equal((await update({city:text,birthDate:'2000-02-29'})).ok,true);assert.equal((await stored(a.id)).city,text);
 await update({fullName:'Runner',phone:'+12025550100',emergencyContactName:'Contact',emergencyContactPhone:'+44205550100'});
 const data=await read();assert.equal(data.completion.percentage,75);assert.equal(data.profile.marketingConsent,false);assert.equal(data.profile.privacyConsentAt,null);assert.equal(data.account.status,'active');
});
test('unbounded/deep preferences and empty/oversized command payload are rejected safely',async()=>{
 await create();let nested={};for(let i=0;i<100;i++)nested={deeper:nested};
 for(const changes of [{runningPreferences:nested},{runningPreferences:{goals:['A'.repeat(60),'B'.repeat(60),'C'.repeat(60),'D'.repeat(60),'E'.repeat(60),'F']}},{runningPreferences:{distancesKm:Array(9).fill(5)}},{runningPreferences:null}])assert.equal((await update(changes)).code,'PROFILE_VALIDATION_ERROR');
 assert.equal((await actions.updateOwnMemberProfile(null)).code,'PROFILE_VALIDATION_ERROR');assert.equal((await update({})).code,'PROFILE_VALIDATION_ERROR');
});

test('version is timezone-independent and detects mutation even if timestamps match',async()=>{
 const a=await create();const initial=await read();await pg.exec("SET TIME ZONE 'Asia/Jakarta'");
 try{assert.equal((await read()).profile.version,initial.profile.version);assert.equal((await update({city:'Jakarta'},initial.profile.version)).ok,true);}
 finally{await pg.exec("SET TIME ZONE 'UTC'");}
 const before=await read();await pg.exec("CREATE FUNCTION uss.member_same_time() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=OLD.updated_at; RETURN NEW; END $$; CREATE TRIGGER zz_member_same_time BEFORE UPDATE ON uss.member_profiles FOR EACH ROW EXECUTE FUNCTION uss.member_same_time()");
 try{assert.equal((await update({city:'Same timestamp change'},before.profile.version)).ok,true);const after=await read();assert.equal(after.profile.updatedAt,before.profile.updatedAt);assert.notEqual(after.profile.version,before.profile.version);assert.equal((await update({city:'Stale'},before.profile.version)).code,'CONFLICT');}
 finally{await pg.exec('DROP TRIGGER zz_member_same_time ON uss.member_profiles; DROP FUNCTION uss.member_same_time()');}
});

test('direct service errors are sanitized before any SSR/action consumer sees them',async()=>{
 await create();const service=load('lib/member/profile-service.ts');failDb=true;
 try{for(const fn of [service.getCurrentMemberProfile,service.getCurrentMemberCard])await assert.rejects(fn(),e=>e.code==='PROFILE_UNAVAILABLE'&&e.message==='PROFILE_UNAVAILABLE'&&!e.cause);}
 finally{failDb=false;}
});
