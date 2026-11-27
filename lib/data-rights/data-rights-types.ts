import type { AccountErrorCode } from "@/lib/auth/errors";
import type { AccountStatus } from "@/lib/db/types";

/** Explicit lifecycle (AGENTS.md §23). Terminal: rejected, cancelled, executed. */
export const DELETION_STATUSES = ["pending", "approved", "rejected", "cancelled", "executed"] as const;
export type DeletionStatus = (typeof DELETION_STATUSES)[number];
export const OPEN_DELETION_STATUSES: readonly DeletionStatus[] = ["pending", "approved"];

export const DATA_RIGHTS_CODES = [
  "DATA_RIGHTS_FORBIDDEN", "DATA_RIGHTS_INVALID_INPUT", "DATA_RIGHTS_NOT_FOUND", "DATA_RIGHTS_CONFLICT",
  "DATA_RIGHTS_INVALID_TRANSITION", "DATA_RIGHTS_REQUEST_OPEN", "DATA_RIGHTS_CONFIRMATION_MISMATCH",
  "DATA_RIGHTS_RATE_LIMITED", "DATA_RIGHTS_LAST_SUPER_ADMIN", "DATA_RIGHTS_SELF_ACTION_FORBIDDEN",
  "DATA_RIGHTS_UNAVAILABLE",
] as const;
export type DataRightsCode = (typeof DATA_RIGHTS_CODES)[number];
export type DataRightsErrorCode = DataRightsCode | AccountErrorCode;
export type DataRightsResult<T> = { ok: true; data: T } | { ok: false; code: DataRightsErrorCode };

/** Member-facing request view: no reviewer/executor identity, no erasure internals. */
export interface DeletionRequestDTO {
  id: string;
  status: DeletionStatus;
  reason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  cancelledAt: string | null;
  executedAt: string | null;
  version: number;
}
export interface OwnDeletionStatus {
  /** Open request if any, otherwise the most recent closed one. */
  current: DeletionRequestDTO | null;
  canRequest: boolean;
}

export interface AdminDeletionRequestDTO extends DeletionRequestDTO {
  subject: { accountId: string; memberId: string; displayName: string | null; email: string; accountStatus: AccountStatus };
  decidedBy: { accountId: string; displayName: string | null } | null;
  executedBy: { accountId: string; displayName: string | null } | null;
  erasure: { summary: Record<string, number>; pendingObjects: number; deletedObjects: number } | null;
}
export interface DeletionQueuePage { items: AdminDeletionRequestDTO[]; nextCursor: string | null }
export interface ExecutionResult {
  request: DeletionRequestDTO;
  alreadyExecuted: boolean;
  objects: { deleted: number; pending: number };
  sessions: "revoked" | "unavailable";
}

export const DATA_EXPORT_SCHEMA_VERSION = 1;
export interface DataExportAvatar {
  id: string; mimeType: string; width: number | null; height: number | null; byteSize: number;
  uploadedAt: string; status: string | null; reviewedAt: string | null; rejectionReason: string | null;
  /** Short-lived signed URL generated at export time; never a storage key. */
  temporaryUrl: string | null;
}
export interface DataExport {
  schemaVersion: typeof DATA_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  notice: string;
  account: {
    memberId: string; email: string; displayName: string | null; status: AccountStatus;
    emailVerifiedAt: string | null; createdAt: string; lastLoginAt: string | null; roles: string[];
  };
  profile: Record<string, unknown> | null;
  consents: { marketing: boolean; marketingConsentAt: string | null; privacyConsentAt: string | null } | null;
  avatar: DataExportAvatar | null;
  registrations: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  passes: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  dataRightsRequests: DeletionRequestDTO[];
}
