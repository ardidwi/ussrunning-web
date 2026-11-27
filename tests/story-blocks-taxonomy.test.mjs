// D3.3 block schema + legacy conversion, D3.5 taxonomy/bylines, public category DTO/filter. Harness mirrors stories-editorial.
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
let current=null,race=null,failDb=false,queryCount=0;const traces=[];
const query=async(text,params=[])=>{queryCount++;if(failDb)throw Error('PRIVATE EMAIL TOKEN SQL');return(await pg.query(text,params)).rows;};
const sql={query:(text,params=[])=>({text,params}),transaction:(statements,opts)=>{assert.equal(opts.isolationLevel,'ReadCommitted');if(failDb)throw Error('PRIVATE EMAIL TOKEN SQL');traces.push(statements);return pg.transaction(async tx=>{const results=[];for(let i=0;i<statements.length;i++){if(i===4&&race){const fn=race;race=null;await fn(tx);}results.push((await tx.query(statements[i].text,statements[i].params)).rows);}return results;});}};
const modules=new Map();function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query,getSql:()=>sql};if(s==='./account-provisioning')return{getCurrentAccount:async()=>current};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const migrations=await loadMigrations(new URL('../database/migrations/',import.meta.url));
const adapter={query,transaction:s=>pg.transaction(async tx=>{for(const q of s)await tx.query(q.text,q.params);})};
before(async()=>{await migrate(adapter,migrations);await query("INSERT INTO uss.story_content_types(code,name) VALUES('editorial','Editorial')");});after(async()=>pg.close());
const member=async(status='active',role='member')=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() END) RETURNING *",[randomUUID(),randomUUID()+'@example.com',status]))[0];await query('INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2',[a.id,role]);return {id:a.id,status:a.status,emailVerifiedAt:a.email_verified_at,email:a.email};};

const actions=load('lib/stories/story-actions.ts'),service=load('lib/stories/story-service.ts');
const admin=async()=>{current=await member('active','admin');return current;};
const good=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.data;};
const bad=async(p,code)=>{const r=await p;assert.deepEqual(r,{ok:false,code});};
const media=async(visibility='public',status='active')=>(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size,width,height,visibility,status) VALUES('unconfigured',$1,'image/png',100,3,2,$2,$3) RETURNING id",[randomUUID(),visibility,status]))[0].id;
const input=async(overrides={})=>({title:'Jakarta Moves '+randomUUID(),body:['Community in motion.'],contentType:'editorial',visibility:'public',coverMediaId:await media(),...overrides});
const draft=async(overrides={})=>{await admin();return good(await actions.createStory(await input(overrides)));};
const ref=s=>({id:s.id,expectedVersion:s.version});

const blocks=load('lib/stories/story-blocks.ts');
const avatarMedia=async()=>{const a=(await query("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING id",[randomUUID(),randomUUID()+'@example.com']))[0];const id=randomUUID();await query("INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose) VALUES($1,'unconfigured',$2,'image/webp',10,2,2,$3,'member_avatar')",[id,'member-avatars/'+id+'.webp',a.id]);return id;};
const all=async(kind,fields)=>good(await actions.createTaxonomyRecord({kind,fields}));

