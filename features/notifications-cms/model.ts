import type { NotificationDto, NotificationStatus, NotificationType } from "@/lib/notifications/notification-types";
export { NOTIFICATION_TYPES } from "@/lib/notifications/notification-types";

export const NOTIFICATIONS_MODULE = "notifications";
export const NOTIFICATION_STATUSES: readonly NotificationStatus[] = ["pending", "sending", "sent", "failed", "cancelled"];
export const TYPE_LABELS: Record<NotificationType, string> = {
  registration_confirmed: "Registration confirmed",
  registration_waitlisted: "Waitlisted",
  registration_cancelled: "Registration cancelled",
  event_pass_available: "Event pass available",
};

export function notificationsHref(values: Record<string, string> = {}, module: string = NOTIFICATIONS_MODULE) {
  return `/admin?${new URLSearchParams({ module, ...values })}`;
}

/** A failure the scheduler will not retry (attempt cap, permanent rejection or changed envelope). */
export function isFinalFailure(n: NotificationDto) { return n.status === "failed" && !n.retryable; }
export function canResend(n: NotificationDto) { return n.status === "pending" || (n.status === "failed" && n.retryable); }
export function canCancel(n: NotificationDto) { return n.status === "pending" || n.status === "failed"; }

export function statusLabel(n: NotificationDto) {
  if (isFinalFailure(n)) return "failed — final";
  if (n.status === "failed") return "failed — retry scheduled";
  return n.status;
}
export function statusTone(n: NotificationDto): "success" | "error" | "warning" | "info" {
  return n.status === "sent" ? "success" : isFinalFailure(n) ? "error" : n.status === "failed" ? "warning" : "info";
}

const ERROR_LABELS: Record<string, string> = {
  EMAIL_DELIVERY_FAILED: "Provider rejected or did not accept the email",
  EMAIL_PROVIDER_TIMEOUT: "Provider timed out (may have been accepted)",
  EMAIL_DELIVERY_UNCERTAIN: "Delivery outcome unknown after the final attempt",
  NOTIFICATION_RETRY_EXHAUSTED: "Retry limit reached",
  NOTIFICATION_ENVELOPE_CHANGED: "Email content or sender changed since the first attempt",
  NOTIFICATION_SUPERSEDED: "Superseded by a newer registration change",
  NOTIFICATION_MERGED: "Included in the confirmation email",
  NOTIFICATION_CANCELLED: "Cancelled by staff",
};
export function errorLabel(code: string | null) { return code ? ERROR_LABELS[code] ?? code : null; }

export function notificationMessage(code: string) {
  const messages: Record<string, string> = {
    NOTIFICATION_SENT: "Email accepted by the provider.",
    NOTIFICATION_SEND_FAILED: "The provider did not accept the email. The result is recorded below.",
    NOTIFICATION_ALREADY_SENT: "This email was already sent.",
    NOTIFICATION_CONFLICT: "This notification changed or is being sent right now. Reload to see its latest state.",
    NOTIFICATION_RATE_LIMITED: "A retry is already scheduled. Try again after the next attempt time.",
    NOTIFICATION_NOT_RETRYABLE: "This notification can no longer be sent (final failure, cancelled, or no longer accurate).",
    NOTIFICATION_PROVIDER_UNAVAILABLE: "Email delivery is not configured in this environment. Nothing was sent.",
    NOTIFICATION_FORBIDDEN: "You do not have permission to manage notifications.",
    NOTIFICATION_NOT_FOUND: "This notification could not be found.",
    NOTIFICATION_INVALID_TEMPLATE: "The request was rejected. Check the filters and try again.",
    UNAUTHENTICATED: "Sign in with an authorized staff account to manage notifications.",
  };
  return messages[code] ?? "The notification service is unavailable. No changes were made. Try again.";
}

export function queueTime(value: string | null) {
  if (!value) return "—";
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) + " WIB"; }
  catch { return value; }
}
