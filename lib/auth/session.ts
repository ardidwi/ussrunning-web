import "server-only";
import { cache } from "react";
import { getAuth, isAuthConfigured } from "./server";
import { AccountError } from "./errors";
import { readProviderIdentity } from "./identity";
import type { AuthenticatedUser } from "./types";
/** React request-local memoization, never a global session/user cache. */
export const getAuthenticatedUser = cache(async (): Promise<AuthenticatedUser | null> => {
  if (!isAuthConfigured()) throw new AccountError("AUTH_NOT_CONFIGURED");
  try {
    const { data, error } = await getAuth().getSession();
    if (error) {
      if (error.status === 401) return null;
      throw new AccountError("AUTH_UNAVAILABLE");
    }
    return data?.user ? readProviderIdentity(data.user) : null;
  } catch (error) {
    if (error instanceof AccountError) throw error;
    throw new AccountError("AUTH_UNAVAILABLE");
  }
});
export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) throw new AccountError("UNAUTHENTICATED");
  return user;
}
