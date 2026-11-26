import test,{before,after} from 'node:test';
import {completeMemberFixture} from './member-identity-fixtures.mjs';
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
let current=null,failDb=false,statusRace=null,historyRace=null;
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
  if(specifier==='@/lib/db')return {query:async(...args)=>{if(failDb)throw Error('secret DB and PII');if(historyRace && args[0].includes('WITH authority')){const race=historyRace;historyRace=null;await race();}return query(...args);},getSql:()=>{if(failDb)throw Error('secret DB and PII');return sql;}};
  if(specifier==='./account-provisioning')return {getCurrentAccount:async()=>current};
  if(specifier.startsWith('@/'))return load(resolve(specifier.slice(2)+'.ts'));
  if(specifier.startsWith('.'))return load(resolve(dirname(file),specifier+'.ts'));
  return require(specifier);
 };
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(localRequire,module,module.exports);return module.exports;
}
const actions=load('lib/member/profile-actions.ts');
const use=async(a)=>{current={id:a.id,email:a.email,memberId:a.member_id,barcodeValue:a.barcode_value,status:a.status,emailVerifiedAt:a.email_verified_at,displayName:a.display_name};};
const create=async(status='active',withProfile=true)=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() ELSE NULL END) RETURNING *",[crypto.randomUUID(),crypto.randomUUID()+'@example.com',status]))[0];if(withProfile)await query('INSERT INTO uss.member_profiles(account_id) VALUES($1)',[a.id]);await use(a);return a;};
const read=async()=>{const result=await actions.getOwnMemberProfile();assert.equal(result.ok,true);return result.data;};
const update=async(changes,version)=>actions.updateOwnMemberProfile({expectedVersion:version||(await read()).profile.version,changes});
const stored=async(id)=>(await query('SELECT * FROM uss.member_profiles WHERE account_id=$1',[id]))[0];
const audit=async(id)=>query("SELECT action,change_summary FROM uss.audit_logs WHERE actor_account_id=$1 ORDER BY created_at",[id]);
before(async()=>{await migrate({query,transaction:statements=>pg.transaction(async tx=>{for(const s of statements)await tx.query(s.text,s.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));});
after(async()=>pg.close());
const guards=load('lib/authz/guards.ts'),policy=load('lib/authz/permissions.ts'),auditActions=load('lib/audit/audit-actions.ts'),revisions=load('lib/revisions/revision-actions.ts');
const assign=async(id,role)=>query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2 ON CONFLICT DO NOTHING',[id,role]);
const principal=async(role='member',status='active')=>{const a=await create(status);await assign(a.id,role);return a;};
const denied=(fn,code='INSUFFICIENT_PERMISSION')=>assert.rejects(fn,e=>e.code===code&&e.message===code&&!e.cause);
const log=async(actor,action='story.updated',entityType='story',summary={changedFields:['title']},at=null)=>(await query('INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary,created_at) VALUES($1,$2,$3,$4,$5,COALESCE($6::timestamptz,clock_timestamp())) RETURNING id',[actor,action,entityType,crypto.randomUUID(),JSON.stringify(summary),at]))[0].id;
const story=async()=>{await query("INSERT INTO uss.story_content_types(code,name) VALUES('editorial','Editorial') ON CONFLICT DO NOTHING");return (await query("INSERT INTO uss.stories(slug,content_type,title,body) VALUES($1,'editorial','Draft Story','{}') RETURNING id",[crypto.randomUUID()]))[0].id;};
const revision=async(parent,version=1,snapshot={title:'Draft Title',slug:'draft',status:'draft'})=>(await query("INSERT INTO uss.story_revisions(story_id,version,snapshot,created_by,action) VALUES($1,$2,$3,$4,'updated') RETURNING id",[parent,version,JSON.stringify(snapshot),current.id]))[0].id;

test('member self permissions allowed; CMS/audit/reserved permissions rejected',async()=>{
 await principal();for(const p of ['profile.read.self','profile.update.self','member_card.read.self','media.upload.self'])assert.equal((await guards.requirePermission(p)).account.id,current.id);
 for(const p of ['cms.content.manage','stories.manage','partners.manage','events.manage','audit.read','users.manage','roles.manage','settings.manage','members.lookup','members.photo.review'])await denied(()=>guards.requirePermission(p));
});
test('admin operational permissions allowed but reserved super-admin capabilities denied',async()=>{
 await principal('admin');for(const p of ['cms.content.manage','stories.manage','partners.manage','events.manage','audit.read','members.lookup','members.photo.review'])await guards.requirePermission(p);
 for(const p of ['audit.read.all','roles.manage','users.manage','settings.manage'])await denied(()=>guards.requirePermission(p));await denied(()=>guards.requireRole('super_admin'));
});
test('super-admin has complete matrix; no role mutation/elevation endpoint exists',async()=>{
 await principal('super_admin');for(const p of policy.PERMISSIONS)await guards.requirePermission(p);await guards.requireRole('super_admin');
 assert.deepEqual(policy.SYSTEM_ROLES,['member','admin','super_admin']);assert.equal(typeof guards.assignRole,'undefined');
});
test('anonymous and non-active administrator denied despite role',async()=>{
 current=null;await denied(()=>guards.requirePermission('audit.read'),'UNAUTHENTICATED');
 for(const [status,code] of [['pending_verification','EMAIL_NOT_VERIFIED'],['suspended','ACCOUNT_SUSPENDED'],['deactivated','ACCOUNT_DEACTIVATED']]){await principal('admin',status);await denied(()=>guards.requirePermission('audit.read'),code);}
});
test('fresh DB role/status authority overrides spoofed provider/client fields',async()=>{
 const a=await principal();current.role='super_admin';current.roles=['super_admin'];await denied(()=>guards.requirePermission('audit.read'));
 const b=await principal('super_admin');await use(a);assert.equal((await auditActions.getAuditHistory({accountId:b.id,role:'super_admin'})).code,'INSUFFICIENT_PERMISSION');
 await assign(a.id,'admin');await query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[a.id]);await denied(()=>guards.requirePermission('audit.read'),'ACCOUNT_SUSPENDED');
});
test('any/role guards fail closed for unknown, empty and excessive permission input',async()=>{
 await principal('admin');await guards.requireAnyPermission(['roles.manage','stories.manage']);
 for(const values of [[],['evil'],Array(100).fill('stories.manage')])await denied(()=>guards.requireAnyPermission(values));
 await denied(()=>guards.requirePermission('invalid'));await denied(()=>guards.requireRole('owner'));
});
test('member cannot inspect audit or unpublished revision even with valid identifiers',async()=>{
 await principal();const parent=await story(),id=await revision(parent);
 assert.equal((await auditActions.getAuditHistory()).code,'INSUFFICIENT_PERMISSION');
 assert.equal((await revisions.getRevisionHistory({entity:'story',entityId:parent})).code,'INSUFFICIENT_PERMISSION');
 assert.equal((await revisions.getHistorySnapshot({entity:'story',entityId:parent,revisionId:id})).code,'INSUFFICIENT_PERMISSION');
});
test('admin sees only positive-listed operational actions/entities, not security/member audit',async()=>{
 const a=await principal('admin');const good=await log(a.id);await log(a.id,'account.verification_completed','account');await log(a.id,'member.profile.updated','member_profile');await log(a.id,'roles.granted','role');await log(a.id,'story.secret_exported','story');await log(a.id,'story.updated','account');
 const result=await auditActions.getAuditHistory({actorId:a.id});assert.equal(result.ok,true);assert.deepEqual(result.data.items.map(x=>x.id),[good]);
 await assign(a.id,'super_admin');assert.equal((await auditActions.getAuditHistory({actorId:a.id})).data.items.length,6);
});
test('audit DTO minimizes PII/secrets and unsafe raw metadata for every role',async()=>{
 const a=await principal('super_admin');await query("UPDATE uss.accounts SET display_name='Safe Editor' WHERE id=$1",[a.id]);
 await log(a.id,'story.updated','story',{changedFields:['title','email','token','status',{bad:'raw-secret'}],email:'private@example.com',password:'secret',token:'raw-proof',emergencyContactPhone:'+12025550100'});
 const row=(await auditActions.getAuditHistory({actorId:a.id})).data.items[0];assert.deepEqual(row.metadata,{changedFields:['title','status']});assert.equal(row.actor.displayName,'Safe Editor');
 for(const secret of ['private@example.com','raw-proof','raw-secret','12025550100','password','provider','ip_hash','request_id'])assert.ok(!JSON.stringify(row).includes(secret));
});
test('audit cursor retains microseconds, stable ties and fixed window without duplicate pages',async()=>{
 // Keep the fixed microsecond fixture before the default query window end.
 // Using the current second can put .123456 ahead of now and make this test timing-dependent.
 const a=await principal('admin');const at=new Date(Date.now()-1000).toISOString().slice(0,19)+'.123456Z';assert.ok(Date.parse(at)<Date.now());const ids=[];for(let i=0;i<5;i++)ids.push(await log(a.id,'story.updated','story',{},at));
 let cursor;const seen=[];do{const response=await auditActions.getAuditHistory({actorId:a.id,limit:2,...(cursor?{cursor}:{})});assert.equal(response.ok,true);seen.push(...response.data.items.map(x=>x.id));cursor=response.data.nextCursor;}while(cursor);
 assert.deepEqual(seen,[...ids].sort());assert.equal(new Set(seen).size,5);
});
test('bounded pagination and malformed/oversized/date filters rejected',async()=>{
 await principal('admin');for(const f of [{limit:0},{limit:101},{limit:1.5},{limit:'10'},{cursor:'???'},{cursor:'a'.repeat(600)},{actorId:'bad'},{entityId:'bad'},{action:"x'; DROP TABLE uss.accounts;--"},{from:'2026-02-30T00:00:00Z'},{from:'0000-01-01T00:00:00Z'},{from:'2024-01-01T00:00:00Z',until:'2026-01-01T00:00:00Z'},{from:'2026-01-02T00:00:00Z',until:'2026-01-01T00:00:00Z'},{role:'super_admin'},{accountId:crypto.randomUUID()}])assert.equal((await auditActions.getAuditHistory(f)).code,'HISTORY_VALIDATION_ERROR',JSON.stringify(f));
 assert.equal((await auditActions.getAuditHistory({action:'a'.repeat(5000)})).code,'HISTORY_VALIDATION_ERROR');
});
test('valid date/action/entity/actor filters bind values, empty data is safe',async()=>{
 const a=await principal('admin');const id=await log(a.id);const from=new Date(Date.now()-86400000).toISOString(),until=new Date(Date.now()+86400000).toISOString();
 const r=await auditActions.getAuditHistory({actorId:a.id,action:'story.updated',entityType:'story',from,until});assert.deepEqual(r.data.items.map(x=>x.id),[id]);
 assert.deepEqual((await auditActions.getAuditHistory({actorId:crypto.randomUUID()})).data.items,[]);
});
test('same-query authorization blocks role revocation or suspension between guard and read',async()=>{
 const a=await principal('admin');await log(a.id);historyRace=()=>query('DELETE FROM uss.account_roles WHERE account_id=$1',[a.id]);assert.equal((await auditActions.getAuditHistory()).code,'INSUFFICIENT_PERMISSION');
 await assign(a.id,'admin');historyRace=()=>query("UPDATE uss.accounts SET status='suspended' WHERE id=$1",[a.id]);assert.equal((await auditActions.getAuditHistory()).code,'INSUFFICIENT_PERMISSION');
});
test('super-admin audit scope fails closed if elevated role revoked after guard',async()=>{
 const a=await principal('super_admin');await assign(a.id,'admin');await log(a.id,'roles.granted','role');
 historyRace=()=>query("DELETE FROM uss.account_roles WHERE account_id=$1 AND role_id=(SELECT id FROM uss.roles WHERE code='super_admin')",[a.id]);
 assert.equal((await auditActions.getAuditHistory()).code,'INSUFFICIENT_PERMISSION');
});
test('authorized revision list is bounded, newest first, cursor parent-bound',async()=>{
 await principal('admin');const parent=await story();for(let i=1;i<=4;i++)await revision(parent,i);
 const first=await revisions.getRevisionHistory({entity:'story',entityId:parent,limit:2});assert.equal(first.ok,true);assert.deepEqual(first.data.items.map(x=>x.version),[4,3]);
 const second=await revisions.getRevisionHistory({entity:'story',entityId:parent,limit:2,cursor:first.data.nextCursor});assert.deepEqual(second.data.items.map(x=>x.version),[2,1]);assert.equal(second.data.nextCursor,null);
 assert.equal((await revisions.getRevisionHistory({entity:'story',entityId:crypto.randomUUID(),cursor:first.data.nextCursor})).code,'HISTORY_VALIDATION_ERROR');
 for(const input of [{entity:'bad',entityId:parent},{entity:'story',entityId:'bad'},{entity:'story',entityId:parent,limit:999999},{entity:'story',entityId:parent,role:'super_admin'}])assert.equal((await revisions.getRevisionHistory(input)).code,'HISTORY_VALIDATION_ERROR');
});
test('safe typed draft snapshot omits rich body/PII/token/unsafe text; parent ID prevents cross-entity lookup',async()=>{
 await principal('admin');const parent=await story(),id=await revision(parent,1,{title:'Draft Preview',slug:'draft-preview',status:'draft',featured:true,body:{token:'raw-proof'},email:'private@example.com',token:'raw-proof',excerpt:'api_key=secret'});
 const result=await revisions.getHistorySnapshot({entity:'story',entityId:parent,revisionId:id});assert.equal(result.ok,true);assert.equal(result.data.snapshot.title,'Draft Preview');assert.equal(result.data.snapshot.featured,true);assert.equal(result.data.snapshotScope,'safe_preview');
 for(const secret of ['raw-proof','private@example.com','api_key','body'])assert.ok(!JSON.stringify(result).includes(secret));
 assert.equal((await revisions.getHistorySnapshot({entity:'story',entityId:crypto.randomUUID(),revisionId:id})).code,'HISTORY_NOT_FOUND');
 assert.equal((await revisions.getHistorySnapshot({entity:'story',entityId:parent,revisionId:crypto.randomUUID()})).code,'HISTORY_NOT_FOUND');
});
test('site/partner/event history uses existing table linkage with explicit typed projections',async()=>{
 await principal('admin');
 const site=(await query("INSERT INTO uss.site_content(key,content) VALUES($1,'{}') RETURNING id",[crypto.randomUUID()]))[0].id;
 const partner=(await query("INSERT INTO uss.partners(name,slug) VALUES('Brand',$1) RETURNING id",[crypto.randomUUID()]))[0].id;
 const event=(await query("INSERT INTO uss.events(slug,title,starts_at) VALUES($1,'Run',now()) RETURNING id",[crypto.randomUUID()]))[0].id;
 const fixtures=[['site_content','site_content_revisions','site_content_id','content',site,{headline:'Public Headline'}],['partner','partner_revisions','partner_id','snapshot',partner,{name:'Public Brand',visible:true}],['event','event_revisions','event_id','snapshot',event,{title:'Public Run',starts_at:'2026-10-09T00:00:00Z'}]];
 for(const [kind,table,key,column,parent,snapshot]of fixtures){const id=(await query(`INSERT INTO uss.${table}(${key},version,${column},created_by,${kind==='site_content'?'status':'action'}) VALUES($1,1,$2,$3,$4) RETURNING id`,[parent,JSON.stringify({...snapshot,secret:'raw-secret'}),current.id,kind==='site_content'?'draft':'updated']))[0].id;
 assert.equal((await revisions.getRevisionHistory({entity:kind,entityId:parent})).data.items.length,1);const detail=await revisions.getHistorySnapshot({entity:kind,entityId:parent,revisionId:id});assert.equal(detail.ok,true);assert.ok(!JSON.stringify(detail).includes('raw-secret'));}
});
test('revision/audit immutable history and runtime least privileges preserved',async()=>{
 const a=await principal('admin'),parent=await story(),id=await revision(parent);const before=(await query('SELECT snapshot FROM uss.story_revisions WHERE id=$1',[id]))[0];await log(a.id);
 await pg.exec('CREATE ROLE history_app_test NOLOGIN');await pg.exec(readFileSync('database/runtime-grants.sql','utf8').replaceAll(':"app_role"','"history_app_test"'));await pg.exec('SET ROLE history_app_test');
 try{assert.equal((await revisions.getHistorySnapshot({entity:'story',entityId:parent,revisionId:id})).ok,true);assert.equal((await auditActions.getAuditHistory({actorId:a.id})).ok,true);
 for(const q of ['UPDATE uss.audit_logs SET action=action','DELETE FROM uss.audit_logs','TRUNCATE uss.audit_logs','UPDATE uss.story_revisions SET version=version'])await assert.rejects(query(q));}
 finally{await pg.exec('RESET ROLE');}assert.deepEqual((await query('SELECT snapshot FROM uss.story_revisions WHERE id=$1',[id]))[0],before);
});
test('DB failure sanitized at guard/service/action boundary and no profile/card regression',async()=>{
 const admin=await principal('admin');failDb=true;try{await denied(()=>guards.requirePermission('audit.read'),'AUTHORIZATION_UNAVAILABLE');assert.deepEqual(await auditActions.getAuditHistory(),{ok:false,code:'AUTHORIZATION_UNAVAILABLE'});}finally{failDb=false;}
 assert.equal((await actions.getOwnMemberCard()).code,'PROFILE_INCOMPLETE');
 await completeMemberFixture(query,admin.id);
 assert.equal((await update({city:'Own city'})).ok,true);assert.equal((await actions.getOwnMemberCard()).ok,true);assert.equal((await load('lib/member/member-card-actions.ts').getOwnMemberCardPresentation()).ok,true);
});
