import "server-only";
import { getSql } from "@/lib/db";
import { getCurrentAccount } from "./account-provisioning";
import { AccountError } from "./errors";
import type { CurrentAccount } from "./types";
/** Refuse unmapped historical identities; never silently issue replacement permanent IDs. */
export async function getCutoverAccount(): Promise<CurrentAccount | null> {
  return getCurrentAccount();
}
/** Explicit own signup privacy acknowledgment; no marketing consent or client timestamps. */
export async function recordSignupPrivacy(account: CurrentAccount): Promise<void> {
  const sql = getSql();
  const result = await sql.transaction([
    sql.query("SELECT id FROM uss.accounts WHERE id=$1 AND status IN ('pending_verification','active') FOR UPDATE", [account.id]),
    sql.query(`WITH changed AS (UPDATE uss.member_profiles p SET privacy_consent_at=clock_timestamp()
      FROM uss.accounts a WHERE p.account_id=$1 AND a.id=p.account_id AND a.status IN ('pending_verification','active') AND p.privacy_consent_at IS NULL RETURNING p.account_id),
      audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
      SELECT account_id,'member.privacy_consent.accepted','member_profile',account_id,jsonb_build_object('fields',ARRAY['privacyConsent']) FROM changed RETURNING id)
      SELECT account_id FROM changed UNION ALL SELECT p.account_id FROM uss.member_profiles p JOIN uss.accounts a ON a.id=p.account_id WHERE p.account_id=$1 AND a.status IN ('pending_verification','active') AND p.privacy_consent_at IS NOT NULL`, [account.id]),
  ], { isolationLevel: "ReadCommitted" });
  if (!(result[0] as { id: string }[]).length || !(result[1] as { account_id: string }[]).length) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
}
