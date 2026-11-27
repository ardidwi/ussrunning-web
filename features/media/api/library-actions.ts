"use server";
import { revalidatePath, updateTag } from "next/cache";
import { finalizeMediaUpload, getMediaUsage, listMediaLibrary, requestMediaUpload, softDeleteMedia, updateMediaMetadata } from "@/lib/media/media-service";
import { MediaError } from "@/lib/media/media-errors";
import { AccountError } from "@/lib/auth/errors";
import { STORY_CACHE_TAG } from "@/lib/stories/story-cache";
import type { MediaCode } from "@/lib/media/media-errors";
import type { AccountErrorCode } from "@/lib/auth/errors";

export type MediaActionResult<T> = { ok: true; data: T } | { ok: false; code: MediaCode | AccountErrorCode };
async function run<T>(fn: () => Promise<T>): Promise<MediaActionResult<T>> {
  try { return { ok: true, data: await fn() }; }
  catch (error) { return { ok: false, code: error instanceof MediaError || error instanceof AccountError ? error.code : "MEDIA_UNAVAILABLE" }; }
}
/** Library adapters. The media service owns validation, permission (cms.content.manage) and audit. */
export async function listLibraryMedia(input: unknown) { return run(() => listMediaLibrary(input)); }
export async function getLibraryMediaUsage(input: unknown) { return run(() => getMediaUsage(input)); }
/** Metadata only (name, type, size, alt): the file itself goes straight to storage via the returned URL. */
export async function requestLibraryUpload(input: unknown) { return run(() => requestMediaUpload(input)); }
export async function finalizeLibraryUpload(input: unknown) { const r = await run(() => finalizeMediaUpload(input)); if (r.ok) revalidatePath("/admin"); return r; }
/** Alt/caption/visibility can change what public Stories render, so expire the public Story cache. */
export async function updateLibraryMedia(input: unknown) { const r = await run(() => updateMediaMetadata(input)); if (r.ok) { revalidatePath("/admin"); updateTag(STORY_CACHE_TAG); } return r; }
export async function archiveLibraryMedia(input: unknown) { const r = await run(() => softDeleteMedia(input)); if (r.ok) revalidatePath("/admin"); return r; }
