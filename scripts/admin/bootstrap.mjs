import { pathToFileURL } from 'node:url';
import { neon } from '@neondatabase/serverless';

export async function bootstrapSuperAdmin(query, value) {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set USS_SUPER_ADMIN_EMAIL to a valid account email.');
  }
  const [row] = await query('SELECT uss.bootstrap_super_admin_by_email($1) AS code', [email]);
  return row?.code;
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED?.trim();
  if (!url) throw new Error('Set DATABASE_URL_UNPOOLED to the intended database owner connection.');
  let code;
  try {
    code = await bootstrapSuperAdmin(neon(url).query, process.env.USS_SUPER_ADMIN_EMAIL);
  } catch {
    throw new Error('Bootstrap could not run. Check the owner connection, migration 020 and USS_SUPER_ADMIN_EMAIL.');
  }
  if (code === 'OK' || code === 'ALREADY_BOOTSTRAPPED') {
    console.info(code === 'OK' ? 'Super admin granted.' : 'This account is already a super admin.');
    return;
  }
  const messages = {
    ROLE_TARGET_NOT_FOUND: 'The specified account does not exist.',
    ROLE_TARGET_INELIGIBLE: 'The account must be active and email verified.',
    ROLE_BOOTSTRAP_CLOSED: 'An active super admin already exists.',
  };
  throw new Error(messages[code] ?? 'Super admin bootstrap is unavailable.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
