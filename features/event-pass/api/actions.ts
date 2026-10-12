"use server";
import { revalidatePath } from "next/cache";
import {
  getCurrentEventPass,
  issueCurrentEventPass,
} from "@/lib/passes/pass-actions";
import { getCurrentRegistration } from "@/lib/registrations/registration-actions";
import { restrictedAccount } from "@/features/event-registration/model";
import {
  activePassMatches,
  type PassReference,
  type PassScreenResult,
} from "../model";

export async function readEventPass(
  reference: PassReference,
): Promise<PassScreenResult> {
  const ref = {
    eventId: reference.eventId,
    registrationId: reference.registrationId,
  };
  const registration = await getCurrentRegistration(ref);
  if (!registration.ok) return registration;
  const pass = await getCurrentEventPass(ref);
  if (!pass.ok && restrictedAccount(pass.code)) return pass;
  if (pass.ok && !activePassMatches(pass.data, ref))
    return { ok: false, code: "EVENT_PASS_UNAVAILABLE" };
  return { ok: true, data: { registration: registration.data, pass } };
}
export async function requestEventPass(
  reference: PassReference,
): Promise<PassScreenResult> {
  const ref = {
    eventId: reference.eventId,
    registrationId: reference.registrationId,
  };
  const issued = await issueCurrentEventPass(ref);
  if (!issued.ok) return issued;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  return readEventPass(ref);
}
export async function readPassEntry(
  reference: PassReference,
): Promise<{ ok: true; available: boolean } | { ok: false; code: string }> {
  const ref = {
    eventId: reference.eventId,
    registrationId: reference.registrationId,
  };
  const result = await getCurrentEventPass(ref);
  if (!result.ok) return result;
  // List navigation never serializes the credential.
  return activePassMatches(result.data, ref)
    ? { ok: true, available: true }
    : { ok: false, code: "EVENT_PASS_UNAVAILABLE" };
}
