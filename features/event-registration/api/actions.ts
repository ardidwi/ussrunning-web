"use server";
import { revalidatePath } from "next/cache";
import {
  cancelCurrentRegistration,
  getCurrentRegistrationHistory,
  registerCurrentAccountForEvent,
} from "@/lib/registrations/registration-actions";
import type { CancelRegistrationInput } from "@/lib/registrations/registration-types";
export async function readHistory(
  cursor: string | null = null,
  eventId?: string,
) {
  return getCurrentRegistrationHistory({
    limit: 20,
    ...(cursor ? { cursor } : {}),
    ...(eventId ? { eventId } : {}),
  });
}
function invalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/events");
  revalidatePath("/runs", "layout");
}
export async function registerForEvent(eventId: string) {
  const result = await registerCurrentAccountForEvent({ eventId });
  if (result.ok) invalidate();
  return result;
}
export async function requestCancellation(input: CancelRegistrationInput) {
  const result = await cancelCurrentRegistration({
    eventId: input.eventId,
    registrationId: input.registrationId,
    expectedVersion: input.expectedVersion,
  });
  if (result.ok) invalidate();
  return result;
}
