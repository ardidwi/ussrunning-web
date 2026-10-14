"use server";
import { revalidatePath } from "next/cache";
import { createManagedEvent, updateManagedEvent, changeEventLifecycle, getManagedEventDetail } from "@/lib/events/event-actions";
import type { CreateEventInput, UpdateEventInput, TransitionEventInput } from "@/lib/events/event-types";
import { getMediaAsset } from "@/lib/media/media-service";
import type { MediaAsset } from "@/lib/media/media-types";
async function refresh<T extends { ok: boolean }>(result: T) { if (result.ok) { revalidatePath("/admin"); revalidatePath("/runs"); } return result; }
export async function createEditorEvent(input: CreateEventInput) { return refresh(await createManagedEvent(input)); }
export async function updateEditorEvent(input: UpdateEventInput) { return refresh(await updateManagedEvent(input)); }
export async function transitionEditorEvent(input: TransitionEventInput) { return refresh(await changeEventLifecycle(input)); }
export async function readEditorEvent(id: string) { return getManagedEventDetail(id); }
export async function readEventCover(id: string): Promise<{ ok: true; data: MediaAsset } | { ok: false; code: "MEDIA_UNAVAILABLE" }> {
  try { return { ok: true, data: await getMediaAsset({ id }) }; } catch { return { ok: false, code: "MEDIA_UNAVAILABLE" }; }
}
