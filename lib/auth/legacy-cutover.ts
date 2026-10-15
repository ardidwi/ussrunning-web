import "server-only";
import { query } from "@/lib/db";
import { AccountError } from "./errors";
/** Until an operator-reviewed crosswalk exists, do not issue a second permanent identity. */
export async function assertIdentityCutoverSafe(providerUserId: string) {
  const existing = await query<{ id: string }>("SELECT id FROM uss.accounts WHERE auth_provider_user_id=$1", [providerUserId]);
  if (existing.length) return;
  const table = await query<{ present: string | null }>("SELECT to_regclass('public.user_profiles')::text AS present");
  if (table[0]?.present) {
    const legacy = await query<{ found: boolean }>("SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE auth_user_id::text=$1) AS found", [providerUserId]);
    if (legacy[0]?.found) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
  }
}
