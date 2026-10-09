import "server-only";
import type { AccountRow } from "@/lib/db/types";
import { AccountError } from "./errors";
import { toCurrentAccount } from "./account-repository";
import type { AccountTransaction, CurrentAccount } from "./types";
export function getVerificationState(account: CurrentAccount) {
  return { verified: account.emailVerifiedAt !== null, verifiedAt: account.emailVerifiedAt, status: account.status };
}
/** INTERNAL BE-03 transaction primitive, never a Server Action/endpoint.
 * Caller first validates/consumes proof for this exact account/email in the SAME transaction.
 * Never feed public account IDs/emails directly. Email-bound row lock prevents stale-email activation.
 * Never restores suspended/deactivated accounts. No verification artifacts or emails issued here.
 */
export async function activateAccountAfterVerification(tx: AccountTransaction, accountId: string, verifiedEmail: string): Promise<CurrentAccount> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(accountId)) throw new AccountError("ACCOUNT_CONFLICT");
  const rows = await tx.query<AccountRow>("SELECT * FROM uss.accounts WHERE id=$1 AND email=$2 FOR UPDATE", [accountId,verifiedEmail.trim().toLowerCase()]);
  const account = rows[0];
  if (!account) throw new AccountError("ACCOUNT_CONFLICT");
  if (account.status === "suspended") throw new AccountError("ACCOUNT_SUSPENDED");
  if (account.status === "deactivated") throw new AccountError("ACCOUNT_DEACTIVATED");
  if (account.status === "active") return toCurrentAccount(account);
  if (account.status !== "pending_verification") throw new AccountError("ACCOUNT_CONFLICT");
  const updated = await tx.query<AccountRow>(`UPDATE uss.accounts SET status='active',email_verified_at=COALESCE(email_verified_at,now()) WHERE id=$1 RETURNING *`, [accountId]);
  return toCurrentAccount(updated[0]);
}
