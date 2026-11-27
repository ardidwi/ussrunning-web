// Orphan cleanup script: dry run by default, audited, avatar-safe. Storage is a mock; no real storage is touched.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {migrate,loadMigrations} from '../scripts/database/migrations.mjs';
import {runCleanup,planCleanup,cleanupScope} from '../scripts/media/orphan-cleanup.mjs';
import {parseArgs} from '../scripts/media/cleanup-orphans.mjs';
const pg=new PGlite({extensions:{citext,pgcrypto}});
const query=async(text,params=[])=>(await pg.query(text,params)).rows;
const db={query};
before(async()=>migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url))));after(async()=>pg.close());
const old=new Date(Date.now()-72*3600_000);
function mockStorage(objects){const deleted=[];return{buckets:['public','private'],deleted,objects,async *list(bucket,prefix){for(const o of objects)if(o.bucket===bucket&&o.key.startsWith(prefix))yield{key:o.key,size:o.size??10,lastModified:o.lastModified??old};},async delete(bucket,key){if(objects.find(o=>o.key===key)?.fail)throw Error('SECRET provider error');deleted.push(`${bucket}:${key}`);}};}
const asset=async(key,purpose='cms')=>{const a=purpose==='member_avatar'?(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0].id:null;return(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size,width,height,purpose,uploaded_by) VALUES('neon-s3',$1,'image/png',10,1,1,$2,$3) RETURNING id",[key,purpose,a]))[0].id;};
const audits=async action=>query("SELECT change_summary FROM uss.audit_logs WHERE action=$1 ORDER BY created_at",[action]);
const k=()=>`uss-media/${randomUUID()}.png`;

test('dry run is the default: lists orphans and missing objects, deletes nothing, writes an audit record',async()=>{const kept=k(),orphan=k(),missing=k();await asset(kept);await asset(missing);
 const storage=mockStorage([{bucket:'public',key:kept},{bucket:'private',key:orphan}]);
 const r=await runCleanup({db,storage});assert.equal(r.mode,'dry_run');assert.ok(r.orphans.some(o=>o.key===orphan&&o.bucket==='private'));assert.ok(!r.orphans.some(o=>o.key===kept));assert.ok(r.missing.some(m=>m.key===missing));assert.equal(storage.deleted.length,0);
 const a=(await audits('media.cleanup.dry_run')).at(-1).change_summary;assert.equal(a.scope,'cms');assert.ok(a.orphanCount>=1);assert.equal(a.deletedCount,0);});

test('--apply deletes only unreferenced, old, in-scope objects and audits each deletion',async()=>{const orphan=k(),fresh=k(),pending=k(),acct=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0].id;
 await query("INSERT INTO uss.media_upload_intents(id,actor_account_id,storage_provider,storage_key,mime_type,declared_bytes,original_filename,alt_text,visibility,expires_at) VALUES($1,$2,'neon-s3',$3,'image/png',10,'a.png','Alt','public',now()+interval '10 minutes')",[randomUUID(),acct,pending]);
 const storage=mockStorage([{bucket:'public',key:orphan},{bucket:'public',key:fresh,lastModified:new Date()},{bucket:'public',key:pending},{bucket:'public',key:'uss-media/notes.txt'}]);
 const r=await runCleanup({db,storage,apply:true});assert.ok(storage.deleted.includes(`public:${orphan}`));for(const key of [fresh,pending,'uss-media/notes.txt'])assert.ok(!storage.deleted.some(d=>d.endsWith(key)),key);
 assert.ok(r.skipped.recent>=1&&r.skipped.pendingUpload>=1&&r.skipped.unexpectedKey>=1);
 assert.ok((await audits('media.cleanup.object_deleted')).some(a=>a.change_summary.key===orphan));assert.equal((await audits('media.cleanup.applied')).length>=1,true);});

test('member avatar objects are never touched in cms scope, even if unreferenced',async()=>{const av=`member-avatars/${randomUUID()}.webp`;const storage=mockStorage([{bucket:'private',key:av},{bucket:'private',key:'uss-media/../member-avatars/x.png'}]);
 const r=await runCleanup({db,storage,apply:true});assert.ok(!r.orphans.some(o=>o.key.includes('member-avatars')));assert.ok(!storage.deleted.some(d=>d.includes('member-avatars')));});

test('avatar scope requires explicit opt-in to delete and only ever sees avatar keys',async()=>{const live=`member-avatars/${randomUUID()}.webp`,stray=`member-avatars/${randomUUID()}.webp`;await asset(live,'member_avatar');const storage=mockStorage([{bucket:'private',key:live},{bucket:'private',key:stray},{bucket:'public',key:k()}]);
 await assert.rejects(runCleanup({db,storage,scope:'member-avatars',apply:true}),/confirm-member-avatar-scope/);assert.equal(storage.deleted.length,0);
 const dry=await runCleanup({db,storage,scope:'member-avatars'});assert.deepEqual(dry.orphans.map(o=>o.key),[stray]);
 await runCleanup({db,storage,scope:'member-avatars',apply:true,allowAvatarScope:true});assert.deepEqual(storage.deleted,[`private:${stray}`]);});

test('an object referenced between planning and deletion is kept; provider failures are reported, not thrown',async()=>{const racing=k(),failing=k();const storage=mockStorage([{bucket:'public',key:racing},{bucket:'public',key:failing,fail:true}]);
 const realQuery=db.query;let injected=false;const racingDb={query:async(t,p)=>{if(!injected&&t.includes('UNION ALL SELECT 1 FROM uss.media_upload_intents')&&p[0]===racing){injected=true;await asset(racing);}return realQuery(t,p);}};
 const r=await runCleanup({db:racingDb,storage,apply:true});assert.ok(!storage.deleted.some(d=>d.endsWith(racing)));assert.ok(r.failed.some(f=>f.key===failing));assert.ok(!JSON.stringify(r).includes('SECRET'));});

test('max-deletes bounds a run; unsafe options are refused',async()=>{const keys=[k(),k(),k()];const storage=mockStorage(keys.map(key=>({bucket:'public',key})));const r=await runCleanup({db,storage,apply:true,maxDeletes:1});assert.equal(r.deleted.length,1);assert.ok(r.notDeleted>=2);
 await assert.rejects(runCleanup({db,storage,maxDeletes:0}),/max-deletes/);await assert.rejects(planCleanup({db,storage,graceHours:0}),/Grace/);
 assert.throws(()=>cleanupScope('everything'),/Scope/);assert.throws(()=>cleanupScope('cms','member-avatars'),/Unsafe/);assert.throws(()=>cleanupScope('cms','../x'),/Unsafe/);});

test('CLI flags: dry run by default, explicit apply and avatar confirmation',()=>{assert.equal(parseArgs([]).apply,false);assert.equal(parseArgs(['--apply']).apply,true);assert.throws(()=>parseArgs(['--delete-all']),/Unknown flag/);assert.throws(()=>parseArgs(['--scope=all']),/scope/);assert.throws(()=>parseArgs(['--confirm-member-avatar-scope']),/only applies/);assert.equal(parseArgs(['--scope=member-avatars','--apply','--confirm-member-avatar-scope']).allowAvatarScope,true);});
