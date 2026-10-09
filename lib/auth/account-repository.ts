import "server-only";
import { getSql } from "@/lib/db";
import type { AccountRow } from "@/lib/db/types";
import { AccountError } from "./errors";
import type { AuthenticatedUser, CurrentAccount, SqlStatement } from "./types";
const columns = "id,auth_provider_user_id,email,member_id,barcode_value,status,email_verified_at,display_name,created_at,updated_at,last_login_at";
/** Fresh READ COMMITTED snapshots after provider-key lock; unique constraints are final protection.
 * DB defaults issue separate USS-<uppercase UUID v4> member/barcode values (122 random bits each).
 * No PII, sequence reset or authentication authority; existing identities never change.
 * Existing profile/email/status/identities are never overwritten.
 */
export function provisioningStatements(user: AuthenticatedUser): SqlStatement[] {
  const params = [user.providerUserId,user.email,user.name];
  return [
    { text: "SELECT set_config('lock_timeout','15s',true)", params: [] },
    { text: "SELECT pg_advisory_xact_lock(hashtextextended($1,817502))", params: [user.providerUserId] },
    { text: `INSERT INTO uss.accounts(auth_provider_user_id,email,display_name) VALUES($1,$2,$3)
        ON CONFLICT(auth_provider_user_id) DO NOTHING`, params },
    { text: `INSERT INTO uss.member_profiles(account_id,full_name)
        SELECT id,$3 FROM uss.accounts WHERE auth_provider_user_id=$1 AND email=$2
        ON CONFLICT(account_id) DO NOTHING`, params },
    // Missing reference role fails NOT NULL, rather than committing an incomplete new account.
    { text: `INSERT INTO uss.account_roles(account_id,role_id)
        SELECT id,(SELECT id FROM uss.roles WHERE code='member') FROM uss.accounts
        WHERE auth_provider_user_id=$1 AND email=$2 ON CONFLICT(account_id,role_id) DO NOTHING`, params: params.slice(0,2) },
    { text: `SELECT ${columns} FROM uss.accounts WHERE auth_provider_user_id=$1`, params: [user.providerUserId] },
  ];
}
export function toCurrentAccount(row: AccountRow): CurrentAccount {
  return { id: row.id, email: row.email, memberId: row.member_id, barcodeValue: row.barcode_value,
    displayName: row.display_name, status: row.status, emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : null };
}
/** Internal server adapter: identity must come from getAuthenticatedUser, not a request body. */
export async function provisionAuthenticatedIdentity(user: AuthenticatedUser): Promise<CurrentAccount> {
  try {
    const sql = getSql();
    const results = await sql.transaction(provisioningStatements(user).map(s => sql.query(s.text,s.params)), { isolationLevel: "ReadCommitted" });
    const account = (results[results.length-1] as AccountRow[])[0];
    if (!account) throw new AccountError("PROVISIONING_FAILED");
    if (account.email.toLowerCase() !== user.email) throw new AccountError("ACCOUNT_CONFLICT");
    return toCurrentAccount(account);
  } catch (error) {
    if (error instanceof AccountError) throw error;
    if (error && typeof error === "object" && "code" in error && error.code === "23505") throw new AccountError("ACCOUNT_CONFLICT");
    throw new AccountError("PROVISIONING_FAILED");
  }
}
