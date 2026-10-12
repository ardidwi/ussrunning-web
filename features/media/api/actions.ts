"use server";
import { listMediaAssets } from "@/lib/media/media-service";
import { MediaError } from "@/lib/media/media-errors";
import { AccountError } from "@/lib/auth/errors";
import type { MediaPage } from "@/lib/media/media-types";
import type { MediaCode } from "@/lib/media/media-errors";
import type { AccountErrorCode } from "@/lib/auth/errors";
export type MediaListResult = { ok: true; data: MediaPage } | { ok: false; code: MediaCode | AccountErrorCode };
/** Read-only BE-11 adapter. Storage/upload semantics remain in the backend service. */
export async function listPickerMedia(cursor?: string): Promise<MediaListResult> {
  try { return { ok: true, data: await listMediaAssets({ limit: 20, status: "active", ...(cursor ? { cursor } : {}) }) }; }
  catch (error) { return { ok: false, code: error instanceof MediaError || error instanceof AccountError ? error.code : "MEDIA_UNAVAILABLE" }; }
}
