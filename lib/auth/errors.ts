import "server-only";
export type AccountErrorCode = "UNAUTHENTICATED" | "AUTH_NOT_CONFIGURED" | "AUTH_UNAVAILABLE" | "ACCOUNT_NOT_PROVISIONED" | "EMAIL_NOT_VERIFIED" | "ACCOUNT_SUSPENDED" | "ACCOUNT_DEACTIVATED" | "ACCOUNT_CONFLICT" | "PROVISIONING_FAILED";
/** Safe boundary error: no SQL/provider messages, tokens, stack or row data. */
export class AccountError extends Error {
  constructor(public readonly code: AccountErrorCode) { super(code); this.name = "AccountError"; }
}
export function accountErrorCode(error: unknown): AccountErrorCode {
  return error instanceof AccountError ? error.code : "PROVISIONING_FAILED";
}
