import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { loadMigrations, migrate } from '../scripts/database/migrations.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const pg = new PGlite({extensions:{citext,pgcrypto}});
const query = async (text,params=[]) => (await pg.query(text,params)).rows;
const migrationAdapter = { query, transaction: statements => pg.transaction(async tx => {
  for (const s of statements) await tx.query(s.text,s.params);
}) };
let provider = {data:null,error:null}, configured=true, failDb=false, failQuery=false, transactionCalls=0;
const sql = {
  query: (text,params) => ({text,params}),
  transaction: async (statements,options) => {
    assert.equal(options.isolationLevel,'ReadCommitted');
    transactionCalls++;
    return pg.transaction(async tx => {
      const results=[];
      for (const s of statements) results.push((await tx.query(s.text,s.params)).rows);
      return results;
    });
  },
};
// Transpile production TS, mock only external transport/provider and React request context.
// SQL/transactions execute unchanged against PostgreSQL. Never connect to a live target.
const modules=new Map();
function load(file) {
  file=resolve(file);
  if(modules.has(file)) return modules.get(file).exports;
  const module={exports:{}};modules.set(file,module);
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const localRequire=specifier=> {
    if(specifier==='server-only') return {};
    if(specifier==='@neondatabase/auth/next/server') return {createNeonAuth:config=>({config})};
    if(specifier==='react') return {cache:fn=>fn};
    if(specifier==='./server') return {isAuthConfigured:()=>configured,getAuth:()=>({getSession:async()=>provider})};
    if(specifier==='@/lib/db') return {getSql:()=>{if(failDb) throw new Error('postgres://secret');return sql;}, query:async(...args)=>{if(failQuery)throw new Error("secret DB failure");return query(...args);}, isDatabaseConfigured:()=>!failDb};
    if(specifier.startsWith('@/')) return load(resolve(specifier.slice(2)+'.ts'));
    if(specifier.startsWith('.')) return load(resolve(dirname(file),specifier+'.ts'));
    return require(specifier);
  };
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,module,module.exports);
  return module.exports;
}
const identity=load('lib/auth/identity.ts');
const repository=load('lib/auth/account-repository.ts');
const sessions=load('lib/auth/session.ts');
const provisioning=load('lib/auth/account-provisioning.ts');
const guards=load('lib/auth/guards.ts');
const status=load('lib/auth/account-status.ts');
const actions=load('lib/auth/actions.ts');
const errors=load('lib/auth/errors.ts');
const legacy=load('lib/auth/legacy-status.ts');
const user=(id,email=id+'@example.com',name='Runner')=>identity.readProviderIdentity({id,email,name});
const setSession=u=>{provider={data:{user:{id:u.providerUserId,email:u.email,name:u.name,emailVerified:u.emailVerified,role:'super_admin',accountId:'spoof',password:'not-persisted',token:'not-returned'}},error:null};};
const count=async(table,accountId)=> (await query('SELECT count(*)::int AS n FROM uss.'+table+' WHERE '+(table==='accounts'?'id':'account_id')+'=$1',[accountId]))[0].n;
const codeIs=code=>error=>error.code===code&&error.message===code;
before(async()=>{await migrate(migrationAdapter,await loadMigrations(new URL('../database/migrations/',import.meta.url)));});
after(async()=>{await pg.close();});

