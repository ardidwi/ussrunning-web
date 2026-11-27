// D3.1 presigned direct-to-storage upload + server-side finalisation. Storage is always mocked.
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
let current=null,race=null,failDb=false;
const query=async(text,params=[])=>{if(failDb)throw Error('PRIVATE SQL');return(await pg.query(text,params)).rows;};
const sql={query:(text,params=[])=>({text,params}),transaction:(statements,opts)=>{assert.equal(opts.isolationLevel,'ReadCommitted');if(failDb)throw Error('PRIVATE SQL');return pg.transaction(async tx=>{const results=[];for(let i=0;i<statements.length;i++){if(i===4&&race){const fn=race;race=null;await fn(tx);}results.push((await tx.query(statements[i].text,statements[i].params)).rows);}return results;});}};
const modules=new Map();function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
before(async()=>migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url))));after(async()=>pg.close());
const member=async(status='active',role='member')=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() END) RETURNING *",[randomUUID(),randomUUID()+'@example.com',status]))[0];await query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2',[a.id,role]);return {id:a.id,status:a.status,emailVerifiedAt:a.email_verified_at,email:a.email};};
const sharp=require('sharp'),mediaModule=load('lib/media/media-service.ts');

/** S3-shaped fake: records every call, holds objects in memory and lets a test act as the browser PUT. */
function fakeStorage(){const objects=new Map(),calls=[];return{id:'fake-s3',objects,calls,
 async put(){throw Error('direct put not used by presigned flow');},
 async deliveryUrl(key,visibility){return visibility==='public'?`https://cdn.example.test/${key}`:null;},
 async presignPut(key,mime,bytes,visibility,ttl){calls.push(['presign',key,mime,bytes,visibility,ttl]);return{url:`https://upload.example.test/${key}?X-Amz-Signature=fake`,headers:{'Content-Type':mime}};},
 async readObject(key,visibility,max){calls.push(['read',key,visibility]);const b=objects.get(key);if(!b)return null;return{size:b.length,bytes:b.length>max?null:Uint8Array.from(b)};},
 async deleteObject(key,visibility){calls.push(['delete',key,visibility]);objects.delete(key);},
 browserPut(ticket,bytes){objects.set(new URL(ticket.uploadUrl).pathname.slice(1),Uint8Array.from(bytes));}};}
const image=async(format='png',width=4,height=3)=>sharp({create:{width,height,channels:3,background:'#ed2024'}}).toFormat(format).toBuffer();
const request=(bytes,o={})=>({filename:'Crew.png',mimeType:'image/png',sizeBytes:bytes.length,altText:'Crew at the start line',visibility:'public',...o});
const admin=async()=>{current=await member('active','admin');return current;};
const fails=(promise,code)=>assert.rejects(promise,e=>e.code===code);
const intent=async id=>(await query('SELECT * FROM uss.media_upload_intents WHERE id=$1',[id]))[0];
const assets=async id=>(await query('SELECT count(*)::int n FROM uss.media_assets WHERE id=$1',[id]))[0].n;

test('happy path: presign returns server-owned key, finalize re-validates and creates a CMS asset',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),bytes=await image();
 const t=await media.requestMediaUpload(request(bytes));assert.equal(t.method,'PUT');assert.match(t.uploadUrl,/^https:\/\/upload\.example\.test\/uss-media\/[0-9a-f-]{36}\.png\?/);assert.equal(t.headers['Content-Type'],'image/png');assert.ok(Date.parse(t.expiresAt)>Date.now());
 assert.deepEqual(s.calls[0].slice(2,6),['image/png',bytes.length,'public',600]);
 s.browserPut(t,bytes);const a=await media.finalizeMediaUpload({uploadId:t.uploadId});
 assert.equal(a.id,t.uploadId);assert.equal(a.width,4);assert.equal(a.height,3);assert.equal(a.sizeBytes,bytes.length);assert.equal(a.altText,'Crew at the start line');assert.ok(!('originalFilename'in a),'filenames are search-only, never serialized');assert.ok(a.url.startsWith('https://cdn.example.test/uss-media/'));
 const row=(await query('SELECT purpose,uploaded_by,checksum_sha256 FROM uss.media_assets WHERE id=$1',[a.id]))[0];assert.equal(row.purpose,'cms');assert.equal(row.uploaded_by,current.id);assert.match(row.checksum_sha256,/^[0-9a-f]{64}$/);
 assert.equal((await intent(t.uploadId)).status,'finalized');
 const audit=await query("SELECT action FROM uss.audit_logs WHERE entity_id=$1 ORDER BY created_at",[a.id]);assert.deepEqual(audit.map(x=>x.action),['media.upload.requested','media.created']);});

