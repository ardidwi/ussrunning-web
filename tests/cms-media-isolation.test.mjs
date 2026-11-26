// P1 hotfix: CMS media references and serializers must never reach purpose='member_avatar' assets.
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
const sql={query:(text,params=[])=>({text,params}),transaction:(statements,opts)=>{assert.equal(opts.isolationLevel,'ReadCommitted');return pg.transaction(async tx=>{const rows=[];for(const s of statements)rows.push((await tx.query(s.text,s.params)).rows);return rows;});}};
// A storage adapter that would sign anything: the isolation must hold even when signing is possible.
const signed=[];
const storage={id:'fake-s3',put:async()=>{},deliveryUrl:async key=>{signed.push(key);return `https://signed.example.com/${key}?sig=test`;}};
const modules=new Map();
function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s==='@/lib/media/storage/neon-s3-provider'||s==='./storage/neon-s3-provider')return{createConfiguredStorage:()=>storage};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
before(async()=>{await migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url)));await query("INSERT INTO uss.story_content_types(code,name) VALUES('editorial','Editorial') ON CONFLICT DO NOTHING");});
after(async()=>pg.close());

const stories=load('lib/stories/story-actions.ts'),galleries=load('lib/gallery/gallery-actions.ts'),partners=load('lib/partners/partner-actions.ts'),site=load('lib/site-content/site-actions.ts'),events=load('lib/events/event-actions.ts');
const mediaService=load('lib/media/media-service.ts'),avatarStorage=load('lib/member/avatar-storage.ts'),identity=load('lib/member/identity-repository.ts');
const defaults=load('lib/site-content/site-defaults.ts').SITE_DEFAULTS;
const admin=async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING *",[randomUUID(),randomUUID()+'@example.com']))[0];for(const role of ['admin','super_admin'])await query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2',[a.id,role]);current={id:a.id,status:a.status,emailVerifiedAt:a.email_verified_at,email:a.email};return current;};
const cms=async(visibility='private')=>(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size,width,height,visibility) VALUES('fake-s3',$1,'image/png',100,3,2,$2) RETURNING id",['cms/'+randomUUID()+'.png',visibility]))[0].id;
// A real member avatar: private, purpose='member_avatar', owned by a member account.
const avatar=async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0];const id=randomUUID(),key='member-avatars/'+id+'.webp';await query("INSERT INTO uss.member_profiles(account_id,full_name,phone,emergency_contact_name,emergency_contact_phone) VALUES($1,'Synthetic Runner','+12025550100','Synthetic Contact','+12025550101')",[a.id]);await query("INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose) VALUES($1,'fake-s3',$2,'image/webp',100,512,512,$3,'member_avatar')",[id,key,a.id]);await query("UPDATE uss.member_profiles SET avatar_status='approved',avatar_media_id=$2 WHERE account_id=$1",[a.id,id]);return {account:a.id,id,key};};
const good=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const audits=async()=>(await query('SELECT count(*)::int n FROM uss.audit_logs'))[0].n;
const urls=value=>JSON.stringify(value).match(/https:\/\/signed\.example\.com\/[^"?]+/g)??[];

test('story cover: avatar rejected exactly like an unknown media id', async()=>{await admin();const a=await avatar();
 const base={title:'Isolation '+randomUUID(),body:['Body'],contentType:'editorial',visibility:'private'};
 const unknown=await stories.createStory({...base,coverMediaId:randomUUID()}),n=await audits();
 assert.deepEqual(await stories.createStory({...base,coverMediaId:a.id}),unknown);assert.equal(unknown.code,'STORY_MEDIA_INVALID');assert.equal(await audits(),n);
 const s=good(await stories.createStory({...base,coverMediaId:await cms()}));
 assert.deepEqual(await stories.updateStory({id:s.id,expectedVersion:s.version,changes:{coverMediaId:a.id}}),unknown);
 assert.ok(s.cover.url?.startsWith('https://signed.example.com/cms/'),'existing CMS media still signs');});

test('event cover: avatar rejected exactly like an unknown media id', async()=>{await admin();const a=await avatar();
 const input={slug:randomUUID(),title:'Isolation Run',startsAt:'2027-01-10T01:00:00Z',endsAt:'2027-01-10T03:00:00Z',timezone:'Asia/Jakarta',eventType:'community-run',capacity:20};
 const unknown=await events.createManagedEvent({...input,coverMediaId:randomUUID()});assert.equal(unknown.code,'EVENT_MEDIA_NOT_FOUND');
 assert.deepEqual(await events.createManagedEvent({...input,slug:randomUUID(),coverMediaId:a.id}),unknown);
 const e=good(await events.createManagedEvent({...input,slug:randomUUID(),coverMediaId:await cms()}));
 assert.deepEqual(await events.updateManagedEvent({id:e.id,expectedVersion:e.version,changes:{coverMediaId:a.id}}),unknown);
 assert.equal((await query('SELECT cover_media_id FROM uss.events WHERE id=$1',[e.id]))[0].cover_media_id===a.id,false);});

test('gallery cover and items: avatar rejected, transaction rolled back, existing media works', async()=>{await admin();const a=await avatar();
 const base={title:'Isolation '+randomUUID(),visibility:'private'};
 const unknown=await galleries.createGallery({...base,coverMediaId:randomUUID()});assert.equal(unknown.code,'GALLERY_MEDIA_INVALID');
 const rows=(await query('SELECT count(*)::int n FROM uss.galleries'))[0].n,n=await audits();
 assert.deepEqual(await galleries.createGallery({...base,coverMediaId:a.id}),unknown);
 assert.equal((await query('SELECT count(*)::int n FROM uss.galleries'))[0].n,rows);assert.equal(await audits(),n);
 const g=good(await galleries.createGallery({...base,coverMediaId:await cms()}));
 assert.deepEqual(await galleries.updateGallery({id:g.id,expectedVersion:g.version,changes:{coverMediaId:a.id}}),unknown);
 assert.deepEqual(await galleries.addGalleryItem({id:g.id,expectedVersion:g.version,mediaAssetId:a.id}),unknown);
 assert.equal((await query('SELECT count(*)::int n FROM uss.gallery_items WHERE gallery_id=$1',[g.id]))[0].n,0);
 good(await galleries.addGalleryItem({id:g.id,expectedVersion:g.version,mediaAssetId:await cms()}));
 const items=good(await galleries.listManagedGalleryItems({id:g.id}));assert.equal(items.items.length,1);assert.ok(items.items[0].media.url.startsWith('https://signed.example.com/cms/'));});

test('partner logo: avatar rejected exactly like an unknown media id', async()=>{await admin();const a=await avatar();
 const base={name:'Isolation '+randomUUID(),description:'Brand',websiteUrl:'https://example.com/brand',type:'partner',visibility:'private',isGlobal:true};
 const unknown=await partners.createPartner({...base,logoMediaId:randomUUID()});assert.equal(unknown.code,'PARTNER_MEDIA_INVALID');
 const n=await audits();assert.deepEqual(await partners.createPartner({...base,logoMediaId:a.id}),unknown);assert.equal(await audits(),n);
 const p=good(await partners.createPartner({...base,logoMediaId:await cms()}));
 assert.deepEqual(await partners.updatePartner({id:p.id,expectedVersion:p.version,changes:{logoMediaId:a.id}}),unknown);
 assert.ok(p.logo.url.startsWith('https://signed.example.com/cms/'));});

test('site content media: avatar rejected exactly like an unknown media id', async()=>{await admin();const a=await avatar();
 const payload=(id)=>({...JSON.parse(JSON.stringify(defaults['login.visual'])),desktopMediaId:id});
 await query("DELETE FROM uss.site_content_revisions WHERE site_content_id IN (SELECT id FROM uss.site_content WHERE key='login.visual')");await query("DELETE FROM uss.site_content WHERE key='login.visual'");
 const unknown=await site.createSiteContentDraft({key:'login.visual',payload:payload(randomUUID())});assert.equal(unknown.code,'SITE_CONTENT_INVALID_REFERENCE');
 const n=await audits();assert.deepEqual(await site.createSiteContentDraft({key:'login.visual',payload:payload(a.id)}),unknown);assert.equal(await audits(),n);
 const r=good(await site.createSiteContentDraft({key:'login.visual',payload:payload(await cms())}));
 assert.deepEqual(await site.updateSiteContentDraft({key:r.key,expectedVersion:r.version,payload:payload(a.id)}),unknown);
 assert.equal(urls(good(await site.getManagedSiteContent({key:'login.visual'}))).every(u=>u.includes('/cms/')),true);});

test('legacy rows pointing at an avatar never yield a signed avatar URL', async()=>{await admin();const a=await avatar();
 const s=good(await stories.createStory({title:'Legacy '+randomUUID(),body:['Body'],contentType:'editorial',visibility:'private',coverMediaId:await cms()}));
 const g=good(await galleries.createGallery({title:'Legacy '+randomUUID(),visibility:'private',coverMediaId:await cms()}));
 // Simulate data written before the hotfix (bypasses application validation).
 await query('UPDATE uss.stories SET cover_media_id=$2 WHERE id=$1',[s.id,a.id]);await query('UPDATE uss.galleries SET cover_media_id=$2 WHERE id=$1',[g.id,a.id]);
 await query('INSERT INTO uss.gallery_items(gallery_id,media_asset_id,sort_order) VALUES($1,$2,1)',[g.id,a.id]);
 signed.length=0;
 const managed=[good(await stories.getManagedStory({id:s.id})),good(await galleries.getManagedGallery({id:g.id})),good(await galleries.listManagedGalleryItems({id:g.id}))];
 for(const value of managed){assert.equal(JSON.stringify(value).includes(a.key),false);assert.equal(JSON.stringify(value).includes(a.id)&&urls(value).length>0&&urls(value).some(u=>u.includes('member-avatars/')),false);}
 assert.equal(signed.some(k=>k.startsWith('member-avatars/')),false);
 assert.equal(managed[0].cover,null);assert.equal(managed[2].items.length,0);});

test('CMS serializer never returns a URL for an avatar record; CMS records still resolve', async()=>{
 const record=(purpose,key)=>({id:randomUUID(),storageKey:key,storageProvider:'fake-s3',publicUrl:null,purpose,mimeType:'image/webp',sizeBytes:1,width:1,height:1,altText:null,caption:null,status:'active',visibility:'private',version:1,createdAt:'',updatedAt:''});
 signed.length=0;
 const av=await mediaService.resolveMediaAsset(record('member_avatar','member-avatars/x.webp'));assert.equal(av.url,null);assert.equal(av.deliveryAvailable,false);assert.equal('storageKey' in av||'purpose' in av,false);
 assert.equal((await mediaService.resolveMediaAsset(record('cms','member-avatars/y.webp'))).url,null,'avatar key prefix is refused even if mislabelled');
 assert.equal((await mediaService.resolveMediaAsset(record(undefined,'cms/z.png'))).url,null,'unknown purpose fails closed');
 assert.equal(signed.length,0);
 assert.ok((await mediaService.resolveMediaAsset(record('cms','cms/ok.png'))).url.startsWith('https://signed.example.com/cms/'));
 await admin();await assert.rejects(Promise.resolve().then(async()=>{const r=await mediaService.getMediaAsset({id:(await avatar()).id});if(r.ok===false)throw Error(r.code);return r;}));});

test('scanner lookup still returns the signed member photo through avatar storage', async()=>{const a=await avatar();
 const rows=await query(`SELECT ${identity.avatarSql} avatar FROM uss.media_assets m WHERE m.id=$1`,[a.id]);
 const photo=await avatarStorage.signedAvatar(rows[0].avatar,storage);
 assert.ok(photo?.url.startsWith('https://signed.example.com/member-avatars/'));assert.equal(photo.id,a.id);});
