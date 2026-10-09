import { neon } from '@neondatabase/serverless';
import { loadMigrations, migrate } from './migrations.mjs';

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some(flag => !['--dry-run','--status'].includes(flag))) throw new Error('Use --dry-run or --status, or no flag to apply.');
  const migrations = await loadMigrations(new URL('../../database/migrations/', import.meta.url));
  if (flags.includes('--dry-run')) {
    for (const migration of migrations) console.info(`${migration.filename}: ${migration.statements.length} statements / ${migration.checksum}`);
    console.info('Offline plan only; no database accessed. Use --status for target history.');
    return;
  }
  const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('Missing DATABASE_URL (or migration-only DATABASE_URL_UNPOOLED).');
  try { if (!['postgres:', 'postgresql:'].includes(new URL(url).protocol)) throw new Error(); }
  catch { throw new Error('Database URL must be a valid PostgreSQL connection string.'); }
  const sql = neon(url);
  const db = {
    query: (text,params=[]) => sql.query(text,params),
    transaction: statements => sql.transaction(statements.map(s => sql.query(s.text,s.params)),{isolationLevel:'ReadCommitted',readOnly:false})
  };
  let result;
  try { result = await migrate(db,migrations,{statusOnly:flags.includes('--status')}); }
  catch (error) {
    // Do not print provider errors: they can include connection strings, SQL or row values.
    const state = error && typeof error === 'object' && /^[0-9A-Z]{5}$/.test(String(error.code)) ? ` SQLSTATE ${error.code}.` : '';
    if (error instanceof Error && /^(Applied migration|Applied migration history|Migration history|Runner owns)/.test(error.message)) throw error;
    throw new Error(`Migration failed; the batch was rolled back. Check database access, extension permissions and target history.${state}`);
  }
  for (const name of result.executed) console.info(`Applied ${name}`);
  if (!result.executed.length) console.info(`${result.applied.length} applied; ${result.pending.length} pending.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
