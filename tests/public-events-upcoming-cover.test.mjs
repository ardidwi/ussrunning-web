// Public events: server-side "starts after now" filter and the public CMS cover (purpose='cms' only, never member_avatar).
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
let current=null;const signed=[];
const query=async(text,params=[])=>(await pg.query(text,params)).rows;
const sql={query:(text,params=[])=>({text,params}),transaction:(statements)=>pg.transaction(async tx=>{const rows=[];for(const s of statements)rows.push((await tx.query(s.text,s.params)).rows);return rows;})};
const storage={id:'fake-s3',put:async()=>{},deliveryUrl:async(key,visibility)=>{signed.push(key);return visibility==='public'?`https://cdn.example.com/${key}`:`https://signed.example.com/${key}?sig=test`;}};
const modules=new Map();function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s==='@/lib/media/storage/neon-s3-provider'||s==='./storage/neon-s3-provider')return{createConfiguredStorage:()=>storage};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
before(async()=>migrate({query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})},await loadMigrations(new URL('../database/migrations/',import.meta.url))));after(async()=>pg.close());
const events=load('lib/events/event-actions.ts');
const good=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const type='upcoming-'+randomUUID().slice(0,8);
const insert=async(patch={})=>{const e=(await query("INSERT INTO uss.events(slug,title,starts_at,ends_at,status,visibility,event_type) VALUES($1,'Run',$2,$3,$4,$5,$6) RETURNING *",[randomUUID(),patch.starts??new Date(Date.now()+86400000).toISOString(),patch.ends??null,patch.status??'registration_open',patch.visibility??'public',patch.type??type]))[0];return e;};
const media=async(patch={})=>(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size,width,height,visibility,purpose,uploaded_by,alt_text,status) VALUES('fake-s3',$1,'image/png',100,1600,900,$2,$3,$4,'Runners at dawn',$5) RETURNING id",[patch.key??'cms/'+randomUUID()+'.png',patch.visibility??'public',patch.purpose??'cms',patch.uploadedBy??null,patch.status??'active']))[0].id;
const avatar=async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0];return media({key:'member-avatars/'+randomUUID()+'.webp',visibility:'private',purpose:'member_avatar',uploadedBy:a.id});};

test('upcoming filter is server-side: only attendable events starting after now, ordered and bounded',async()=>{
 const past=await insert({starts:new Date(Date.now()-3600000).toISOString(),ends:new Date(Date.now()+3600000).toISOString()});
 const soon=await insert({starts:new Date(Date.now()+60000).toISOString()}),later=await insert({starts:new Date(Date.now()+172800000).toISOString(),status:'published'});
 await insert({status:'cancelled'});await insert({status:'completed'});await insert({visibility:'private'});await insert({status:'draft'});await insert({visibility:'members_only'});
 const all=good(await events.getPublicEventList({eventType:type,limit:50}));assert.ok(all.items.some(e=>e.id===past.id),'unfiltered list still includes history');
 const up=good(await events.getPublicEventList({eventType:type,limit:50,upcoming:true}));assert.deepEqual(up.items.map(e=>e.id),[soon.id,later.id]);
 const page=good(await events.getPublicEventList({eventType:type,limit:1,upcoming:true}));assert.deepEqual(page.items.map(e=>e.id),[soon.id]);assert.ok(page.nextCursor);
 const next=good(await events.getPublicEventList({eventType:type,limit:1,upcoming:true,cursor:page.nextCursor}));assert.deepEqual(next.items.map(e=>e.id),[later.id]);
 assert.equal((await events.getPublicEventList({eventType:type,limit:1,cursor:page.nextCursor})).code,'EVENT_VALIDATION_ERROR','cursor is bound to the upcoming filter');
 for(const bad of ['true',1,null])assert.equal((await events.getPublicEventList({upcoming:bad})).code,'EVENT_VALIDATION_ERROR');});

