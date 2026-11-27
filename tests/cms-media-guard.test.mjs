// Migration 023: database-level guard so no CMS reference can point at a member_avatar asset,
// even through direct SQL that bypasses every service check.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {citext} from '@electric-sql/pglite/contrib/citext';
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto';
import {migrate,loadMigrations} from '../scripts/database/migrations.mjs';
const pg=new PGlite({extensions:{citext,pgcrypto}});
const query=async(text,params=[])=>(await pg.query(text,params)).rows;
const migrations=await loadMigrations(new URL('../database/migrations/',import.meta.url));
before(async()=>{await migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},migrations);await query("INSERT INTO uss.story_content_types(code,name) VALUES('editorial','Editorial')");});
after(async()=>pg.close());
const cms=async()=>(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size,width,height) VALUES('fake',$1,'image/png',10,2,2) RETURNING id",['uss-media/'+randomUUID()+'.png']))[0].id;
const avatar=async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0];const id=randomUUID();await query("INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose) VALUES($1,'fake',$2,'image/webp',10,2,2,$3,'member_avatar')",[id,'member-avatars/'+id+'.webp',a.id]);return {id,account:a.id};};
const rejected=e=>e.code==='23514'&&/cms_media_purpose_violation/.test(e.message)&&!/member-avatars|[0-9a-f]{8}-/.test(e.message);
const story=async(fields={})=>(await query("INSERT INTO uss.stories(slug,title,content_type,body,cover_media_id) VALUES($1,'T','editorial',$2::jsonb,$3) RETURNING id",[randomUUID(),JSON.stringify(fields.body??[]),fields.cover??null]))[0].id;

test('jsonb_media_ids finds media keys at any depth and ignores non-uuid values',async()=>{const a=randomUUID(),b=randomUUID(),c=randomUUID();
 const [r]=await query("SELECT uss.jsonb_media_ids($1::jsonb) ids",[JSON.stringify([{type:'image',mediaId:a},{type:'gallery',items:[{mediaId:b},{mediaId:'not-a-uuid'}]},{hero:{desktopMediaId:c}},'legacy paragraph'])]);
 assert.deepEqual([...r.ids].sort(),[a,b,c].sort());
 assert.deepEqual((await query("SELECT uss.jsonb_media_ids('[\"plain\"]'::jsonb) ids"))[0].ids,[]);
 assert.deepEqual((await query('SELECT uss.jsonb_media_ids(NULL) ids'))[0].ids,[]);});

test('story cover, social preview and body blocks reject member avatars',async()=>{const av=await avatar();
 await assert.rejects(story({cover:av.id}),rejected);
 const id=await story({cover:await cms()});
 await assert.rejects(query('UPDATE uss.stories SET cover_media_id=$2 WHERE id=$1',[id,av.id]),rejected);
 await assert.rejects(query('UPDATE uss.stories SET social_preview_media_id=$2 WHERE id=$1',[id,av.id]),rejected);
 await assert.rejects(query('UPDATE uss.stories SET body=$2::jsonb WHERE id=$1',[id,JSON.stringify([{type:'image',mediaId:av.id,alt:'x'}])]),rejected);
 await assert.rejects(query('UPDATE uss.stories SET body=$2::jsonb WHERE id=$1',[id,JSON.stringify([{type:'gallery',items:[{mediaId:await cms(),alt:'a'},{mediaId:av.id,alt:'b'}]}])]),rejected);
 await query('UPDATE uss.stories SET body=$2::jsonb WHERE id=$1',[id,JSON.stringify([{type:'image',mediaId:await cms(),alt:'ok'}])]);});

test('event cover, partner logo, gallery cover and gallery items reject member avatars',async()=>{const av=await avatar(),ok=await cms();
 await assert.rejects(query("INSERT INTO uss.events(slug,title,starts_at,cover_media_id) VALUES($1,'E',now(),$2)",[randomUUID(),av.id]),rejected);
 const e=(await query("INSERT INTO uss.events(slug,title,starts_at,cover_media_id) VALUES($1,'E',now(),$2) RETURNING id",[randomUUID(),ok]))[0].id;
 await assert.rejects(query('UPDATE uss.events SET cover_media_id=$2 WHERE id=$1',[e,av.id]),rejected);
 await assert.rejects(query("INSERT INTO uss.partners(name,slug,logo_media_id) VALUES('P',$1,$2)",[randomUUID(),av.id]),rejected);
 const p=(await query("INSERT INTO uss.partners(name,slug,logo_media_id) VALUES('P',$1,$2) RETURNING id",[randomUUID(),ok]))[0].id;
 await assert.rejects(query('UPDATE uss.partners SET logo_media_id=$2 WHERE id=$1',[p,av.id]),rejected);
 await assert.rejects(query("INSERT INTO uss.galleries(slug,title,cover_media_id) VALUES($1,'G',$2)",[randomUUID(),av.id]),rejected);
 const g=(await query("INSERT INTO uss.galleries(slug,title,cover_media_id) VALUES($1,'G',$2) RETURNING id",[randomUUID(),ok]))[0].id;
 await assert.rejects(query('UPDATE uss.galleries SET cover_media_id=$2 WHERE id=$1',[g,av.id]),rejected);
 await assert.rejects(query('INSERT INTO uss.gallery_items(gallery_id,media_asset_id,sort_order) VALUES($1,$2,0)',[g,av.id]),rejected);
 await query('INSERT INTO uss.gallery_items(gallery_id,media_asset_id,sort_order) VALUES($1,$2,0)',[g,ok]);});

