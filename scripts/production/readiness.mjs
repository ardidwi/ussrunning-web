import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { loadMigrations, migrate } from '../database/migrations.mjs';

const REQUIRED = [
  'DATABASE_URL',
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_COOKIE_SECRET',
  'USS_SUPER_ADMIN_EMAIL',
  'RESEND_API_KEY',
  'EMAIL_FROM_ADDRESS',
  'APP_BASE_URL',
  'EVENT_PASS_TOKEN_KEYS',
  'EVENT_PASS_TOKEN_KEY_ID'
];

function required(env, name, errors) {
  const value = env[name]?.trim();
  if (!value) errors.push(`${name} is required.`);
  return value || '';
}

function validUrl(value, protocols, { allowCredentials = false } = {}) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && (allowCredentials || (!url.username && !url.password)) && !url.hash;
  } catch { return false; }
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateProductionEnv(env = process.env) {
  const errors = [];
  for (const name of REQUIRED) required(env, name, errors);
  if (errors.length) return errors;

  if (!validUrl(env.DATABASE_URL.trim(), ['postgres:', 'postgresql:'], { allowCredentials: true })) errors.push('DATABASE_URL must be a PostgreSQL URL.');
  if (env.DATABASE_URL_UNPOOLED?.trim() && !validUrl(env.DATABASE_URL_UNPOOLED.trim(), ['postgres:', 'postgresql:'], { allowCredentials: true })) errors.push('DATABASE_URL_UNPOOLED must be a PostgreSQL URL when set.');
  if (!validUrl(env.NEON_AUTH_BASE_URL.trim(), ['https:'])) errors.push('NEON_AUTH_BASE_URL must be an HTTPS URL without credentials or fragments.');
  if (!validUrl(env.APP_BASE_URL.trim(), ['https:'])) errors.push('APP_BASE_URL must be an HTTPS URL without credentials or fragments.');
  else {
    const app = new URL(env.APP_BASE_URL.trim());
    if (app.pathname !== '/' || app.search) errors.push('APP_BASE_URL must be an origin only, without path or query.');
  }
  if (!validEmail(env.USS_SUPER_ADMIN_EMAIL.trim())) errors.push('USS_SUPER_ADMIN_EMAIL must be a valid email address.');
  if (!validEmail(env.EMAIL_FROM_ADDRESS.trim())) errors.push('EMAIL_FROM_ADDRESS must be a valid email address.');
  if (env.NEON_AUTH_COOKIE_SECRET.trim().length < 32) errors.push('NEON_AUTH_COOKIE_SECRET must be at least 32 characters.');

  let keys;
  try { keys = JSON.parse(env.EVENT_PASS_TOKEN_KEYS); }
  catch { errors.push('EVENT_PASS_TOKEN_KEYS must be valid JSON.'); }
  if (keys) {
    if (Array.isArray(keys) || typeof keys !== 'object') errors.push('EVENT_PASS_TOKEN_KEYS must be a JSON object.');
    else {
      for (const [id, key] of Object.entries(keys)) {
        if (!id || typeof key !== 'string' || !/^[0-9a-fA-F]{64}$/.test(key)) errors.push(`EVENT_PASS_TOKEN_KEYS contains an invalid key for ${id || '<empty>'}.`);
      }
      if (!(env.EVENT_PASS_TOKEN_KEY_ID.trim() in keys)) errors.push('EVENT_PASS_TOKEN_KEY_ID must reference a configured key.');
    }
  }
  return errors;
}

async function databaseReadiness(env) {
  const migrationUrl = env.DATABASE_URL_UNPOOLED?.trim() || env.DATABASE_URL.trim();
  const sql = neon(migrationUrl);
  const db = {
    query: (text, params = []) => sql.query(text, params),
    transaction: statements => sql.transaction(statements.map(statement => sql.query(statement.text, statement.params)), { isolationLevel: 'ReadCommitted', readOnly: false })
  };
  const migrations = await loadMigrations(new URL('../../database/migrations/', import.meta.url));
  const status = await migrate(db, migrations, { statusOnly: true });
  if (status.pending.length) throw new Error(`Database has ${status.pending.length} pending migration(s): ${status.pending.map(m => m.filename).join(', ')}`);

  const runtime = neon(env.DATABASE_URL.trim());
  const probes = [
    'uss.issue_email_verification(uuid,text,integer,integer,integer,integer)',
    'uss.consume_email_verification(text)',
    'uss.mutate_gallery(uuid,uuid,text,integer,jsonb,text)',
    'uss.mutate_partner(uuid,uuid,text,integer,jsonb,text)',
    'uss.mutate_sponsorship(uuid,uuid,text,jsonb)',
    'uss.mutate_site_content(uuid,text,text,integer,jsonb)',
    'uss.claim_application_notification(uuid,uuid,text,text,integer)',
    'uss.manage_account(uuid,uuid,text,integer,text)',
    'uss.manage_role(uuid,uuid,text,text,integer,text)'
  ];
  for (const signature of probes) {
    const rows = await runtime.query("SELECT to_regprocedure($1) IS NOT NULL AS exists, has_function_privilege(current_user,$1,'EXECUTE') AS executable", [signature]);
    if (!rows[0]?.exists) throw new Error(`Required database function is missing: ${signature}`);
    if (!rows[0]?.executable) throw new Error(`Runtime database role lacks EXECUTE: ${signature}`);
  }
  await runtime.query('SELECT 1 FROM uss.accounts LIMIT 0');
}

export async function runReadiness(env = process.env) {
  const errors = validateProductionEnv(env);
  if (errors.length) throw new Error(`Production configuration is not ready:\n- ${errors.join('\n- ')}`);
  await databaseReadiness(env);
  return { ok: true };
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  runReadiness().then(() => console.info('Production readiness PASS: configuration, migration history, runtime grants and database connectivity are ready.')).catch(error => {
    console.error(error instanceof Error ? error.message : 'Production readiness failed.');
    process.exitCode = 1;
  });
}
