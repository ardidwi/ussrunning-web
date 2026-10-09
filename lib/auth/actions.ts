"use server";
import { getCurrentAccount } from "./account-provisioning";
import { requireActiveAccount } from "./guards";
import { accountErrorCode, AccountError } from "./errors";
import type { AccountResult } from "./types";
/** Empty input contract: client IDs, roles and verification flags are never accepted. */
export async function getOwnAccount(): Promise<AccountResult> {
  try {
    const account = await getCurrentAccount();
    if (!account) throw new AccountError("UNAUTHENTICATED");
    if (account.status === "suspended") throw new AccountError("ACCOUNT_SUSPENDED");
    if (account.status === "deactivated") throw new AccountError("ACCOUNT_DEACTIVATED");
    return { ok: true, account };
  } catch (error) { return { ok: false, code: accountErrorCode(error) }; }
}
export async function getActiveOwnAccount(): Promise<AccountResult> {
  try { return { ok: true, account: await requireActiveAccount() }; }
  catch (error) { return { ok: false, code: accountErrorCode(error) }; }
}
