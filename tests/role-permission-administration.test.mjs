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
import {loadMigrations,migrate} from '../scripts/database/migrations.mjs';

const require=createRequire(import.meta.url),ts=require('typescript');
const pg=new PGlite({extensions:{citext,pgcrypto}});let current=null,root;
const query=async(text,params=[])=>(await pg.query(text,params)).rows;
const modules=new Map();
function load(file){
  file=resolve(file);if(modules.has(file))return modules.get(file).exports;
  const m={exports:{}};modules.set(file,m);
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};
  vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;
}
const service=load('lib/admin-roles/role-service.ts'),actions=load('lib/admin-roles/role-actions.ts'),validation=load('lib/admin-roles/role-validation.ts'),repo=load('lib/admin-roles/role-repository.ts');
const migrations=await loadMigrations(new URL('../database/migrations/',import.meta.url));
const adapter={query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})};
async function account(role='member',status='active',verified=status==='active'){
  const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,display_name,status,email_verified_at) VALUES($1,$2,'Role Test',$3,CASE WHEN $4 THEN now() END) RETURNING *",[randomUUID(),randomUUID()+'@example.test',status,verified]))[0];
  await query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2',[a.id,role]);return a;
}
const row=async id=>(await query('SELECT * FROM uss.accounts WHERE id=$1',[id]))[0];
const roles=async id=>(await query('SELECT r.code FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 ORDER BY r.code',[id])).map(x=>x.code);
const as=a=>current={id:a.id,status:a.status,email:a.email,emailVerifiedAt:a.email_verified_at};
const input=async(a,role='admin')=>({id:a.id,role,expectedVersion:(await row(a.id)).version,reason:'Reviewed elevated access request'});
const code=c=>e=>e.code===c;

before(async()=>{
  await migrate(adapter,migrations);
  root=await account('member');
  assert.equal((await query('SELECT * FROM uss.bootstrap_super_admin($1,$2)',[root.id,'Initial owner bootstrap']))[0].code,'OK');
  root=await row(root.id);as(root);
});
after(async()=>pg.close());

test('operator-only bootstrap creates the first super_admin once',async()=>{
  assert.deepEqual(await roles(root.id),['member','super_admin']);
  const other=await account();
  assert.equal((await query('SELECT * FROM uss.bootstrap_super_admin($1,$2)',[other.id,'Second bootstrap attempt']))[0].code,'ROLE_BOOTSTRAP_CLOSED');
});

test('role policy exposes only elevated roles and immutable member baseline',()=>{
  assert.deepEqual(service.rolePolicy(),{assignableRoles:['admin','super_admin'],immutableBaselineRole:'member',selfMutationAllowed:false});
});

test('super_admin can grant and revoke admin with optimistic versioning',async()=>{
  const a=await account(),first=await input(a,'admin');
  const granted=await service.grantRole(first);assert.equal(granted.code,'ROLE_UPDATED');assert.deepEqual(await roles(a.id),['admin','member']);
  const afterGrant=await row(a.id);assert.equal(afterGrant.version,2);
  await service.revokeRole({...first,expectedVersion:afterGrant.version});assert.deepEqual(await roles(a.id),['member']);assert.equal((await row(a.id)).version,3);
});

test('grant and revoke write minimized audit rows',async()=>{
  const a=await account();await service.grantRole(await input(a,'admin'));const v=(await row(a.id)).version;await service.revokeRole({...(await input(a,'admin')),expectedVersion:v});
  const audit=await query("SELECT action,change_summary FROM uss.audit_logs WHERE entity_id=$1 AND action LIKE 'role.%' ORDER BY created_at",[a.id]);
  assert.deepEqual(audit.map(x=>x.action),['role.granted','role.revoked']);
  for(const x of audit){assert.deepEqual(x.change_summary.changedFields,['roles']);assert.equal(x.change_summary.role,'admin');assert.equal(x.change_summary.reason,'Reviewed elevated access request');}
});

test('member and admin cannot use roles.manage',async()=>{
  for(const role of ['member','admin']){const actor=await account(role);as(actor);await assert.rejects(service.grantRole(await input(await account(),'admin')),code('ROLE_FORBIDDEN'));}
  as(root);
});

test('DB rechecks actor role and active verified state',async()=>{
  const target=await account(),v=(await row(target.id)).version,member=await account();
  await assert.rejects(repo.mutateRole(member.id,target.id,'grant','admin',v,'Reviewed elevated access request'),code('ROLE_FORBIDDEN'));
  const elevated=await account('super_admin');await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[elevated.id]);
  await assert.rejects(repo.mutateRole(elevated.id,target.id,'grant','admin',v,'Reviewed elevated access request'),code('ROLE_FORBIDDEN'));
});

test('self mutation is rejected before repository and by DB',async()=>{
  await assert.rejects(service.revokeRole(await input(root,'super_admin')),code('ROLE_SELF_ACTION_FORBIDDEN'));
  const r=await row(root.id);assert.equal((await query('SELECT * FROM uss.manage_role($1,$1,$2,$3,$4,$5)',[root.id,'revoke','super_admin',r.version,'Reviewed owner change']))[0].code,'ROLE_SELF_ACTION_FORBIDDEN');
});

test('member baseline cannot be managed through BE-18',async()=>{
  const a=await account();assert.throws(()=>validation.roleMutation({...(await input(a,'admin')),role:'member'}),code('ROLE_INVALID_INPUT'));
});

test('unverified or non-active target cannot receive elevation',async()=>{
  for(const state of ['pending_verification','suspended','deactivated']){const a=await account('member',state,state!=='pending_verification');await assert.rejects(service.grantRole(await input(a,'admin')),code('ROLE_TARGET_INELIGIBLE'));}
});

