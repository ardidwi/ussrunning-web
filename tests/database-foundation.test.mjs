import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { loadMigrations, migrate, planMigrations, splitSql } from '../scripts/database/migrations.mjs';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const pg = new PGlite({extensions:{citext,pgcrypto}});
const migrations = await loadMigrations(new URL('../database/migrations/',import.meta.url));
const nextVersion = String(Number(migrations.at(-1).version)+1).padStart(3,'0');
const query = async (text,params=[]) => (await pg.query(text,params)).rows;
const adapter = { query, transaction: statements => pg.transaction(async tx => {
  for (const s of statements) await tx.query(s.text,s.params);
}) };
let account, event, registration, otherEvent, otherRegistration;
const rejected = async (sql,params,code) => assert.rejects(query(sql,params),e => (Array.isArray(code) ? code.includes(e.code) : e.code === code));
const newAccount = async (email='member@example.com') => (await query('INSERT INTO uss.accounts(auth_provider_user_id,email) VALUES($1,$2) RETURNING *',[crypto.randomUUID(),email]))[0];
before(async () => {
  // Existing public schema survives alongside the new foundation.
  await pg.exec('CREATE TABLE public.legacy_sentinel(id integer PRIMARY KEY); INSERT INTO public.legacy_sentinel VALUES(1)');
  await migrate(adapter,migrations);
  account = await newAccount();
  event = (await query("INSERT INTO uss.events(slug,title,starts_at) VALUES('run-one','Run One',now()) RETURNING *"))[0];
  otherEvent = (await query("INSERT INTO uss.events(slug,title,starts_at) VALUES('run-two','Run Two',now()) RETURNING *"))[0];
  registration = (await query('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2) RETURNING *',[event.id,account.id]))[0];
  otherRegistration = (await query('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2) RETURNING *',[otherEvent.id,account.id]))[0];
});
after(async () => { await pg.close(); });
test('fresh migrations create all foundation tables and only three role seeds', async () => {
  const rows = await query("SELECT tablename FROM pg_tables WHERE schemaname='uss'");
  assert.equal(rows.length,34); // +media_upload_intents, +story_bylines (migration 024)
  for (const table of ['galleries','gallery_revisions']) assert.ok(rows.some(r=>r.tablename===table));
  assert.deepEqual((await query('SELECT code FROM uss.roles ORDER BY code')).map(r=>r.code),['admin','member','super_admin']);
  assert.equal((await query('SELECT * FROM public.legacy_sentinel'))[0].id,1);
  assert.equal((await query('SELECT count(*)::int AS n FROM uss_migrations.schema_migrations'))[0].n,migrations.length);
});
test('migration rerun does not repeat DDL or seed data', async () => {
  assert.deepEqual((await migrate(adapter,migrations)).executed,[]);
  assert.equal((await query('SELECT count(*)::int AS n FROM uss.roles'))[0].n,3);
});
test('applied migration drift and out-of-order history fail closed', async () => {
  const applied = await query('SELECT version,filename,checksum FROM uss_migrations.schema_migrations ORDER BY version');
  assert.throws(()=>planMigrations(migrations,[{...applied[0],checksum:'0'.repeat(64)}]),/differs/);
  assert.throws(()=>planMigrations(migrations,[applied[1]]),/ordered prefix/);
});
test('failed batch rolls back DDL and migration ledger atomically', async () => {
  const bad = {version:nextVersion,filename:nextVersion+'_failure.sql',checksum:'a'.repeat(64),statements:['CREATE TABLE uss.rollback_probe(id integer)','SELECT * FROM uss.missing_table']};
  await assert.rejects(migrate(adapter,[...migrations,bad]),e=>e.code==='42P01');
  assert.equal((await query("SELECT to_regclass('uss.rollback_probe') AS t"))[0].t,null);
  assert.equal((await query("SELECT count(*)::int AS n FROM uss_migrations.schema_migrations WHERE version=$1",[nextVersion]))[0].n,0);
});
test('duplicate email is case-insensitive; provider mapping is unique', async () => {
  await rejected('INSERT INTO uss.accounts(auth_provider_user_id,email) VALUES($1,$2)',[crypto.randomUUID(),'MEMBER@example.COM'],'23505');
  await rejected('INSERT INTO uss.accounts(auth_provider_user_id,email) VALUES($1,$2)',[account.auth_provider_user_id,'other@example.com'],'23505');
});
test('member ID and barcode are server-defaulted, opaque, unique and immutable', async () => {
  assert.match(account.member_id,/^USS-[0-9A-F-]{36}$/);
  assert.match(account.barcode_value,/^USS-[0-9A-F-]{36}$/);
  assert.ok(!account.barcode_value.includes(account.email));
  for (const column of ['member_id','barcode_value']) {
    await rejected(`INSERT INTO uss.accounts(auth_provider_user_id,email,${column}) VALUES($1,$2,$3)`,[crypto.randomUUID(),`${crypto.randomUUID()}@example.com`,account[column]],'23505');
    await rejected(`UPDATE uss.accounts SET ${column}=$1 WHERE id=$2`,['USS-'+crypto.randomUUID().toUpperCase(),account.id],'23514');
  }
});
test('active account requires verification and invalid role relation is rejected', async () => {
  await rejected("UPDATE uss.accounts SET status='active' WHERE id=$1",[account.id],'23514');
  await rejected('INSERT INTO uss.account_roles(account_id,role_id) VALUES($1,$2)',[account.id,crypto.randomUUID()],'23503');
  await query("UPDATE uss.accounts SET email_verified_at=now(),status='active' WHERE id=$1",[account.id]);
});
test('verification hashes, expiry and outstanding-token uniqueness', async () => {
  await rejected("INSERT INTO uss.email_verification_tokens(account_id,token_hash,expires_at) VALUES($1,'raw-secret',now()+interval '1 hour')",[account.id],'23514');
  await rejected("INSERT INTO uss.email_verification_tokens(account_id,token_hash,expires_at) VALUES($1,$2,now()-interval '1 hour')",[account.id,'1'.repeat(64)],'23514');
  await query("INSERT INTO uss.email_verification_tokens(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",[account.id,'1'.repeat(64)]);
  await rejected("INSERT INTO uss.email_verification_tokens(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",[account.id,'2'.repeat(64)],'23505');
  await query('UPDATE uss.email_verification_tokens SET invalidated_at=now() WHERE account_id=$1',[account.id]);
  await query("INSERT INTO uss.email_verification_tokens(account_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",[account.id,'2'.repeat(64)]);
});
test('duplicate event, Story and Partner slugs are rejected', async () => {
  await rejected("INSERT INTO uss.events(slug,title,starts_at) VALUES('run-one','Duplicate',now())",[],'23505');
  await query("INSERT INTO uss.story_content_types(code,name) VALUES('test-editorial','Test editorial')");
  await query("INSERT INTO uss.stories(slug,title,body,content_type) VALUES('story-one','Story','{}','test-editorial')");
  await rejected("INSERT INTO uss.stories(slug,title,body,content_type) VALUES('story-one','Duplicate','{}','test-editorial')",[],'23505');
  await query("INSERT INTO uss.partners(name,slug) VALUES('Partner','partner-one')");
  await rejected("INSERT INTO uss.partners(name,slug) VALUES('Duplicate','partner-one')",[],'23505');
});
test('one logical registration per event/member and foreign account rejected', async () => {
  await rejected('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2)',[event.id,account.id],'23505');
  await rejected('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2)',[event.id,crypto.randomUUID()],'23503');
});
test('one hashed event pass per registration and unique pass hash', async () => {
  await query('INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2)',[registration.id,'a'.repeat(64)]);
  await rejected('INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2)',[registration.id,'b'.repeat(64)],'23505');
  await rejected('INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2)',[otherRegistration.id,'a'.repeat(64)],'23505');
  await rejected('INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2)',[otherRegistration.id,'raw-token'],'23514');
});
test('check-in rejects wrong event and prevents duplicate attendance', async () => {
  await rejected('INSERT INTO uss.check_ins(registration_id,event_id) VALUES($1,$2)',[registration.id,otherEvent.id],'23503');
  await query('INSERT INTO uss.check_ins(registration_id,event_id,checked_in_by) VALUES($1,$2,$3)',[registration.id,event.id,account.id]);
  await rejected('INSERT INTO uss.check_ins(registration_id,event_id) VALUES($1,$2)',[registration.id,event.id],'23505');
});
test('custom answers reject questions from another event', async () => {
  const field = (await query("INSERT INTO uss.event_custom_fields(event_id,key,label,field_type) VALUES($1,'pace','Preferred pace','text') RETURNING id",[otherEvent.id]))[0];
  await rejected('INSERT INTO uss.registration_field_values(registration_id,field_id,event_id,value) VALUES($1,$2,$3,$4)',[registration.id,field.id,event.id,'"5:30"'],'23503');
});
test('invalid date ranges, zero/negative capacity and unknown timezone rejected', async () => {
  for (const fragment of ["ends_at=starts_at-interval '1 second'","registration_opens_at=now(),registration_closes_at=now()-interval '1 hour'","checkin_opens_at=now(),checkin_closes_at=now()-interval '1 hour'","capacity=0","capacity=-1","timezone='Invalid/Zone'"]) {
    await rejected(`UPDATE uss.events SET ${fragment} WHERE id=$1`,[event.id],'23514');
  }
  await query('UPDATE uss.events SET capacity=NULL WHERE id=$1',[event.id]);
});
test('history is append-only and publication pointer belongs to its own published revision', async () => {
  const one = (await query("INSERT INTO uss.site_content(key,content) VALUES('homepage.hero','{}') RETURNING id"))[0];
  const two = (await query("INSERT INTO uss.site_content(key,content) VALUES('login.visual','{}') RETURNING id"))[0];
  const revision = (await query("INSERT INTO uss.site_content_revisions(site_content_id,version,content,status) VALUES($1,1,'{}','published') RETURNING id",[one.id]))[0];
  await rejected('UPDATE uss.site_content SET published_revision_id=$1 WHERE id=$2',[revision.id,two.id],'23514');
  await query("UPDATE uss.site_content SET status='published',published_revision_id=$1 WHERE id=$2",[revision.id,one.id]);
  await rejected('UPDATE uss.site_content_revisions SET version=2 WHERE id=$1',[revision.id],'23514');
  await rejected('DELETE FROM uss.site_content_revisions WHERE id=$1',[revision.id],'23514');
  await rejected('TRUNCATE uss.audit_logs',[],'23514');
});
test('operational FK policy protects accounts/events/media referenced by history', async () => {
  await rejected('DELETE FROM uss.accounts WHERE id=$1',[account.id],['23503','23001']);
  await rejected('DELETE FROM uss.events WHERE id=$1',[event.id],['23503','23001']);
  const media = (await query("INSERT INTO uss.media_assets(storage_provider,storage_key,mime_type,byte_size) VALUES('test','test-cover','image/png',10) RETURNING id"))[0];
  await query('UPDATE uss.events SET cover_media_id=$1 WHERE id=$2',[media.id,event.id]);
  await rejected('DELETE FROM uss.media_assets WHERE id=$1',[media.id],'23514');
  // The new retention guard fires first; independently retain the original FK proof.
  // This isolated fixture transaction rolls back trigger disabling on FK failure.
  await assert.rejects(pg.transaction(async tx => {
    await tx.exec('ALTER TABLE uss.media_assets DISABLE TRIGGER media_no_delete');
    await tx.query('DELETE FROM uss.media_assets WHERE id=$1',[media.id]);
  }),e => ['23503','23001'].includes(e.code));
  await rejected('DELETE FROM uss.media_assets WHERE id=$1',[media.id],'23514');
});
test('SQL lexer preserves semicolons in dollar bodies, comments and strings', () => {
  assert.equal(splitSql("SELECT ';'; /* nested /* ; */ comment */ DO $fn$ BEGIN RAISE NOTICE 'x;'; END $fn$; -- tail\nSELECT 1;").length,3);
  assert.throws(()=>splitSql('DO $$ incomplete'),/Unterminated/);
});
test('missing environment fails usefully, dry-run needs no database, unavailable target is redacted', () => {
  const env = {...process.env}; delete env.DATABASE_URL; delete env.DATABASE_URL_UNPOOLED;
  let result = spawnSync(process.execPath,['scripts/database/migrate.mjs'],{env,encoding:'utf8'});
  assert.equal(result.status,1); assert.match(result.stderr,/Missing DATABASE_URL/);
  result = spawnSync(process.execPath,['scripts/database/migrate.mjs','--dry-run'],{env,encoding:'utf8'});
  assert.equal(result.status,0); assert.match(result.stdout,/Offline plan only/);
  result = spawnSync(process.execPath,['scripts/database/migrate.mjs'],{env:{...env,DATABASE_URL:'postgresql://test:private-secret@127.0.0.1:1/test'},encoding:'utf8',timeout:15000});
  assert.equal(result.status,1); assert.match(result.stderr,/Migration failed/); assert.doesNotMatch(result.stderr,/private-secret|127\.0\.0\.1/);
});
test('server-only accessor caches client, binds query params and opt-in errors remove secrets', async () => {
  let creations=0, fail=false;
  const exports = {}; const errors = {};
  const run = async (file,target,mocks,env={}) => vm.runInNewContext(ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:target,require:name=>mocks[name],URL,process:{env}});
  await run('lib/db/errors.ts',errors,{'server-only':{}});
  const client = {query:async (text,params)=>{if(fail)throw {code:'23505',message:'private-secret',constraint:'safe-test'};return params;}};
  const env = {DATABASE_URL:'postgresql://test:private-secret@localhost/test'};
  await run('lib/db/client.ts',exports,{'server-only':{},'./errors':errors,'@neondatabase/serverless':{neon:()=>{creations++;return client;}}},env);
  assert.equal(exports.getSql(),exports.getSql()); assert.equal(creations,1);
  assert.deepEqual(Array.from(await exports.query('SELECT $1',["' OR true --"])),["' OR true --"]);
  fail=true;
  await assert.rejects(exports.querySafe('SELECT 1'),e=>e.code==='DB_CONFLICT'&&!JSON.stringify(e).includes('private-secret'));
  await assert.rejects(exports.query('SELECT 1'),e=>e.code==='23505'&&e.constraint==='safe-test');
  delete env.DATABASE_URL; assert.throws(()=>exports.getSql(),/DATABASE_URL is missing/);
  assert.equal(exports.isDatabaseConfigured(),false);
  env.DATABASE_URL='   ';
  assert.equal(exports.isDatabaseConfigured(),true);
  assert.throws(()=>exports.getSql(),/DATABASE_URL is missing/);
});
test('least-privilege runtime role can use foundation but cannot mutate history or migration ledger', async () => {
  await pg.exec('CREATE ROLE uss_app_test NOLOGIN');
  const grants = (await readFile(new URL('../database/runtime-grants.sql',import.meta.url),'utf8')).replaceAll(':"app_role"','"uss_app_test"');
  await pg.exec(grants);
  await pg.exec('SET ROLE uss_app_test');
  try {
    const runtimeAccount = await newAccount('runtime@example.com');
    const issued = (await query('SELECT * FROM uss.issue_email_verification($1,$2,1800,60,3600,5)',[runtimeAccount.id,'d'.repeat(64)]))[0];
    assert.equal(issued.code,'VERIFICATION_ISSUED');
    assert.equal((await query('SELECT uss.consume_email_verification($1) AS code',['d'.repeat(64)]))[0].code,'VERIFICATION_SUCCESS');
    await query("INSERT INTO uss.audit_logs(action,entity_type) VALUES('test.runtime','test')");
    await rejected("UPDATE uss.audit_logs SET action='tampered'",[],'42501');
    await rejected('TRUNCATE uss.audit_logs',[],'42501');
    await rejected('SELECT * FROM uss_migrations.schema_migrations',[],'42501');
    await rejected('DELETE FROM uss.accounts',[],'42501');
  } finally { await pg.exec('RESET ROLE'); }
});
test('post-lock ledger guard rejects a stale concurrent migration plan', async () => {
  const next = {version:nextVersion,filename:nextVersion+'_concurrency.sql',checksum:'b'.repeat(64),statements:['CREATE TABLE uss.concurrent_probe(id integer)']};
  const raced = {query,transaction:async statements => {
    await query('INSERT INTO uss_migrations.schema_migrations(version,filename,checksum) VALUES($1,$2,$3)',[next.version,next.filename,next.checksum]);
    return adapter.transaction(statements);
  }};
  try {
    await assert.rejects(migrate(raced,[...migrations,next]),e=>e.code==='P0001'&&/concurrently/.test(e.message));
    assert.equal((await query("SELECT to_regclass('uss.concurrent_probe') AS t"))[0].t,null);
  } finally { await query("DELETE FROM uss_migrations.schema_migrations WHERE version=$1",[nextVersion]); }
});
test('consumed/invalidated verification artifacts cannot be revived and event UUID cannot be replaced', async () => {
  await rejected('UPDATE uss.email_verification_tokens SET invalidated_at=NULL WHERE token_hash=$1',['1'.repeat(64)],'23514');
  await query('UPDATE uss.email_verification_tokens SET consumed_at=now() WHERE token_hash=$1',['2'.repeat(64)]);
  await rejected('UPDATE uss.email_verification_tokens SET consumed_at=NULL WHERE token_hash=$1',['2'.repeat(64)],'23514');
  await rejected("UPDATE uss.email_verification_tokens SET expires_at=now()+interval '1 day' WHERE token_hash=$1",['2'.repeat(64)],'23514');
  await rejected('UPDATE uss.events SET id=$1 WHERE id=$2',[crypto.randomUUID(),otherEvent.id],'23514');
});
test('registration/pass/check-in ownership cannot be rebound while operational fields remain mutable', async () => {
  const a = await newAccount('anchors@example.com');
  const b = await newAccount('anchors-other@example.com');
  const e = (await query("INSERT INTO uss.events(slug,title,starts_at) VALUES('anchors-a','Anchor A',now()) RETURNING id"))[0];
  const f = (await query("INSERT INTO uss.events(slug,title,starts_at) VALUES('anchors-b','Anchor B',now()) RETURNING id"))[0];
  const r = (await query('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2) RETURNING id',[e.id,a.id]))[0];
  const other = (await query('INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2) RETURNING id',[f.id,b.id]))[0];
  const pass = (await query('INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2) RETURNING id',[r.id,'c'.repeat(64)]))[0];
  await rejected('UPDATE uss.event_registrations SET event_id=$1 WHERE id=$2',[f.id,r.id],'23514');
  await rejected('UPDATE uss.event_registrations SET account_id=$1 WHERE id=$2',[b.id,r.id],'23514');
  await rejected('UPDATE uss.event_passes SET registration_id=$1 WHERE id=$2',[other.id,pass.id],'23514');
  await query("UPDATE uss.event_registrations SET status='confirmed',admin_note='reviewed' WHERE id=$1",[r.id]);
  await query("UPDATE uss.event_passes SET status='revoked',revoked_at=now() WHERE id=$1",[pass.id]);
  const checkin = (await query('INSERT INTO uss.check_ins(registration_id,event_id) VALUES($1,$2) RETURNING id',[r.id,e.id]))[0];
  await rejected('UPDATE uss.check_ins SET registration_id=$1,event_id=$2 WHERE id=$3',[other.id,f.id,checkin.id],'23514');
  await query("UPDATE uss.check_ins SET checkpoint='finish',metadata='{}' WHERE id=$1",[checkin.id]);
  const field = (await query("INSERT INTO uss.event_custom_fields(event_id,key,label,field_type) VALUES($1,'anchor','Label','text') RETURNING id",[e.id]))[0];
  await rejected('UPDATE uss.event_custom_fields SET event_id=$1 WHERE id=$2',[f.id,field.id],'23514');
  await query("UPDATE uss.event_custom_fields SET label='Updated',helper_text='Enter pace',active=false WHERE id=$1",[field.id]);
  await query("UPDATE uss.accounts SET display_name='Mutable name',last_login_at=now() WHERE id=$1",[a.id]);
  await query("INSERT INTO uss.member_profiles(account_id,full_name) VALUES($1,'Runner')",[a.id]);
  await query("UPDATE uss.member_profiles SET full_name='Updated Runner',city='Jakarta',marketing_consent=true WHERE account_id=$1",[a.id]);
  await query("UPDATE uss.events SET slug='anchors-a-edited',title='Updated',capacity=20,status='published' WHERE id=$1",[e.id]);
  assert.equal((await query('SELECT count(*)::int AS n FROM uss.event_registrations WHERE event_id=$1',[f.id]))[0].n,1);
});