test('site content and its revisions reject avatar ids under any media key',async()=>{const av=await avatar();
 await assert.rejects(query("INSERT INTO uss.site_content(key,content) VALUES($1,$2::jsonb)",['guard.'+randomUUID(),JSON.stringify({desktopMediaId:av.id})]),rejected);
 const c=(await query("INSERT INTO uss.site_content(key,content) VALUES($1,$2::jsonb) RETURNING id",['guard.'+randomUUID(),JSON.stringify({desktopMediaId:await cms()})]))[0].id;
 await assert.rejects(query('UPDATE uss.site_content SET content=$2::jsonb WHERE id=$1',[c,JSON.stringify({sections:[{imageMediaId:av.id}]})]),rejected);
 await assert.rejects(query("INSERT INTO uss.site_content_revisions(site_content_id,version,content,status) VALUES($1,9,$2::jsonb,'draft')",[c,JSON.stringify({backgroundMediaId:av.id})]),rejected);});

test('member profiles may still reference their own avatar',async()=>{const av=await avatar();
 await query("INSERT INTO uss.member_profiles(account_id,full_name,avatar_media_id,avatar_status) VALUES($1,'Runner',$2,'approved')",[av.account,av.id]);
 assert.equal((await query('SELECT avatar_media_id FROM uss.member_profiles WHERE account_id=$1',[av.account]))[0].avatar_media_id,av.id);});

test('legacy rows already pointing at an avatar stay editable for unrelated fields but cannot re-add it',async()=>{const av=await avatar(),id=await story({cover:await cms()});
 await pg.exec('ALTER TABLE uss.stories DISABLE TRIGGER story_cms_media_guard');
 try{await query('UPDATE uss.stories SET cover_media_id=$2 WHERE id=$1',[id,av.id]);}finally{await pg.exec('ALTER TABLE uss.stories ENABLE TRIGGER story_cms_media_guard');}
 await query("UPDATE uss.stories SET title='Renamed legacy' WHERE id=$1",[id]);
 await query('UPDATE uss.stories SET cover_media_id=$2 WHERE id=$1',[id,await cms()]);
 await assert.rejects(query('UPDATE uss.stories SET cover_media_id=$2 WHERE id=$1',[id,av.id]),rejected);});

test('a failed guarded write leaves no partial row in the same transaction',async()=>{const av=await avatar(),before=(await query('SELECT count(*)::int n FROM uss.stories'))[0].n;
 await assert.rejects(pg.transaction(async tx=>{await tx.query("INSERT INTO uss.stories(slug,title,content_type,body) VALUES($1,'ok','editorial','[]')",[randomUUID()]);await tx.query("INSERT INTO uss.stories(slug,title,content_type,body,cover_media_id) VALUES($1,'bad','editorial','[]',$2)",[randomUUID(),av.id]);}),rejected);
 assert.equal((await query('SELECT count(*)::int n FROM uss.stories'))[0].n,before);});

test('migration 024 upload intents refuse avatar keys and keep history',async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0].id;
 const insert=key=>query("INSERT INTO uss.media_upload_intents(id,actor_account_id,storage_provider,storage_key,mime_type,declared_bytes,original_filename,alt_text,visibility,expires_at) VALUES($1,$2,'fake',$3,'image/png',10,'a.png','Alt','public',now()+interval '10 minutes') RETURNING id",[randomUUID(),a,key]);
 await assert.rejects(insert('member-avatars/x.png'),e=>e.code==='23514');
 const [row]=await insert('uss-media/'+randomUUID()+'.png');
 await assert.rejects(query('DELETE FROM uss.media_upload_intents WHERE id=$1',[row.id]),e=>e.code==='23514');
 await assert.rejects(query("UPDATE uss.media_upload_intents SET storage_key='uss-media/other.png' WHERE id=$1",[row.id]),e=>e.code==='23514');});