test('finalize is idempotent and never creates a second asset',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),bytes=await image('webp');const t=await media.requestMediaUpload(request(bytes,{mimeType:'image/webp',filename:'a.webp'}));s.browserPut(t,bytes);
 const [a,b]=await Promise.all([media.finalizeMediaUpload({uploadId:t.uploadId}),media.finalizeMediaUpload({uploadId:t.uploadId})]);assert.equal(a.id,b.id);assert.equal(await assets(t.uploadId),1);});

test('declared metadata validated before any storage call: MIME, size, alt text, filename, unknown keys',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),bytes=await image();
 for(const mimeType of ['image/svg+xml','text/html','image/gif'])await fails(media.requestMediaUpload(request(bytes,{mimeType})),'MEDIA_UNSUPPORTED_TYPE');
 await fails(media.requestMediaUpload(request(bytes,{sizeBytes:10485761})),'MEDIA_TOO_LARGE');
 for(const sizeBytes of [0,-1,1.5,'10'])await fails(media.requestMediaUpload(request(bytes,{sizeBytes})),'MEDIA_INVALID_CONTENT');
 for(const altText of ['','   ',null,undefined])await fails(media.requestMediaUpload(request(bytes,{altText})),'MEDIA_ALT_REQUIRED');
 for(const filename of ['../x.png','a/b.png','C:\\x.png'])await fails(media.requestMediaUpload(request(bytes,{filename})),'MEDIA_VALIDATION_ERROR');
 for(const extra of [{storageKey:'member-avatars/x.png'},{bucket:'other'},{purpose:'member_avatar'},{bytes:[1]}])await fails(media.requestMediaUpload({...request(bytes),...extra}),'MEDIA_VALIDATION_ERROR');
 await fails(media.requestMediaUpload(request(bytes,{altText:'<script>'})),'MEDIA_VALIDATION_ERROR');
 assert.equal(s.calls.length,0);});

test('magic-byte mismatch after upload is rejected and the object deleted',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),jpeg=await image('jpeg');
 const t=await media.requestMediaUpload(request(jpeg,{mimeType:'image/png'}));s.browserPut(t,jpeg);
 await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_INVALID_CONTENT');
 assert.equal(s.objects.size,0);assert.ok(s.calls.some(c=>c[0]==='delete'));const i=await intent(t.uploadId);assert.equal(i.status,'rejected');assert.equal(i.rejection_code,'MEDIA_INVALID_CONTENT');assert.equal(await assets(t.uploadId),0);
 await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_CONFLICT');});

test('HTML disguised as PNG, truncated images and size drift are rejected and deleted',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();
 const cases=[[Buffer.from('<html><script>alert(1)</script></html>'),'MEDIA_INVALID_CONTENT'],[png.subarray(0,30),'MEDIA_INVALID_CONTENT']];
 for(const [bytes,code]of cases){const t=await media.requestMediaUpload(request(bytes));s.browserPut(t,bytes);await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),code);assert.equal(s.objects.size,0);}
 const t=await media.requestMediaUpload(request(png));s.browserPut(t,Buffer.concat([png,Buffer.alloc(16)]));await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_INVALID_CONTENT');assert.equal(s.objects.size,0);});

test('oversized stored object rejected without buffering it, dimensions re-checked from decoded pixels',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();
 const t=await media.requestMediaUpload(request(png));s.browserPut(t,Buffer.alloc(10485761,1));await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_TOO_LARGE');assert.equal(s.objects.size,0);
 const big=await image('png',40,30),u=await media.requestMediaUpload(request(big));s.browserPut(u,big);process.env.MEDIA_MAX_DIMENSION='20';try{await fails(media.finalizeMediaUpload({uploadId:u.uploadId}),'MEDIA_INVALID_DIMENSIONS');}finally{delete process.env.MEDIA_MAX_DIMENSION;}assert.equal((await intent(u.uploadId)).rejection_code,'MEDIA_INVALID_DIMENSIONS');});