const cdn=async()=>(await query("INSERT INTO uss.media_assets(storage_provider,storage_key,public_url,mime_type,byte_size,width,height,visibility,alt_text) VALUES('legacy-cdn',$1,$2,'image/png',100,3,2,'public','Library alt') RETURNING id",[randomUUID(),'https://cdn.example.test/'+randomUUID()+'.png']))[0].id;
test('block schema accepts every block type and normalises embeds to canonical allowlisted URLs',async()=>{const img=await cdn(),img2=await cdn();
 const body=[{type:'heading',level:2,text:'Start line'},{type:'paragraph',text:'Crew in motion.'},{type:'image',mediaId:img,alt:'Runners at dawn',caption:'Dawn'},{type:'gallery',items:[{mediaId:img,alt:'A',caption:null},{mediaId:img2,alt:'B',caption:null}]},{type:'quote',text:'Keep moving.',attribution:'Coach'},{type:'embed',url:'https://youtu.be/dQw4w9WgXcQ'},{type:'cta',label:'Join a run',url:'/runs'},{type:'divider'}];
 const s=await draft({body});assert.equal(s.body.length,8);assert.deepEqual(s.body[5],{type:'embed',provider:'youtube',url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});assert.equal(s.bodyMedia.length,2);
 const p=good(await actions.publishStory(ref(s))),d=good(await actions.getPublicStoryBySlug(p.slug));
 assert.deepEqual(d.body.map(b=>b.type),['heading','paragraph','image','gallery','quote','embed','cta','divider']);
 assert.ok(d.body[2].media.url.startsWith('https://cdn.example.test/'));assert.equal(d.body[2].alt,'Runners at dawn');assert.equal(d.body[3].items.length,2);
 assert.ok(!JSON.stringify(d.body).includes('mediaId'),'public blocks never expose media ids');
 const u=await draft({body:[{type:'paragraph',text:'x'},{type:'image',mediaId:await media(),alt:'Undeliverable'}]});good(await actions.publishStory(ref(u)));assert.deepEqual(good(await actions.getPublicStoryBySlug(u.slug)).body.map(b=>b.type),['paragraph'],'undeliverable images are dropped, never rendered broken');assert.ok(!JSON.stringify(d).includes('storageKey'));});

test('invalid blocks are rejected authoritatively',async()=>{await admin();const img=await media();
 const cases=[[{type:'html',html:'<b>x</b>'}],[{type:'paragraph',text:'<script>alert(1)</script>'}],[{type:'paragraph',text:'ok',style:'color:red'}],[{type:'heading',level:1,text:'H1'}],[{type:'image',mediaId:img}],[{type:'image',mediaId:img,alt:'  '}],[{type:'image',mediaId:'../etc',alt:'x'}],[{type:'gallery',items:[{mediaId:img,alt:'one'}]}],[{type:'cta',label:'Go',url:'javascript:alert(1)'}],[{type:'cta',label:'Go',url:'http://example.com'}],[{type:'cta',label:'Go',url:'//evil.example'}],Array(101).fill({type:'divider'})];
 for(const body of cases)await bad(actions.createStory(await input({body})),'STORY_INVALID_CONTENT');});

test('embeds outside the allowlist are refused',async()=>{await admin();for(const url of ['https://evil.example/watch?v=dQw4w9WgXcQ','http://youtube.com/watch?v=dQw4w9WgXcQ','https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ','https://www.youtube.com/watch?v=short','https://user:pw@vimeo.com/123','https://tiktok.com/@x/video/1','javascript:alert(1)','https://open.spotify.com/track/../x'])await bad(actions.createStory(await input({body:[{type:'embed',url}]})),'STORY_INVALID_CONTENT');
 await bad(actions.createStory(await input({body:[{type:'embed',provider:'vimeo',url:'https://youtu.be/dQw4w9WgXcQ'}]})),'STORY_INVALID_CONTENT');
 for(const [url,provider]of [['https://vimeo.com/76979871','vimeo'],['https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC','spotify'],['https://www.instagram.com/p/CODE123/','instagram'],['https://www.strava.com/activities/123456','strava']])assert.equal(blocks.embedTarget(url).provider,provider);
 assert.equal(blocks.embedTarget('https://www.instagram.com/p/CODE123/').frameSrc,null,'no third-party script embeds');});

