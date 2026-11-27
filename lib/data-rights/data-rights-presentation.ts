import type { DataRightsErrorCode, DeletionRequestDTO, DeletionStatus } from "./data-rights-types";

/** Client-safe copy for member and admin data-rights surfaces. No server imports. */
const MESSAGES: Partial<Record<DataRightsErrorCode, string>> = {
  UNAUTHENTICATED: "Your session has ended. Sign in again to continue.",
  EMAIL_NOT_VERIFIED: "Verify your email address before managing your data.",
  ACCOUNT_SUSPENDED: "This account is suspended. Contact USS Running for help with your data.",
  ACCOUNT_DEACTIVATED: "This account is no longer active.",
  DATA_RIGHTS_FORBIDDEN: "You don't have access to this action.",
  DATA_RIGHTS_INVALID_INPUT: "Some details are missing or invalid. Check the form and try again.",
  DATA_RIGHTS_NOT_FOUND: "That request could not be found. Refresh to see the latest status.",
  DATA_RIGHTS_CONFLICT: "This request changed in the meantime. Refresh to see the latest status.",
  DATA_RIGHTS_INVALID_TRANSITION: "This request can no longer be changed. Refresh to see the latest status.",
  DATA_RIGHTS_REQUEST_OPEN: "You already have an open deletion request.",
  DATA_RIGHTS_CONFIRMATION_MISMATCH: "The email you typed doesn't match the email on this account.",
  DATA_RIGHTS_RATE_LIMITED: "Too many attempts. Please try again later.",
  DATA_RIGHTS_LAST_SUPER_ADMIN: "The last super admin account can't be deleted. Hand over ownership first.",
  DATA_RIGHTS_SELF_ACTION_FORBIDDEN: "A different super admin must review requests about your own account.",
  DATA_RIGHTS_UNAVAILABLE: "This service is temporarily unavailable. Nothing was changed. Try again shortly.",
};
export function dataRightsMessage(code: string | undefined | null): string {
  return (code && MESSAGES[code as DataRightsErrorCode]) || MESSAGES.DATA_RIGHTS_UNAVAILABLE!;
}

export const STATUS_PRESENTATION: Record<DeletionStatus, { label: string; tone: "success" | "error" | "warning" | "info"; member: string }> = {
  pending: { label: "Pending review", tone: "warning", member: "A USS super admin will review your request. You can cancel it until it is carried out." },
  approved: { label: "Approved", tone: "info", member: "Your request was approved and is scheduled for erasure. You can still cancel it until then." },
  rejected: { label: "Declined", tone: "error", member: "Your request was declined. You can submit a new request." },
  cancelled: { label: "Cancelled", tone: "info", member: "You cancelled this request. Your account is unchanged." },
  executed: { label: "Completed", tone: "success", member: "Your account data has been erased." },
};

export function isOpenRequest(request: Pick<DeletionRequestDTO, "status"> | null | undefined) {
  return request?.status === "pending" || request?.status === "approved";
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
export function formatWhen(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${DATE.format(date)} WIB` : null;
}

/** Only our own generated filename shape is accepted from the header. */
export function exportFilename(contentDisposition: string | null, fallbackDate = new Date()) {
  const match = contentDisposition?.match(/filename="(uss-running-data-\d{4}-\d{2}-\d{2}\.json)"/);
  return match?.[1] ?? `uss-running-data-${fallbackDate.toISOString().slice(0, 10)}.json`;
}

export const REASON_MAX = 500;
