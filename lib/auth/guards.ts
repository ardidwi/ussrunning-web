import "server-only";
import { getCurrentAccount } from "./account-provisioning";
import { AccountError } from "./errors";
import type { CurrentAccount } from "./types";
export function assertActiveAccount(account: CurrentAccount): CurrentAccount {
  if (account.status === "suspended") throw new AccountError("ACCOUNT_SUSPENDED");
  if (account.status === "deactivated") throw new AccountError("ACCOUNT_DEACTIVATED");
  if (account.status === "pending_verification" || !account.emailVerifiedAt) throw new AccountError("EMAIL_NOT_VERIFIED");
  if (account.status !== "active") throw new AccountError("ACCOUNT_NOT_PROVISIONED");
  return account;
}
export async function requireCurrentAccount(): Promise<CurrentAccount> {
  const account = await getCurrentAccount();
  if (!account) throw new AccountError("UNAUTHENTICATED");
  return account;
}
export async function requireActiveAccount(): Promise<CurrentAccount> {
  return assertActiveAccount(await requireCurrentAccount());
}