test('body images must be active CMS media; avatars and unknown ids behave identically',async()=>{await admin();const unknown=await actions.createStory(await input({body:[{type:'image',mediaId:randomUUID(),alt:'x'}]}));assert.deepEqual(unknown,{ok:false,code:'STORY_MEDIA_INVALID'});
 assert.deepEqual(await actions.createStory(await input({body:[{type:'image',mediaId:await avatarMedia(),alt:'x'}]})),unknown);
 await bad(actions.createStory(await input({body:[{type:'image',mediaId:await media('public','archived'),alt:'x'}]})),'STORY_MEDIA_INVALID');
 const s=await draft({body:[{type:'image',mediaId:await media('private'),alt:'Private'}]});await bad(actions.publishStory(ref(s)),'STORY_MEDIA_INVALID');});

test('legacy string bodies convert to paragraph blocks on read without rewriting storage',async()=>{const s=await draft();await query('UPDATE uss.stories SET body=$2::jsonb WHERE id=$1',[s.id,JSON.stringify(['Legacy one','Legacy two'])]);
 const m=good(await actions.getManagedStory({id:s.id}));assert.deepEqual(m.body,[{type:'paragraph',text:'Legacy one'},{type:'paragraph',text:'Legacy two'}]);
 assert.deepEqual((await query('SELECT body FROM uss.stories WHERE id=$1',[s.id]))[0].body,['Legacy one','Legacy two']);
 const u=good(await actions.updateStory({id:s.id,expectedVersion:m.version,changes:{title:'Converted on save'}}));assert.equal((await query('SELECT body FROM uss.stories WHERE id=$1',[u.id]))[0].body[0].type,'paragraph');});

test('taxonomy CRUD is audited, slugs derived and unique, versions enforced',async()=>{await admin();const c=await all('category',{name:'Race Week '+randomUUID().slice(0,6),description:'Before the gun'});assert.match(c.slug,/^race-week-/);assert.equal(c.usageCount,0);
 await bad(actions.createTaxonomyRecord({kind:'category',fields:{name:'Dup',slug:c.slug}}),'STORY_SLUG_TAKEN');
 const u=good(await actions.updateTaxonomyRecord({kind:'category',id:c.id,expectedVersion:c.version,changes:{name:'Renamed'}}));assert.equal(u.version,2);
 await bad(actions.updateTaxonomyRecord({kind:'category',id:c.id,expectedVersion:1,changes:{name:'Stale'}}),'STORY_CONFLICT');
 for(const fields of [{name:'<b>x</b>'},{name:'ok',slug:'Bad Slug'},{name:'ok',role:'admin'},{}])await bad(actions.createTaxonomyRecord({kind:'category',fields}),fields.role||!Object.keys(fields).length?(fields.role?'STORY_INVALID_INPUT':'STORY_INVALID_CONTENT'):'STORY_INVALID_CONTENT');
 await bad(actions.createTaxonomyRecord({kind:'role',fields:{name:'x'}}),'STORY_INVALID_INPUT');
 const audit=await query("SELECT action,change_summary FROM uss.audit_logs WHERE entity_id=$1 ORDER BY created_at",[c.id]);assert.deepEqual(audit.map(a=>a.action),['story_category.created','story_category.updated']);assert.deepEqual(audit[1].change_summary.changedFields,['name']);});

test('a category, tag or byline still in use cannot be deleted; unused ones can',async()=>{await admin();const c=await all('category',{name:'Crew '+randomUUID().slice(0,6)}),t=await all('tag',{name:'Night '+randomUUID().slice(0,6)}),b=await all('byline',{name:'Ayu Pratama',slug:'ayu-'+randomUUID().slice(0,6),roleTitle:'Editor'});
 const s=await draft({categoryId:c.id,tagIds:[t.id],bylineId:b.id});assert.deepEqual(s.tagIds,[t.id]);
 await bad(actions.deleteTaxonomyRecord({kind:'category',id:c.id,expectedVersion:1}),'STORY_TAXONOMY_IN_USE');
 await bad(actions.deleteTaxonomyRecord({kind:'tag',id:t.id,expectedVersion:1}),'STORY_TAXONOMY_IN_USE');
 await bad(actions.deleteTaxonomyRecord({kind:'byline',id:b.id,expectedVersion:1}),'STORY_TAXONOMY_IN_USE');
 good(await actions.archiveStory(ref(s)));await bad(actions.deleteTaxonomyRecord({kind:'category',id:c.id,expectedVersion:1}),'STORY_TAXONOMY_IN_USE','archived stories still count');
 const spare=await all('tag',{name:'Spare '+randomUUID().slice(0,6)});good(await actions.deleteTaxonomyRecord({kind:'tag',id:spare.id,expectedVersion:1}));assert.equal((await query('SELECT count(*)::int n FROM uss.tags WHERE id=$1',[spare.id]))[0].n,0);
 assert.equal((await query("SELECT count(*)::int n FROM uss.audit_logs WHERE entity_id=$1 AND action='story_tag.deleted'",[spare.id]))[0].n,1);});

