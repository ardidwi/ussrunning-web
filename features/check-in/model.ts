import type { ScanResult, CheckInCode } from "@/lib/checkin/check-in-types";
export type ScannerContext = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  status: string;
};
export type ContextResult =
  { ok: true; data: ScannerContext } | { ok: false; code: string };
export type ScannerResult = ScanResult | { ok: false; code: "NETWORK_ERROR" };
export const scanMessages: Record<CheckInCode | "NETWORK_ERROR", string> = {
  CHECK_IN_SUCCESS: "Checked in",
  ALREADY_CHECKED_IN: "Already checked in",
  PASS_INVALID:
    "This is not a valid Event Pass. Member Cards cannot be used for check-in.",
  PASS_REVOKED: "This Event Pass is no longer valid.",
  PASS_EXPIRED: "This Event Pass has expired.",
  WRONG_EVENT:
    "This pass belongs to another event. Confirm the event with the participant.",
  REGISTRATION_CANCELLED: "This registration has been cancelled.",
  REGISTRATION_NOT_CONFIRMED:
    "This registration is not confirmed. Waitlisted registrations cannot check in.",
  ACCOUNT_INELIGIBLE: "This member account is not eligible for check-in.",
  CHECK_IN_NOT_OPEN: "Check-in has not opened yet.",
  CHECK_IN_CLOSED: "Check-in is closed.",
  CHECK_IN_DISABLED: "Check-in is disabled for this event.",
  CHECK_IN_WINDOW_UNCONFIGURED:
    "Check-in times are not available. Contact the event lead.",
  CHECK_IN_RATE_LIMITED: "Too many scan requests. Wait before scanning again.",
  CHECK_IN_NOT_CONFIGURED:
    "Check-in is not available yet. Contact the event lead.",
  FORBIDDEN: "Your account cannot check in participants.",
  CONFLICT:
    "The check-in result could not be confirmed. Scan again to check its current state.",
  SERVER_ERROR:
    "We could not confirm check-in. Scan again when connected; repeated scans do not create duplicate attendance.",
  NETWORK_ERROR:
    "Connection lost. Check-in may have completed. Reconnect and scan again to confirm.",
  UNAUTHENTICATED: "Sign in with an authorized crew account to continue.",
  EMAIL_NOT_VERIFIED:
    "Verify your crew account email before checking in participants.",
  ACCOUNT_SUSPENDED: "This crew account is suspended.",
  ACCOUNT_DEACTIVATED: "This crew account is no longer active.",
};
export function blockedCode(code: string) {
  return [
    "FORBIDDEN",
    "INSUFFICIENT_PERMISSION",
    "UNAUTHENTICATED",
    "EMAIL_NOT_VERIFIED",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DEACTIVATED",
    "ACCOUNT_NOT_PROVISIONED",
  ].includes(code);
}
export function passShape(value: string) {
  return /^USS-EVENT:1:[A-Za-z0-9_-]{43}$/.test(value);
}
export function retrySeconds(result: ScannerResult) {
  return !result.ok &&
    result.code === "CHECK_IN_RATE_LIMITED" &&
    typeof result.retryAfterSeconds === "number" &&
    Number.isFinite(result.retryAfterSeconds)
    ? Math.min(3600, Math.max(1, Math.ceil(result.retryAfterSeconds)))
    : 0;
}
/** One acknowledgement per detection burst; no time-based automatic resubmission. */
export function scanLatch() {
  let locked = false;
  return {
    take() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() {
      locked = false;
    },
  };
}
export function scopedResult(
  result: ScannerResult,
  eventId: string,
): ScannerResult {
  return result.ok &&
    (result.data.event.id !== eventId ||
      result.data.registration.status !== "confirmed" ||
      result.data.checkIn.status !== "checked_in")
    ? { ok: false, code: "SERVER_ERROR" }
    : result;
}
export function cameraFailure(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  return name === "NotAllowedError" || name === "SecurityError"
    ? "denied"
    : "unavailable";
}
