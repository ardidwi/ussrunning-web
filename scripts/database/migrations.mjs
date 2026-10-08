import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

// SQL files are developer-owned. Lexer handles quotes, nested comments and PL/pgSQL dollar bodies.
export function splitSql(sql) {
  const result = []; let start = 0, quote = '', dollar = '', line = false, depth = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i], next = sql[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (depth) { if (c === '/' && next === '*') { depth++; i++; } else if (c === '*' && next === '/') { depth--; i++; } continue; }
    if (dollar) { if (sql.startsWith(dollar, i)) { i += dollar.length - 1; dollar = ''; } continue; }
    if (quote) { if (c === quote) { if (next === quote) i++; else quote = ''; } continue; }
    if (c === '-' && next === '-') { line = true; i++; continue; }
    if (c === '/' && next === '*') { depth = 1; i++; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '$') { const match = sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/); if (match) { dollar = match[0]; i += dollar.length - 1; continue; } }
    if (c === ';') { const statement = sql.slice(start, i).trim(); if (statement) result.push(statement); start = i + 1; }
  }
  if (quote || dollar || depth) throw new Error('Unterminated migration SQL quote/comment.');
  const tail = sql.slice(start).trim(); if (tail) result.push(tail);
  return result;
}
export async function loadMigrations(directory) {
  const files = (await readdir(directory)).filter(f => f.endsWith('.sql')).sort();
  if (!files.length) throw new Error('No migration files found.');
  const seen = new Set();
  return Promise.all(files.map(async filename => {
    const match = filename.match(/^(\d{3})_[a-z0-9_]+\.sql$/);
    if (!match || seen.has(match[1])) throw new Error('Migration names must have unique three-digit versions.');
    seen.add(match[1]);
    const sql = (await readFile(new URL(filename, directory), 'utf8')).replace(/\r\n/g, '\n');
    return { version: match[1], filename, checksum: createHash('sha256').update(sql).digest('hex'), statements: splitSql(sql) };
  }));
}
export function planMigrations(migrations, applied) {
  const known = new Map(migrations.map(m => [m.version,m]));
  for (const row of applied) {
    const migration = known.get(row.version);
    if (!migration || migration.checksum !== row.checksum || migration.filename !== row.filename) throw new Error("Applied migration history differs from source. Use a new forward migration.");
  }
  const versions = new Set(applied.map(m => m.version));
  let gap = false;
  for (const migration of migrations) {
    if (!versions.has(migration.version)) gap = true;
    else if (gap) throw new Error('Applied migration history is not an ordered prefix.');
  }
  return migrations.filter(m => !versions.has(m.version));
}
async function readApplied(db) {
  const exists = await db.query("SELECT to_regclass('uss_migrations.schema_migrations') AS ledger");
  return exists[0].ledger ? db.query('SELECT version,filename,checksum FROM uss_migrations.schema_migrations ORDER BY version') : [];
}
export async function migrate(db, migrations, { statusOnly = false } = {}) {
  const applied = await readApplied(db);
  const pending = planMigrations(migrations,applied);
  if (statusOnly || !pending.length) return { applied, pending, executed: [] };
  const statements = [
    { text: "SET LOCAL lock_timeout = '15s'", params: [] },
    { text: "SELECT pg_advisory_xact_lock(817501, 1)", params: [] },
    { text: 'CREATE SCHEMA IF NOT EXISTS uss_migrations', params: [] },
    { text: 'REVOKE ALL ON SCHEMA uss_migrations FROM PUBLIC', params: [] },
    { text: `CREATE TABLE IF NOT EXISTS uss_migrations.schema_migrations (
      version text PRIMARY KEY, filename text NOT NULL UNIQUE, checksum text NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'), applied_at timestamptz NOT NULL DEFAULT now()
    )`, params: [] }
  ];
  // Re-check the plan AFTER acquiring the lock with a new READ COMMITTED snapshot.
  // All literals below are local, validated numeric versions/hex checksums, never user input.
  const matches = applied.map(row => `EXISTS (SELECT 1 FROM uss_migrations.schema_migrations WHERE version='${row.version}' AND checksum='${row.checksum}')`);
  statements.push({ text: `DO $$ BEGIN IF (SELECT count(*) FROM uss_migrations.schema_migrations) <> ${applied.length}${matches.length ? ' OR NOT (' + matches.join(' AND ') + ')' : ''} THEN RAISE EXCEPTION 'Migration history changed concurrently; rerun command'; END IF; END $$`, params: [] });
  for (const migration of pending) {
    for (const text of migration.statements) {
      if (/^(BEGIN|COMMIT|ROLLBACK)\b/i.test(text)) throw new Error('Runner owns migration transaction boundaries.');
      statements.push({text,params:[]});
    }
    statements.push({text:'INSERT INTO uss_migrations.schema_migrations(version,filename,checksum) VALUES($1,$2,$3)',params:[migration.version,migration.filename,migration.checksum]});
  }
  await db.transaction(statements);
  return { applied, pending, executed: pending.map(m => m.filename) };
}
