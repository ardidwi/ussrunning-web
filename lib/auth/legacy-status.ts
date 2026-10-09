import "server-only";
import { query, isDatabaseConfigured } from "@/lib/db";
import { AccountError } from "./errors";
import type { AccountStatus } from "@/lib/db/types";

/** Minimal legacy compatibility guard: no provisioning/backfill or ID/role changes.
 * Optional schema absence keeps pre-migration deployments working; other DB failures fail closed.
 * Pending verification policy is applied by BE-02 active guards, not silently cut over here.
 */
export async function assertLegacyAccountNotBlocked(providerUserId: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const schema = await query<{ table: string | null }>("SELECT to_regclass('uss.accounts')::text AS table");
  if (!schema[0]?.table) return;
  const rows = await query<{ status: AccountStatus }>("SELECT status FROM uss.accounts WHERE auth_provider_user_id=$1", [providerUserId]);
  if (rows[0]?.status === "suspended") throw new AccountError("ACCOUNT_SUSPENDED");
  if (rows[0]?.status === "deactivated") throw new AccountError("ACCOUNT_DEACTIVATED");
}
