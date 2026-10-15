import "server-only";
import { cache } from "react";
import { getAuthenticatedUser, requireAuthenticatedUser } from "./session";
import { provisionAuthenticatedIdentity } from "./account-repository";
import { assertIdentityCutoverSafe } from "./legacy-cutover";
import type { CurrentAccount } from "./types";
/** Idempotent first trusted account access; no caller-supplied identity or callback assumptions. */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const user = await getAuthenticatedUser();
  if (user) await assertIdentityCutoverSafe(user.providerUserId);
  return user ? provisionAuthenticatedIdentity(user) : null;
});
export async function provisionCurrentAccount(): Promise<CurrentAccount> {
  const user = await requireAuthenticatedUser();
  await assertIdentityCutoverSafe(user.providerUserId);
  return provisionAuthenticatedIdentity(user);
}
