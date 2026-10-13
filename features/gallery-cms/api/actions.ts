"use server";
import { revalidatePath } from "next/cache";
import * as gallery from "@/lib/gallery/gallery-actions";
import { getManagedEventList } from "@/lib/events/event-actions";

async function mutation(result: ReturnType<typeof gallery.createGallery>) {
  const response = await result;
  if (response.ok) revalidatePath("/admin");
  return response;
}
/** BE-13 is the only Gallery writer and permission authority. */
export async function createEditorGallery(input: unknown) { return mutation(gallery.createGallery(input)); }
export async function updateEditorGallery(input: unknown) { return mutation(gallery.updateGallery(input)); }
export async function publishEditorGallery(input: unknown) { return mutation(gallery.publishGallery(input)); }
export async function unpublishEditorGallery(input: unknown) { return mutation(gallery.unpublishGallery(input)); }
export async function archiveEditorGallery(input: unknown) { return mutation(gallery.archiveGallery(input)); }
export async function addEditorGalleryItem(input: unknown) { return mutation(gallery.addGalleryItem(input)); }
export async function updateEditorGalleryItem(input: unknown) { return mutation(gallery.updateGalleryItem(input)); }
export async function removeEditorGalleryItem(input: unknown) { return mutation(gallery.removeGalleryItem(input)); }
export async function reorderEditorGalleryItems(input: unknown) { return mutation(gallery.reorderGalleryItems(input)); }
export async function readEditorGallery(input: unknown) { return gallery.getManagedGallery(input); }
export async function readEditorGalleryItems(input: unknown) { return gallery.listManagedGalleryItems(input); }
export async function readEditorGalleryRevisions(input: unknown) { return gallery.listGalleryRevisions(input); }
/** A bounded, trusted BE-07 selector; unavailable event permission never invents options. */
export async function readGalleryEventOptions(cursor?: string) {
  const response = await getManagedEventList({ limit: 20, ...(cursor ? { cursor } : {}) });
  return response.ok ? { ok: true as const, data: { items: response.data.items.map(({ id, title, status }) => ({ id, title, status })), nextCursor: response.data.nextCursor } } : response;
}
