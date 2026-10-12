import type { EventPassDTO } from "@/lib/passes/pass-types";
import type { PassResult } from "@/lib/passes/pass-actions";
import type { RegistrationDTO } from "@/lib/registrations/registration-types";
export type PassReference = { eventId: string; registrationId: string };
export type PassRead =
  PassResult<EventPassDTO> | { ok: false; code: "NETWORK_ERROR" };
export type PassScreenResult =
  | { ok: true; data: { registration: RegistrationDTO; pass: PassRead } }
  | { ok: false; code: string };
export const passMessages: Record<string, string> = {
  REGISTRATION_NOT_FOUND:
    "We couldn't find this registration. Open your registration history for the correct pass link.",
  REGISTRATION_VALIDATION_ERROR:
    "This pass link is incomplete or invalid. Open your registration history for the correct link.",
  EVENT_PASS_NOT_FOUND:
    "No Event Pass has been issued for this registration yet.",
  EVENT_PASS_NOT_ELIGIBLE:
    "This registration or event is not currently eligible for an Event Pass.",
  EVENT_PASS_REVOKED:
    "This Event Pass is no longer valid. Do not present a previous screenshot at check-in.",
  EVENT_PASS_EXPIRED:
    "This Event Pass has expired and cannot be used at check-in.",
  EVENT_PASS_PROTOCOL_UNSUPPORTED:
    "This pass cannot be displayed. Contact USS Running support.",
  EVENT_PASS_NOT_CONFIGURED:
    "Event Passes are temporarily unavailable. Please try again later.",
  EVENT_PASS_UNAVAILABLE: "We couldn't load your Event Pass. Please try again.",
  EVENT_PASS_VALIDATION_ERROR:
    "This pass link is incomplete or invalid. Open your registration history for the correct link.",
  NETWORK_ERROR:
    "We couldn't connect. Refresh to check the current pass status before trying again.",
};
export function passPath(ref: PassReference) {
  return `/dashboard/registrations/${encodeURIComponent(ref.registrationId)}?eventId=${encodeURIComponent(ref.eventId)}`;
}
export function activePassMatches(pass: EventPassDTO, ref: PassReference) {
  if (!pass || typeof pass !== "object") return false;
  return (
    pass.status === "active" &&
    pass.formatVersion === 1 &&
    pass.barcode?.formatVersion === 1 &&
    pass.eventId === ref.eventId &&
    pass.registrationId === ref.registrationId &&
    /^USS-EVENT:1:[A-Za-z0-9_-]{43}$/.test(pass.barcode.value)
  );
}