test('missing object keeps the intent pending so the browser can retry the PUT',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();const t=await media.requestMediaUpload(request(png));
 await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_UPLOAD_INCOMPLETE');assert.equal((await intent(t.uploadId)).status,'pending');s.browserPut(t,png);assert.equal((await media.finalizeMediaUpload({uploadId:t.uploadId})).id,t.uploadId);});

test('expired intent is rejected and its object discarded',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();const t=await media.requestMediaUpload(request(png));s.browserPut(t,png);
 await query("UPDATE uss.media_upload_intents SET expires_at=created_at+interval '1 microsecond' WHERE id=$1",[t.uploadId]);
 await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_UPLOAD_EXPIRED');assert.equal(s.objects.size,0);assert.equal((await intent(t.uploadId)).status,'rejected');});

test('authorization: unauthenticated, member, inactive staff and another admin cannot request or finalize',async()=>{const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();
 current=null;await fails(media.requestMediaUpload(request(png)),'UNAUTHENTICATED');
 current=await member();await fails(media.requestMediaUpload(request(png)),'MEDIA_FORBIDDEN');
 for(const [status,code]of [['pending_verification','EMAIL_NOT_VERIFIED'],['suspended','ACCOUNT_SUSPENDED']]){current=await member(status,'admin');await fails(media.requestMediaUpload(request(png)),code);}
 await admin();const t=await media.requestMediaUpload(request(png));s.browserPut(t,png);
 await admin();await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_NOT_FOUND');
 current=await member();await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_FORBIDDEN');
 await admin();await fails(media.finalizeMediaUpload({uploadId:'nope'}),'MEDIA_VALIDATION_ERROR');await fails(media.finalizeMediaUpload({uploadId:randomUUID()}),'MEDIA_NOT_FOUND');});

test('role revoked between read and finalize commits nothing',async()=>{const owner=await admin(),s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();const t=await media.requestMediaUpload(request(png));s.browserPut(t,png);
 race=tx=>tx.query('DELETE FROM uss.account_roles WHERE account_id=$1',[owner.id]);await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_FORBIDDEN');assert.equal(await assets(t.uploadId),0);assert.equal((await intent(t.uploadId)).status,'pending');});

test('presign shares the DB upload rate limit with direct uploads',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();process.env.MEDIA_UPLOAD_MAX_REQUESTS='2';
 try{await media.requestMediaUpload(request(png));await media.requestMediaUpload(request(png));await fails(media.requestMediaUpload(request(png)),'MEDIA_RATE_LIMITED');}finally{delete process.env.MEDIA_UPLOAD_MAX_REQUESTS;}
 assert.equal(s.calls.filter(c=>c[0]==='presign').length,2);});

test('storage without presign support and provider failures fail closed and sanitized',async()=>{await admin();const png=await image();
 await fails(mediaModule.requestMediaUpload(request(png)),'MEDIA_STORAGE_UNAVAILABLE');
 const s=fakeStorage();s.presignPut=async()=>{throw Error('SECRET KEY AKIA');};await fails(mediaModule.createMediaService(s).requestMediaUpload(request(png)),'MEDIA_STORAGE_UNAVAILABLE');
 const r=fakeStorage(),media=mediaModule.createMediaService(r);const t=await media.requestMediaUpload(request(png));r.readObject=async()=>{throw Error('SECRET');};await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_STORAGE_UNAVAILABLE');
 failDb=true;try{await fails(media.finalizeMediaUpload({uploadId:t.uploadId}),'MEDIA_UNAVAILABLE');}finally{failDb=false;}});

test('library search/filter, usage counts and used-where details',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();
 const t=await media.requestMediaUpload(request(png,{altText:'Sunrise 100%_unique crew',filename:'sunrise.png'}));s.browserPut(t,png);const a=await media.finalizeMediaUpload({uploadId:t.uploadId});
 await query("INSERT INTO uss.story_content_types(code,name) VALUES('editorial','Editorial') ON CONFLICT DO NOTHING");
 await query("INSERT INTO uss.stories(slug,title,content_type,body,cover_media_id) VALUES($1,'Cover story','editorial','[]',$2)",[randomUUID(),a.id]);
 await query("INSERT INTO uss.stories(slug,title,content_type,body) VALUES($1,'Body story','editorial',$2::jsonb)",[randomUUID(),JSON.stringify([{type:'image',mediaId:a.id,alt:'x'}])]);
 await query("INSERT INTO uss.events(slug,title,starts_at,cover_media_id) VALUES($1,'Night Run',now(),$2)",[randomUUID(),a.id]);
 const page=await media.listMediaLibrary({q:'100%_unique'});assert.equal(page.items.length,1);assert.equal(page.items[0].id,a.id);assert.equal(page.items[0].usageCount,3);
 assert.equal((await media.listMediaLibrary({q:'100%x'})).items.length,0,'wildcards are literal');
 assert.equal((await media.listMediaLibrary({q:'sunrise',mime:'image/webp'})).items.length,0);
 await assert.rejects(media.listMediaLibrary({mime:'image/svg+xml'}),e=>e.code==='MEDIA_VALIDATION_ERROR');
 const used=await media.getMediaUsage({id:a.id});assert.deepEqual(used.map(u=>`${u.kind}:${u.role}:${u.label}`).sort(),['event:cover:Night Run','story:body:Body story','story:cover:Cover story']);
 for(const u of used)assert.ok(!('mediaId'in u));
 current=await member();await fails(media.getMediaUsage({id:a.id}),'MEDIA_FORBIDDEN');await fails(media.listMediaLibrary(),'MEDIA_FORBIDDEN');});

test('library cursor is bound to search filters',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();for(let i=0;i<3;i++){const t=await media.requestMediaUpload(request(png,{altText:'Paged crew '+i}));s.browserPut(t,png);await media.finalizeMediaUpload({uploadId:t.uploadId});}
 const p=await media.listMediaLibrary({q:'Paged crew',limit:2});assert.equal(p.items.length,2);assert.ok(p.nextCursor);const q=await media.listMediaLibrary({q:'Paged crew',limit:2,cursor:p.nextCursor});assert.equal(q.items.length,1);
 await fails(media.listMediaLibrary({q:'other',cursor:p.nextCursor}),'MEDIA_VALIDATION_ERROR');});

test('alt text cannot be cleared once set',async()=>{await admin();const s=fakeStorage(),media=mediaModule.createMediaService(s),png=await image();const t=await media.requestMediaUpload(request(png));s.browserPut(t,png);const a=await media.finalizeMediaUpload({uploadId:t.uploadId});
 for(const altText of ['',null,'  '])await fails(media.updateMediaMetadata({id:a.id,expectedVersion:a.version,altText}),'MEDIA_ALT_REQUIRED');
 assert.equal((await media.updateMediaMetadata({id:a.id,expectedVersion:a.version,altText:'Updated alt'})).altText,'Updated alt');});

test('S3 adapter presigns a single-object PUT bound to type, length and no-overwrite without any network call',async()=>{
 const {NeonS3Storage}=load('lib/media/storage/neon-s3-provider.ts');
 const storage=new NeonS3Storage({endpoint:'https://storage.example.invalid/',region:'us-east-1',accessKeyId:'AKIDEXAMPLE',secretAccessKey:'example-secret-not-real',publicBucket:'uss-public',privateBucket:'uss-private',privateUrlTtlSeconds:300});
 const r=await storage.presignPut('uss-media/abc.png','image/png',1234,'public',600),u=new URL(r.url);
 assert.equal(u.pathname,'/uss-public/uss-media/abc.png');assert.equal(u.searchParams.get('X-Amz-Expires'),'600');
 const signed=u.searchParams.get('X-Amz-SignedHeaders').split(';');for(const h of ['content-type','content-length','if-none-match'])assert.ok(signed.includes(h),h);
 assert.ok(!r.url.includes('example-secret-not-real'));assert.equal(r.headers['Content-Type'],'image/png');
 await assert.rejects(storage.presignPut('member-avatars/../x.png','image/png',1,'public',600),e=>e.code==='MEDIA_INVALID_CONTENT');
 const priv=new URL((await storage.presignPut('uss-media/def.webp','image/webp',10,'private',5000)).url);assert.equal(priv.pathname,'/uss-private/uss-media/def.webp');assert.equal(priv.searchParams.get('X-Amz-Expires'),'900');});
