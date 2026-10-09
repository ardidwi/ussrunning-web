import "server-only";
import { AccountError } from "./errors";
import type { AuthenticatedUser } from "./types";
/** Whitelist trusted provider response; discard roles, account IDs, arbitrary metadata. */
export function readProviderIdentity(value: unknown): AuthenticatedUser {
  if (!value || typeof value !== "object") throw new AccountError("UNAUTHENTICATED");
  const user = value as Record<string, unknown>;
  const id = user.id;
  const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
  if (typeof id !== "string" || !id.trim() || id !== id.trim() || id.length > 2048 ||
      !email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountError("ACCOUNT_CONFLICT");
  const name = typeof user.name === "string" ? user.name.trim() || null : null;
  return { providerUserId: id, email, name, emailVerified: user.emailVerified === true };
}
