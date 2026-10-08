import "server-only";
import { cache } from "react";
import { getAuthenticatedUser, requireAuthenticatedUser } from "./session";
import { provisionAuthenticatedIdentity } from "./account-repository";
import type { CurrentAccount } from "./types";
/** Idempotent first trusted account access; no caller-supplied identity or callback assumptions. */
export const getCurrentAccount = cache(async (): Promise<CurrentAccount | null> => {
  const user = await getAuthenticatedUser();
  return user ? provisionAuthenticatedIdentity(user) : null;
});
export async function provisionCurrentAccount(): Promise<CurrentAccount> {
  return provisionAuthenticatedIdentity(await requireAuthenticatedUser());
}