test('taxonomy management requires CMS permission',async()=>{current=null;await bad(actions.getStoryTaxonomy(),'UNAUTHENTICATED');current=await member();await bad(actions.getStoryTaxonomy(),'STORY_FORBIDDEN');await bad(actions.createTaxonomyRecord({kind:'tag',fields:{name:'x'}}),'STORY_FORBIDDEN');await admin();const l=good(await actions.getStoryTaxonomy());assert.ok(Array.isArray(l.categories)&&Array.isArray(l.tags)&&Array.isArray(l.bylines));});

test('story tags, byline and category flow to the public DTO and the category filter',async()=>{await admin();const c=await all('category',{name:'Filter '+randomUUID().slice(0,6)}),t=await all('tag',{name:'Tempo '+randomUUID().slice(0,6)}),b=await all('byline',{name:'Rani Editor',slug:'rani-'+randomUUID().slice(0,6),roleTitle:'Contributor'});
 const s=await draft({categoryId:c.id,tagIds:[t.id],bylineId:b.id});good(await actions.publishStory(ref(s)));const other=await draft();good(await actions.publishStory(ref(other)));
 current=null;const d=good(await actions.getPublicStoryBySlug(s.slug));assert.deepEqual(d.category,{slug:c.slug,name:c.name});assert.deepEqual(d.tags,[{slug:t.slug,name:t.name}]);assert.deepEqual(d.author,{displayName:'Rani Editor',roleTitle:'Contributor'});
 const l=good(await actions.listPublicStories({category:c.slug}));assert.deepEqual(l.items.map(i=>i.slug),[s.slug]);assert.deepEqual(l.items[0].category,{slug:c.slug,name:c.name});
 await bad(actions.listPublicStories({category:'../x'}),'STORY_INVALID_INPUT');assert.equal(good(await actions.listPublicStories({category:'no-such-category'})).items.length,0);
 await admin();await bad(actions.createStory(await input({tagIds:[randomUUID()]})),'STORY_INVALID_REFERENCE');await bad(actions.createStory(await input({bylineId:randomUUID()})),'STORY_INVALID_REFERENCE');await bad(actions.createStory(await input({tagIds:[t.id,t.id]})),'STORY_INVALID_INPUT');
 const rev=(await query('SELECT snapshot FROM uss.story_revisions WHERE story_id=$1 ORDER BY version',[s.id]))[0].snapshot;assert.deepEqual(rev.tag_ids,[t.id]);assert.equal(rev.byline_id,b.id);});

test('updating tag set replaces it exactly',async()=>{await admin();const a=await all('tag',{name:'A '+randomUUID().slice(0,6)}),b=await all('tag',{name:'B '+randomUUID().slice(0,6)});const s=await draft({tagIds:[a.id]});const u=good(await actions.updateStory({...ref(s),changes:{tagIds:[b.id]}}));assert.deepEqual(u.tagIds,[b.id]);const v=good(await actions.updateStory({...ref(u),changes:{tagIds:[]}}));assert.deepEqual(v.tagIds,[]);});
