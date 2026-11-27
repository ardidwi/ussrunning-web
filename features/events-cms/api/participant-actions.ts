"use server";
import { revalidatePath } from "next/cache";
import { cancelEventParticipant, exportEventParticipantsCsv } from "@/lib/registrations/registration-actions";

/** Staff cancellation with a mandatory reason; authorization, validation and audit happen in lib/registrations. */
export async function cancelParticipant(input: { eventId: string; registrationId: string; expectedVersion: string; reason: string }) {
  const result = await cancelEventParticipant(input);
  if (result.ok) revalidatePath("/admin");
  return result.ok ? { ok: true as const, status: result.data.status } : result;
}

/** Bounded, permission-checked, audited CSV (built server-side, downloaded by the browser as a Blob). */
export async function exportParticipants(input: { eventId: string; status?: string }) {
  return exportEventParticipantsCsv(input.status ? { eventId: input.eventId, status: input.status } : { eventId: input.eventId });
}
