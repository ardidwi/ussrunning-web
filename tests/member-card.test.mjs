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
const create=async(status='active',withProfile=true)=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() ELSE NULL END) RETURNING *",[crypto.randomUUID(),crypto.randomUUID()+'@example.com',status]))[0];if(withProfile)await completeMemberFixture(query,a.id);await use(a);return a;};
const read=async()=>{const result=await actions.getOwnMemberProfile();assert.equal(result.ok,true);return result.data;};
const update=async(changes,version)=>actions.updateOwnMemberProfile({expectedVersion:version||(await read()).profile.version,changes});
const stored=async(id)=>(await query('SELECT * FROM uss.member_profiles WHERE account_id=$1',[id]))[0];
const audit=async(id)=>query("SELECT action,change_summary FROM uss.audit_logs WHERE actor_account_id=$1 ORDER BY created_at",[id]);
before(async()=>{await migrate({query,transaction:statements=>pg.transaction(async tx=>{for(const s of statements)await tx.query(s.text,s.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));});
after(async()=>pg.close());
const cards=load('lib/member/member-card-actions.ts');
test('active owner card protocol is stable, opaque and excludes contact/session data',async()=>{
 const a=await create();await update({fullName:'Runner One',phone:'+12025550100'});
 const first=await cards.getOwnMemberCardPresentation(),second=await cards.getOwnMemberCardPresentation();
 assert.deepEqual(first,second);assert.equal(first.code,'MEMBER_CARD_AVAILABLE');assert.equal(first.data.memberId,`USS-${String(a.member_number).padStart(6,"0")}`);
 assert.deepEqual(first.data.barcode,{value:a.barcode_value,formatVersion:1});
 assert.deepEqual(Object.keys(first.data).sort(),['displayName','memberId','barcode','status','avatar'].sort());
 for(const secret of [a.email,a.auth_provider_user_id,'12025550100'])assert.ok(!JSON.stringify(first).includes(secret));
 assert.ok(!first.data.barcode.value.includes('Runner'));assert.notEqual(first.data.barcode.value,first.data.memberId);
});
test('anonymous and every non-active lifecycle state denied',async()=>{
 for(const [status,code] of [[null,'UNAUTHENTICATED'],['pending_verification','EMAIL_NOT_VERIFIED'],['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){
 if(status)await create(status);else current=null;assert.deepEqual(await cards.getOwnMemberCardPresentation(),{ok:false,code});}
});
test('supplied foreign identity ignored; profile edits cannot rotate either identity',async()=>{
 const a=await create(),b=await create();await use(a);
 const first=await cards.getOwnMemberCardPresentation({accountId:b.id,role:'super_admin'});assert.equal(first.data.memberId,`USS-${String(a.member_number).padStart(6,"0")}`);
 assert.equal((await update({barcodeValue:b.barcode_value})).code,'PROFILE_VALIDATION_ERROR');await update({city:'Jakarta'});
 assert.deepEqual((await cards.getOwnMemberCardPresentation()).data.barcode,first.data.barcode);
 assert.equal((await cards.getOwnMemberCardPresentation()).data.memberId,first.data.memberId);
});
test('fresh status check blocks stale active context and missing profile is controlled',async()=>{
 const a=await create();await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[a.id]);assert.equal((await cards.getOwnMemberCardPresentation()).code,'ACCOUNT_SUSPENDED');
 await create('active',false);assert.equal((await cards.getOwnMemberCardPresentation()).code,'PROFILE_NOT_FOUND');
});
test('legacy action retains exact BE-04 shape and identity',async()=>{
 const a=await create();const old=await actions.getOwnMemberCard();const card=await cards.getOwnMemberCardPresentation();
 assert.deepEqual(Object.keys(old.data).sort(),['displayName','memberId','barcodeValue','status','avatar'].sort());
 assert.equal(old.data.barcodeValue,card.data.barcode.value);assert.equal(old.data.memberId,card.data.memberId);
});
test('invalid barcode protocol and DB errors are sanitized without logging',async()=>{
 const protocol=load('lib/member/barcode-contract.ts');for(const value of ['runner@example.com','+12025550100','USS:2:secret','Runner'])assert.throws(()=>protocol.memberBarcode(value));
 await create();failDb=true;try{assert.deepEqual(await cards.getOwnMemberCardPresentation(),{ok:false,code:'PROFILE_UNAVAILABLE'});}finally{failDb=false;}
});
