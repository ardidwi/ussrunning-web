// Newsletter consent storage moved to uss.newsletter_subscriptions (migration 022) with an idempotent legacy backfill.
import test,{after} from 'node:test';
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
const migrations=await loadMigrations(new URL('../database/migrations/',import.meta.url));
const open=()=>{const db=new PGlite({extensions:{citext,pgcrypto}}),q=async(t,p=[])=>(await db.query(t,p)).rows;return{db,q,adapter:{query:q,transaction:s=>db.transaction(async tx=>{for(const v of s)await tx.query(v.text,v.params);})}};};
const legacy=open(),fresh=open();after(async()=>{await legacy.db.close();await fresh.db.close();});
function loader(q){const modules=new Map();return function load(file){file=resolve(file);if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const req=s=>{if(s==='server-only')return{};if(s==='@/lib/db')return{query:q};if(s.startsWith('@/'))return load(resolve(s.slice(2)+'.ts'));if(s.startsWith('.'))return load(resolve(dirname(file),s+'.ts'));return require(s);};vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(req,m,m.exports);return m.exports;};}

test('migration copies legacy rows idempotently, keeps opt-outs and never invents consent; public table retained',async()=>{const {q,adapter}=legacy;
 await migrate(adapter,migrations.filter(m=>m.version<'022'));
 // Legacy shape as written by the pre-022 footer action (deliberately without created_at).
 await q('CREATE TABLE public.newsletter_subscriptions(email text PRIMARY KEY,status text,consent_version text,consent_at timestamptz,unsubscribed_at timestamptz,source text,updated_at timestamptz)');
 await q(`INSERT INTO public.newsletter_subscriptions VALUES
  ('Runner@Example.com ','subscribed','2026-10-01','2026-10-02T00:00:00Z',NULL,'footer','2026-10-02T00:00:00Z'),
  ('gone@example.com','unsubscribed','2026-10-01','2026-10-02T00:00:00Z','2026-10-05T00:00:00Z','footer','2026-10-05T00:00:00Z'),
  ('half@example.com','subscribed','2026-10-01','2026-10-02T00:00:00Z','2026-10-06T00:00:00Z','footer',NULL),
  ('noconsent@example.com','subscribed',NULL,NULL,NULL,'footer',NULL),
  ('not-an-email','subscribed','2026-10-01','2026-10-02T00:00:00Z',NULL,'footer',NULL),
  ('odd@example.com','subscribed','2026-10-01','2026-10-02T00:00:00Z',NULL,'Footer Form',NULL)`);
 assert.ok((await migrate(adapter,migrations)).executed.length>=1);
 const rows=await q('SELECT email::text,status,unsubscribed_at,source FROM uss.newsletter_subscriptions ORDER BY email');
 assert.deepEqual(rows.map(r=>[r.email,r.status,r.source]),[['gone@example.com','unsubscribed','footer'],['half@example.com','unsubscribed','footer'],['odd@example.com','subscribed','legacy'],['runner@example.com','subscribed','footer']]);
 assert.ok(rows.find(r=>r.email==='gone@example.com').unsubscribed_at);
 assert.equal((await q("SELECT to_regclass('public.newsletter_subscriptions')::text t"))[0].t,'newsletter_subscriptions','legacy table not dropped');
 assert.equal((await q('SELECT uss.backfill_newsletter_subscriptions() n'))[0].n,0,'re-run copies nothing new');
 await q("UPDATE uss.newsletter_subscriptions SET status='unsubscribed',unsubscribed_at=now() WHERE email='runner@example.com'");
 await q('SELECT uss.backfill_newsletter_subscriptions()');
 assert.equal((await q("SELECT status FROM uss.newsletter_subscriptions WHERE email='runner@example.com'"))[0].status,'unsubscribed','newer uss state wins over legacy');
 assert.equal((await migrate(adapter,migrations)).executed.length,0);});

test('footer subscription writes uss with consent version, re-subscribe clears opt-out, invalid input rejected',async()=>{const {q,adapter}=fresh;await migrate(adapter,migrations);
 assert.equal((await q("SELECT to_regclass('public.newsletter_subscriptions') t"))[0].t,null,'fresh install needs no legacy table');
 const load=loader(q),svc=load('lib/newsletter/newsletter-service.ts'),actions=load('app/newsletter-actions.ts');
 const form=(email,consent)=>{const f=new FormData();f.set('email',email);if(consent)f.set('consent','on');return f;};
 await actions.subscribeNewsletter(form(' New@Example.com ',true));
 let row=(await q("SELECT * FROM uss.newsletter_subscriptions WHERE email='new@example.com'"))[0];assert.equal(row.status,'subscribed');assert.equal(row.consent_version,'2026-10-01');assert.equal(row.source,'footer');assert.ok(row.consent_at);
 await q("UPDATE uss.newsletter_subscriptions SET status='unsubscribed',unsubscribed_at=now() WHERE id=$1",[row.id]);
 await actions.subscribeNewsletter(form('new@example.com',true));row=(await q("SELECT * FROM uss.newsletter_subscriptions WHERE email='new@example.com'"))[0];assert.equal(row.status,'subscribed');assert.equal(row.unsubscribed_at,null);
 const count=async()=>(await q('SELECT count(*)::int n FROM uss.newsletter_subscriptions'))[0].n,n=await count();
 await assert.rejects(actions.subscribeNewsletter(form('x@example.com',false)));
 for(const email of ['','nope','a@b','<x>@example.com','a'.repeat(250)+'@example.com'])assert.equal((await svc.subscribeToNewsletter({email,consent:true})).ok,false);
 assert.equal(await count(),n);
 await assert.rejects(q("INSERT INTO uss.newsletter_subscriptions(email,status,consent_version,consent_at,source) VALUES('c@example.com','unsubscribed','v',now(),'footer')"),'opt-out requires a timestamp');
 assert.doesNotMatch(readFileSync('app/newsletter-actions.ts','utf8')+readFileSync('lib/newsletter/newsletter-service.ts','utf8'),/public\.newsletter_subscriptions/);});