test('duplicate grant and absent revoke are explicit',async()=>{
  const a=await account();await service.grantRole(await input(a,'admin'));await assert.rejects(service.grantRole(await input(a,'admin')),code('ROLE_ALREADY_ASSIGNED'));
  const b=await account();await assert.rejects(service.revokeRole(await input(b,'admin')),code('ROLE_NOT_ASSIGNED'));
});

test('stale version cannot overwrite a newer role change',async()=>{
  const a=await account(),v=await input(a,'admin');await service.grantRole(v);await assert.rejects(service.revokeRole(v),code('ROLE_CONFLICT'));
});

test('super_admin can delegate then revoke super_admin while another usable owner remains',async()=>{
  const a=await account();await service.grantRole(await input(a,'super_admin'));assert.ok((await roles(a.id)).includes('super_admin'));
  const after=await row(a.id);await service.revokeRole({...(await input(a,'super_admin')),expectedVersion:after.version});assert.ok(!(await roles(a.id)).includes('super_admin'));
});

test('last super_admin assignment cannot be revoked',async()=>{
  const others=await query("SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE r.code='super_admin' AND ar.account_id<>$1",[root.id]);
  for(const other of others)await query("DELETE FROM uss.account_roles ar USING uss.roles r WHERE ar.role_id=r.id AND r.code='super_admin' AND ar.account_id=$1",[other.account_id]);
  const target=await account();await service.grantRole(await input(target,'super_admin'));
  const rootRole=await query("SELECT r.id FROM uss.roles r WHERE r.code='super_admin'");
  await query('DELETE FROM uss.account_roles WHERE account_id=$1 AND role_id=$2',[root.id,rootRole[0].id]);
  as(target);target.email_verified_at=(await row(target.id)).email_verified_at;
  await assert.rejects(service.revokeRole(await input(target,'super_admin')),code('ROLE_SELF_ACTION_FORBIDDEN'));
  assert.equal((await query("SELECT count(*)::int n FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE r.code='super_admin'"))[0].n,1);
  await query('INSERT INTO uss.account_roles(account_id,role_id) VALUES($1,$2)',[root.id,rootRole[0].id]);as(await row(root.id));
  await query('DELETE FROM uss.account_roles WHERE account_id=$1 AND role_id=$2',[target.id,rootRole[0].id]);
});

test('concurrent reciprocal super_admin revokes leave at least one usable super_admin',async()=>{
  const superRole=(await query("SELECT id FROM uss.roles WHERE code='super_admin'"))[0];
  const a=await account('super_admin'),b=await account('super_admin');
  await query('DELETE FROM uss.account_roles WHERE account_id=$1 AND role_id=$2',[root.id,superRole.id]);
  const av=(await row(a.id)).version,bv=(await row(b.id)).version;
  const results=await Promise.all([
    query('SELECT * FROM uss.manage_role($1,$2,$3,$4,$5,$6)',[a.id,b.id,'revoke','super_admin',bv,'Concurrent owner review']),
    query('SELECT * FROM uss.manage_role($1,$2,$3,$4,$5,$6)',[b.id,a.id,'revoke','super_admin',av,'Concurrent owner review']),
  ]);
  const codes=results.map(x=>x[0].code);assert.equal(codes.filter(x=>x==='OK').length,1);
  assert.ok(codes.some(x=>['ROLE_FORBIDDEN','ROLE_LAST_SUPER_ADMIN'].includes(x)));
  const usable=(await query("SELECT count(*)::int n FROM uss.accounts a JOIN uss.account_roles ar ON ar.account_id=a.id JOIN uss.roles r ON r.id=ar.role_id WHERE r.code='super_admin' AND a.status='active' AND a.email_verified_at IS NOT NULL"))[0].n;
  assert.ok(usable>=1);
  await query('INSERT INTO uss.account_roles(account_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[root.id,superRole.id]);as(await row(root.id));
});

test('audit failure rolls back role assignment and account version',async()=>{
  const a=await account(),before=(await row(a.id)).version;
  await query("CREATE FUNCTION uss.fail_be18_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='role.granted' THEN RAISE EXCEPTION 'private role audit failure'; END IF; RETURN NEW; END $$");
  await query('CREATE TRIGGER fail_be18 BEFORE INSERT ON uss.audit_logs FOR EACH ROW EXECUTE FUNCTION uss.fail_be18_audit()');
  try{const out=await actions.grantManagedRole(await input(a,'admin'));assert.equal(out.code,'ROLE_UNAVAILABLE');assert.deepEqual(await roles(a.id),['member']);assert.equal((await row(a.id)).version,before);assert.ok(!JSON.stringify(out).includes('private role audit failure'));}
  finally{await query('DROP TRIGGER fail_be18 ON uss.audit_logs');await query('DROP FUNCTION uss.fail_be18_audit()');}
});

test('actions return controlled errors and do not accept forged mutation fields',async()=>{
  const a=await account();for(const extra of [{role:'member'},{expectedVersion:0},{reason:'x'},{reason:'<script>'},{actorId:root.id},{roles:['super_admin']},{operation:'grant'}]){const out=await actions.grantManagedRole({...await input(a,'admin'),...extra});assert.equal(out.ok,false);assert.equal(out.code,'ROLE_INVALID_INPUT');}
});

test('migration rerun executes zero and includes 019',async()=>{
  assert.equal((await migrate(adapter,migrations)).executed.length,0);assert.ok(migrations.some(m=>m.version==='019'));
});
