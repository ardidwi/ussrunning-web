import type { RegistrationStatus } from "@/lib/db/types";

export const PARTICIPANT_STATUSES: readonly RegistrationStatus[] = ["pending", "confirmed", "waitlisted", "cancelled", "rejected"];
export const STAFF_CANCELLABLE: readonly RegistrationStatus[] = ["pending", "confirmed", "waitlisted"];
export const PARTICIPANTS_MODULE = "participants";

export function participantsHref(values: Record<string, string> = {}, module: string = PARTICIPANTS_MODULE) {
  return `/admin?${new URLSearchParams({ module, ...values })}`;
}

export function statusTone(status: RegistrationStatus): "success" | "error" | "warning" | "info" {
  return status === "confirmed" ? "success" : status === "cancelled" || status === "rejected" ? "error" : status === "waitlisted" ? "warning" : "info";
}

export function participantTime(value: string | null, timezone: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

/** Client-side hint only; the server re-validates (5–240 plain-text characters). */
export function reasonError(reason: string) {
  const value = reason.trim();
  if (value.length < 5) return "Give a reason of at least 5 characters. It is stored in the audit history.";
  if (value.length > 240) return "Keep the reason under 240 characters.";
  if (/[<>]/.test(value)) return "Use plain text without < or >.";
  return "";
}

export function participantMessage(code: string) {
  const messages: Record<string, string> = {
    REGISTRATION_CONFLICT: "This registration changed since the page loaded. Reload and review before cancelling again.",
    REGISTRATION_NOT_CANCELLABLE: "This registration can no longer be cancelled (for example, the runner already checked in).",
    REGISTRATION_NOT_FOUND: "This registration could not be found for this event.",
    REGISTRATION_NOT_AVAILABLE: "This event could not be found.",
    REGISTRATION_VALIDATION_ERROR: "The request was rejected. Check the reason and filters, then try again.",
    INSUFFICIENT_PERMISSION: "You do not have permission to manage event participants.",
    UNAUTHENTICATED: "Sign in with an authorized staff account to manage participants.",
    REGISTRATION_UNAVAILABLE: "The participant service is unavailable. No changes were made. Try again.",
  };
  return messages[code] ?? "The participant service is unavailable. No changes were made. Try again.";
}
