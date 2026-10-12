import type { RegistrationResult } from "@/lib/registrations/registration-actions";
import type {
  RegistrationDTO,
  RegistrationPage,
} from "@/lib/registrations/registration-types";
export type HistoryResult =
  | RegistrationResult<RegistrationPage<RegistrationDTO>>
  | { ok: false; code: "NETWORK_ERROR" };
export type MutationResult =
  RegistrationResult<RegistrationDTO> | { ok: false; code: "NETWORK_ERROR" };
export const registrationLabels = {
  confirmed: "Confirmed",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  pending: "Pending review",
  rejected: "Not approved",
} as const;
export function eventDate(value: string, timezone: string) {
  try {
    return (
      new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value)) + ` (${timezone})`
    );
  } catch {
    return "Date unavailable";
  }
}
export const registrationMessages: Record<string, string> = {
  NETWORK_ERROR: "We couldn’t confirm the result. Reload before trying again.",
  REGISTRATION_UNAVAILABLE:
    "Registration is temporarily unavailable. Reload to check your saved registration.",
  REGISTRATION_CLOSED: "Registration is closed or has not opened yet.",
  REGISTRATION_NOT_AVAILABLE: "This event is not accepting registrations.",
  EVENT_CAPACITY_FULL: "This event is full and does not accept a waitlist.",
  REGISTRATION_CONFLICT:
    "Your registration changed. Reload it before trying again.",
  REGISTRATION_NOT_CANCELLABLE:
    "This registration cannot be cancelled now. Your place has not been changed.",
  REGISTRATION_CONFIGURATION_UNSUPPORTED:
    "Online registration is not available for this event yet.",
  REGISTRATION_PENDING: "Your registration is awaiting review.",
  REGISTRATION_REJECTED:
    "This registration was not approved. Contact USS Running for help.",
  REGISTRATION_NOT_FOUND: "This registration is no longer available.",
  REGISTRATION_VALIDATION_ERROR:
    "We couldn't process this request. Reload and try again.",
};

export function restrictedAccount(code: string) {
  return [
    "UNAUTHENTICATED",
    "EMAIL_NOT_VERIFIED",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DEACTIVATED",
    "ACCOUNT_NOT_PROVISIONED",
    "INSUFFICIENT_PERMISSION",
    "AUTH_NOT_CONFIGURED",
    "AUTH_UNAVAILABLE",
    "AUTHORIZATION_UNAVAILABLE",
  ].includes(code);
}
