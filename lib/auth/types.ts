import type { AccountStatus, Timestamp, UUID } from "@/lib/db/types";
import type { AccountErrorCode } from "./errors";
/** Constructed only from a validated server provider session, never client metadata. */
export interface AuthenticatedUser { providerUserId: string; email: string; name: string | null; emailVerified: boolean }
/** Own-account DTO omits provider mapping, grant metadata and profile PII. */
export interface CurrentAccount {
  id: UUID; email: string; memberId: string; barcodeValue: string; displayName: string | null;
  status: AccountStatus; emailVerifiedAt: Timestamp | null;
}
export type AccountResult = { ok: true; account: CurrentAccount } | { ok: false; code: AccountErrorCode };
export interface SqlStatement { text: string; params: unknown[] }
export interface AccountTransaction { query<T>(text: string, params?: unknown[]): Promise<T[]> }