test('new trusted user provisions pending account, minimal profile and only member role',async()=>{
  const u=user('new',' New@Example.com ',' Trusted Runner ');setSession(u);
  const account=await provisioning.getCurrentAccount();
  assert.equal(account.email,'new@example.com');assert.equal(account.status,'pending_verification');assert.equal(account.emailVerifiedAt,null);
  assert.equal(await count('accounts',account.id),1);assert.equal(await count('member_profiles',account.id),1);
  const roles=await query('SELECT r.code FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1',[account.id]);
  assert.deepEqual(roles.map(r=>r.code),['member']);
  const profile=(await query('SELECT * FROM uss.member_profiles WHERE account_id=$1',[account.id]))[0];
  assert.equal(profile.full_name,'Trusted Runner');for(const field of ['phone','city','birth_date','emergency_contact_name','jersey_size','privacy_consent_at']) assert.equal(profile[field],null);
  assert.equal(profile.marketing_consent,false);assert.deepEqual(profile.running_preferences,{});
  assert.equal(account.auth_provider_user_id,undefined);assert.equal(account.password,undefined);assert.equal(account.token,undefined);
});
test('repeat and parallel provisioning return the same account with one profile and role',async()=>{
  const u=user('parallel');
  const [a,b]=await Promise.all([repository.provisionAuthenticatedIdentity(u),repository.provisionAuthenticatedIdentity(u)]);
  assert.equal(a.id,b.id);assert.equal(a.memberId,b.memberId);assert.equal(a.barcodeValue,b.barcodeValue);
  assert.equal((await repository.provisionAuthenticatedIdentity(u)).id,a.id);
  for(const table of ['accounts','member_profiles','account_roles'])assert.equal(await count(table,a.id),1);
});
test('independent opaque identities are unique, permanent and contain no PII',async()=>{
  const [a,b]=await Promise.all([repository.provisionAuthenticatedIdentity(user('ids-one')),repository.provisionAuthenticatedIdentity(user('ids-two'))]);
  const format=/^USS-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;
  assert.match(a.memberId,format);assert.match(a.barcodeValue,format);assert.notEqual(a.memberId,a.barcodeValue);
  assert.notEqual(a.memberId,b.memberId);assert.notEqual(a.barcodeValue,b.barcodeValue);
  await assert.rejects(query("UPDATE uss.accounts SET member_id=$2 WHERE id=$1",[a.id,b.memberId]),e=>e.code==='23514');
  await assert.rejects(query("UPDATE uss.accounts SET barcode_value=$2 WHERE id=$1",[a.id,b.barcodeValue]),e=>e.code==='23514');
});
test('missing provider/email are controlled; missing name stays NULL',async()=>{
  for(const value of [{email:'valid@example.com'},{id:'id'}, {id:' ',email:'valid@example.com'}, {id:'id',email:'invalid'}]) assert.throws(()=>identity.readProviderIdentity(value),codeIs('ACCOUNT_CONFLICT'));
  const account=await repository.provisionAuthenticatedIdentity(user('no-name','no-name@example.com',null));
  assert.equal((await query('SELECT full_name FROM uss.member_profiles WHERE account_id=$1',[account.id]))[0].full_name,null);
});
test('duplicate email and changed provider email cannot merge/rebind accounts',async()=>{
  const a=await repository.provisionAuthenticatedIdentity(user('email-original','same@example.com'));
  await assert.rejects(repository.provisionAuthenticatedIdentity(user('email-other','SAME@example.com')),codeIs('ACCOUNT_CONFLICT'));
  await assert.rejects(repository.provisionAuthenticatedIdentity(user('email-original','changed@example.com')),codeIs('ACCOUNT_CONFLICT'));
  assert.equal((await query("SELECT count(*)::int AS n FROM uss.accounts WHERE auth_provider_user_id='email-other'"))[0].n,0);
  assert.equal((await query('SELECT email FROM uss.accounts WHERE id=$1',[a.id]))[0].email,'same@example.com');
});
test('partially existing account repairs profile/member assignment without changing identity or status',async()=>{
  const row=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status) VALUES('partial','partial@example.com','suspended') RETURNING *"))[0];
  const account=await repository.provisionAuthenticatedIdentity(user('partial'));
  assert.equal(account.id,row.id);assert.equal(account.memberId,row.member_id);assert.equal(account.status,'suspended');
  assert.equal(await count('member_profiles',account.id),1);assert.equal(await count('account_roles',account.id),1);
  await query("UPDATE uss.member_profiles SET full_name='Edited',city='Jakarta' WHERE account_id=$1",[account.id]);
  await repository.provisionAuthenticatedIdentity(user('partial','partial@example.com','Provider changed'));
  assert.equal((await query('SELECT full_name FROM uss.member_profiles WHERE account_id=$1',[account.id]))[0].full_name,'Edited');
});
test('mandatory role failure rolls back account/profile and retry recovers atomically',async()=>{
  await query("UPDATE uss.roles SET code='member-unavailable' WHERE code='member'");
  try {
    await assert.rejects(repository.provisionAuthenticatedIdentity(user('rollback')),codeIs('PROVISIONING_FAILED'));
    assert.equal((await query("SELECT count(*)::int AS n FROM uss.accounts WHERE auth_provider_user_id='rollback'"))[0].n,0);
  }finally{await query("UPDATE uss.roles SET code='member' WHERE code='member-unavailable'");}
  const a=await repository.provisionAuthenticatedIdentity(user('rollback'));assert.equal(await count('member_profiles',a.id),1);
});
test('pending cannot pass active guard, even if provider says email verified',async()=>{
  const u={...user('pending'),emailVerified:true};setSession(u);
  const account=await provisioning.getCurrentAccount();
  assert.equal(status.getVerificationState(account).verified,false);
  await assert.rejects(guards.requireActiveAccount(),codeIs('EMAIL_NOT_VERIFIED'));
  assert.deepEqual(await actions.getActiveOwnAccount(),{ok:false,code:'EMAIL_NOT_VERIFIED'});
});
test('internal verification activation is email-bound, idempotent and transactional',async()=>{
  const a=await repository.provisionAuthenticatedIdentity(user('activation'));
  const activate=(email)=>pg.transaction(tx=>status.activateAccountAfterVerification({query:async(text,params)=>(await tx.query(text,params)).rows},a.id,email));
  await assert.rejects(activate('wrong@example.com'),codeIs('ACCOUNT_CONFLICT'));
  const first=await activate(a.email);const again=await activate(a.email);
  assert.equal(first.status,'active');assert.equal(first.emailVerifiedAt,again.emailVerifiedAt);assert.equal(first.memberId,a.memberId);
  setSession(user('activation'));assert.equal((await guards.requireActiveAccount()).id,a.id);
  assert.equal((await actions.getActiveOwnAccount()).ok,true);
  const b=await repository.provisionAuthenticatedIdentity(user('activation-rollback'));
  await assert.rejects(pg.transaction(async tx=>{
    await status.activateAccountAfterVerification({query:async(text,params)=>(await tx.query(text,params)).rows},b.id,b.email);
    throw new Error('later proof transaction failed');
  }));
  assert.equal((await query('SELECT status FROM uss.accounts WHERE id=$1',[b.id]))[0].status,'pending_verification');
});
test('suspended/deactivated reject protected server access and cannot be reactivated by verification',async()=>{
  for(const [state,code] of [['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){
    const u=user(state);const a=await repository.provisionAuthenticatedIdentity(u);
    await query('UPDATE uss.accounts SET status=$2 WHERE id=$1',[a.id,state]);setSession(u);
    await assert.rejects(guards.requireActiveAccount(),codeIs(code));assert.deepEqual(await actions.getOwnAccount(),{ok:false,code});
    await assert.rejects(pg.transaction(tx=>status.activateAccountAfterVerification({query:async(text,params)=>(await tx.query(text,params)).rows},a.id,a.email)),codeIs(code));
    assert.equal((await query('SELECT status FROM uss.accounts WHERE id=$1',[a.id]))[0].status,state);
  }
});
test('unauthenticated requests never provision or return an account',async()=>{
  provider={data:null,error:null};const calls=transactionCalls;
  assert.equal(await provisioning.getCurrentAccount(),null);
  await assert.rejects(sessions.requireAuthenticatedUser(),codeIs('UNAUTHENTICATED'));
  assert.deepEqual(await actions.getOwnAccount(),{ok:false,code:'UNAUTHENTICATED'});assert.equal(transactionCalls,calls);
});
test('client supplied role/account identity ignored by input-free action',async()=>{
  const u=user('client-spoof');setSession(u);
  const result=await actions.getOwnAccount({accountId:'other-account',role:'super_admin',emailVerified:true});
  assert.equal(result.ok,true);assert.equal(result.account.email,u.email);assert.equal(result.account.status,'pending_verification');
  assert.notEqual(result.account.id,'other-account');assert.equal(await count('account_roles',result.account.id),1);
  const whitelisted=identity.readProviderIdentity({id:'trusted',email:'trusted@example.com',role:'super_admin',accountId:'spoof'});
  assert.equal(whitelisted.role,undefined);assert.equal(whitelisted.accountId,undefined);
});
test('missing config, unavailable DB/provider and raw errors are safe',async()=>{
  configured=false;
  try{assert.deepEqual(await actions.getOwnAccount(),{ok:false,code:'AUTH_NOT_CONFIGURED'});}finally{configured=true;}
  setSession(user('db-failure'));failDb=true;
  try{assert.deepEqual(await actions.getOwnAccount(),{ok:false,code:'PROVISIONING_FAILED'});}finally{failDb=false;}
  provider={data:null,error:{status:503,message:'provider-session-secret'}};
  assert.deepEqual(await actions.getOwnAccount(),{ok:false,code:'AUTH_UNAVAILABLE'});
  provider={data:null,error:{status:401,message:'invalid-session'}};
  assert.deepEqual(await actions.getOwnAccount(),{ok:false,code:'UNAUTHENTICATED'});
  assert.equal(errors.accountErrorCode(new Error('password or SQL')), 'PROVISIONING_FAILED');
});
test('new server services work with BE-01 non-owner runtime grants',async()=>{
  await pg.exec('CREATE ROLE auth_app_test NOLOGIN');
  await pg.exec(readFileSync('database/runtime-grants.sql','utf8').replaceAll(':"app_role"','"auth_app_test"'));
  await pg.exec('SET ROLE auth_app_test');
  try{
    const u=user('runtime-auth');setSession(u);const a=await provisioning.getCurrentAccount();
    assert.equal(a.status,'pending_verification');assert.equal(await count('member_profiles',a.id),1);
  }finally{await pg.exec('RESET ROLE');}
});

test('legacy guard blocks mapped suspended/deactivated identities, leaves unmapped/pending alone',async()=>{
  await legacy.assertLegacyAccountNotBlocked('unknown-legacy-user');
  await legacy.assertLegacyAccountNotBlocked('pending');
  for(const [id,code] of [['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){
    await assert.rejects(legacy.assertLegacyAccountNotBlocked(id),codeIs(code));
  }
});

test('legacy pre-migration schema absence is compatible; unexpected DB errors fail closed',async()=>{
  await pg.exec('ALTER SCHEMA uss RENAME TO uss_absent_fixture');
  try{await legacy.assertLegacyAccountNotBlocked('historical-provider');}
  finally{await pg.exec('ALTER SCHEMA uss_absent_fixture RENAME TO uss');}
  failQuery=true;
  try{await assert.rejects(legacy.assertLegacyAccountNotBlocked('historical-provider'));}
  finally{failQuery=false;}
});

test('actual auth config accessor rejects missing configuration and requests silent provider logging',()=>{
  const originalUrl=process.env.NEON_AUTH_BASE_URL, originalSecret=process.env.NEON_AUTH_COOKIE_SECRET;
  const server=load('lib/auth/server.ts');
  try{
    delete process.env.NEON_AUTH_BASE_URL;delete process.env.NEON_AUTH_COOKIE_SECRET;
    assert.equal(server.isAuthConfigured(),false);assert.throws(()=>server.getAuth(),/required/);
    process.env.NEON_AUTH_BASE_URL='https://test.invalid/auth';process.env.NEON_AUTH_COOKIE_SECRET='s'.repeat(32);
    assert.equal(server.isAuthConfigured(),true);assert.equal(server.getAuth().config.logLevel,'silent');
  }finally{
    if(originalUrl===undefined)delete process.env.NEON_AUTH_BASE_URL;else process.env.NEON_AUTH_BASE_URL=originalUrl;
    if(originalSecret===undefined)delete process.env.NEON_AUTH_COOKIE_SECRET;else process.env.NEON_AUTH_COOKIE_SECRET=originalSecret;
  }
});

test('provider names/IDs containing SQL syntax remain data and no passwords exist in application schema',async()=>{
  const providerId="trusted'; DROP TABLE uss.accounts; --";
  const name="Runner'); DROP TABLE uss.roles; --";
  const a=await repository.provisionAuthenticatedIdentity(user(providerId,'sql-input@example.com',name));
  assert.equal(a.displayName,name);
  assert.equal((await query('SELECT auth_provider_user_id FROM uss.accounts WHERE id=$1',[a.id]))[0].auth_provider_user_id,providerId);
  assert.equal((await query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='uss' AND column_name ILIKE '%password%'"))[0].n,0);
  assert.equal((await query('SELECT count(*)::int AS n FROM uss.roles'))[0].n,3);
});
