import "server-only";
import { DataRightsError } from "./data-rights-errors";
import { DATA_RIGHTS_POLICY } from "./data-rights-policy";
import { DELETION_STATUSES, type DeletionStatus } from "./data-rights-types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNSAFE = /[<>\u0000-\u001f\u007f]/;
const invalid = (): never => { throw new DataRightsError("DATA_RIGHTS_INVALID_INPUT"); };

/** Closed-shape object: unknown keys (actorId, roles, accountId, status…) are rejected, not ignored. */
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (value === undefined) value = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalid();
  try {
    if (Buffer.byteLength(JSON.stringify(value)) > DATA_RIGHTS_POLICY.maxInputBytes) return invalid();
  } catch {
    return invalid();
  }
  if (Object.keys(value).some(key => !keys.includes(key))) return invalid();
  return value as Record<string, unknown>;
}
function uuid(value: unknown): string {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : invalid();
}
function version(value: unknown): number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 2147483646 ? Number(value) : invalid();
}
function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > max || UNSAFE.test(value)) return invalid();
  return value.trim() || null;
}
function requiredText(value: unknown, min: number, max: number): string {
  const text = optionalText(value, max);
  return text && text.length >= min ? text : invalid();
}

export function deletionRequestInput(value: unknown) {
  const v = object(value, ["reason", "confirmEmail"]);
  const confirmEmail = typeof v.confirmEmail === "string" && v.confirmEmail.trim().length >= 3 && v.confirmEmail.length <= 320
    && !UNSAFE.test(v.confirmEmail) ? v.confirmEmail.trim() : invalid();
  return { reason: optionalText(v.reason, DATA_RIGHTS_POLICY.reasonMax), confirmEmail };
}
export function requestRef(value: unknown) {
  const v = object(value, ["id", "expectedVersion"]);
  return { id: uuid(v.id), expectedVersion: version(v.expectedVersion) };
}
export function decisionInput(value: unknown) {
  const v = object(value, ["id", "expectedVersion", "decision", "reason"]);
  if (v.decision !== "approve" && v.decision !== "reject") return invalid();
  return { id: uuid(v.id), expectedVersion: version(v.expectedVersion), decision: v.decision as "approve" | "reject",
    reason: requiredText(v.reason, DATA_RIGHTS_POLICY.decisionReasonMin, DATA_RIGHTS_POLICY.reasonMax) };
}
export function executionInput(value: unknown) {
  const v = object(value, ["id", "expectedVersion", "confirm"]);
  if (v.confirm !== DATA_RIGHTS_POLICY.executeConfirmation) return invalid();
  return { id: uuid(v.id), expectedVersion: version(v.expectedVersion) };
}
export interface QueueFilters { status: DeletionStatus | null; limit: number; cursor: { at: string; id: string } | null }
export function queueFilters(value: unknown): QueueFilters {
  const v = object(value, ["status", "limit", "cursor"]);
  if (v.status !== undefined && !DELETION_STATUSES.includes(v.status as DeletionStatus)) return invalid();
  const limit = v.limit ?? DATA_RIGHTS_POLICY.queueDefaultLimit;
  if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > DATA_RIGHTS_POLICY.queueMaxLimit) return invalid();
  const status = (v.status as DeletionStatus | undefined) ?? null;
  let cursor: QueueFilters["cursor"] = null;
  if (v.cursor !== undefined) {
    if (typeof v.cursor !== "string" || v.cursor.length > 256 || !/^[A-Za-z0-9_-]+$/.test(v.cursor)) return invalid();
    try {
      const parsed = object(JSON.parse(Buffer.from(v.cursor, "base64url").toString("utf8")), ["at", "id", "status"]);
      // Microsecond UTC text from the DB projection; Date would truncate and skip equal-time rows.
      if ((parsed.status ?? null) !== status || typeof parsed.at !== "string"
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(parsed.at) || !Number.isFinite(Date.parse(parsed.at))) return invalid();
      cursor = { at: parsed.at, id: uuid(parsed.id) };
    } catch (error) {
      if (error instanceof DataRightsError) throw error;
      return invalid();
    }
  }
  return { status, limit: Number(limit), cursor };
}
export function encodeQueueCursor(at: string, id: string, status: DeletionStatus | null) {
  return Buffer.from(JSON.stringify({ at, id, status })).toString("base64url");
}