test('upcoming boundary is timezone-correct: instant comparison ignores display timezone',async()=>{const t=type+'-tz';
 // Starts 30 minutes from now; in Pacific/Kiritimati (UTC+14) the local date is already "tomorrow", in Pacific/Pago_Pago (UTC-11) "yesterday".
 const starts=new Date(Date.now()+1800000).toISOString(),startedAgo=new Date(Date.now()-60000).toISOString();
 const a=(await query("INSERT INTO uss.events(slug,title,starts_at,status,timezone,event_type) VALUES($1,'TZ',$2,'registration_open','Pacific/Kiritimati',$3) RETURNING id",[randomUUID(),starts,t]))[0];
 const b=(await query("INSERT INTO uss.events(slug,title,starts_at,status,timezone,event_type) VALUES($1,'TZ',$2,'registration_open','Pacific/Pago_Pago',$3) RETURNING id",[randomUUID(),starts,t]))[0];
 await query("INSERT INTO uss.events(slug,title,starts_at,status,timezone,event_type) VALUES($1,'TZ',$2,'registration_open','Pacific/Kiritimati',$3)",[randomUUID(),startedAgo,t]);
 const ids=good(await events.getPublicEventList({eventType:t,upcoming:true})).items.map(e=>e.id).sort();assert.deepEqual(ids,[a.id,b.id].sort());
 const src=readFileSync('lib/events/event-repository.ts','utf8');assert.match(src,/e\.starts_at>clock_timestamp\(\)/);});

test('public cover resolves only active public CMS media',async()=>{const t=type+'-cover';
 const cms=await media(),e=await insert({type:t});await query('UPDATE uss.events SET cover_media_id=$2 WHERE id=$1',[e.id,cms]);
 const detail=good(await events.getPublicEventDetail(e.slug));assert.ok(detail.cover.url.startsWith('https://cdn.example.com/cms/'));assert.equal(detail.cover.altText,'Runners at dawn');assert.equal(detail.cover.width,1600);
 for(const k of ['storageKey','storageProvider','purpose','id','publicUrl'])assert.ok(!(k in detail.cover),k);assert.ok(!('coverMediaId' in detail));
 const listed=good(await events.getPublicEventList({eventType:t})).items[0];assert.equal(listed.cover.url,detail.cover.url);
 for(const patch of [{visibility:'private'},{status:'archived'}]){const id=await media(patch),x=await insert({type:t+'-x'});await query('UPDATE uss.events SET cover_media_id=$2 WHERE id=$1',[x.id,id]);assert.equal(good(await events.getPublicEventDetail(x.slug)).cover,null,JSON.stringify(patch));}
 const none=await insert({type:t+'-none'});assert.equal(good(await events.getPublicEventDetail(none.slug)).cover,null);});

test('legacy event row pointing at a member avatar never exposes or signs it publicly',async()=>{const av=await avatar(),e=await insert({type:type+'-legacy'});
 // Bypass application validation to simulate pre-hotfix data.
 await query('UPDATE uss.events SET cover_media_id=$2 WHERE id=$1',[e.id,av]);signed.length=0;
 const detail=good(await events.getPublicEventDetail(e.slug)),list=good(await events.getPublicEventList({eventType:type+'-legacy'}));
 assert.equal(detail.cover,null);assert.equal(list.items[0].cover,null);assert.equal(signed.some(k=>k.startsWith('member-avatars/')),false);assert.ok(!JSON.stringify([detail,list]).includes(av));});

test('managed writes still reject avatar covers (purpose guard unchanged)',async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING *",[randomUUID(),randomUUID()+'@example.com']))[0];await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code='admin'",[a.id]);current={id:a.id,status:a.status,emailVerifiedAt:a.email_verified_at,email:a.email};
 const r=await events.createManagedEvent({slug:randomUUID(),title:'Guard',startsAt:'2027-01-10T01:00:00Z',timezone:'Asia/Jakarta',coverMediaId:await avatar()});assert.equal(r.code,'EVENT_MEDIA_NOT_FOUND');
 const managed=good(await events.getManagedEventList({limit:5}));assert.ok(managed.items.every(e=>!('cover' in e)),'managed DTO unchanged');current=null;});
