import type { MediaUsage } from "@/lib/media/media-types";

export const LIBRARY_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export const LIBRARY_PAGE_SIZE = 24;
/** UX hint only; the server policy (MEDIA_MAX_UPLOAD_BYTES) is authoritative and re-checked after upload. */
export const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
export type LibraryQuery = { q: string; mime: string; status: "active" | "archived"; visibility: "" | "public" | "private"; cursor: string };

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
/** Validates raw /admin search params; invalid values fall back to defaults instead of reaching the service. */
export function libraryQuery(query: Record<string, string | string[] | undefined>): LibraryQuery {
  const q = one(query.q).trim().slice(0, 120), mime = one(query.mime), status = one(query.status), visibility = one(query.visibility), cursor = one(query.cursor);
  return {
    q: /[<>\x00-\x1f]/.test(q) ? "" : q,
    mime: (LIBRARY_MIMES as readonly string[]).includes(mime) ? mime : "",
    status: status === "archived" ? "archived" : "active",
    visibility: visibility === "public" || visibility === "private" ? visibility : "",
    cursor: cursor.length <= 1024 && /^[A-Za-z0-9_-]*$/.test(cursor) ? cursor : "",
  };
}
export function serviceFilters(q: LibraryQuery, limit = LIBRARY_PAGE_SIZE) {
  return { limit, status: q.status, ...(q.q ? { q: q.q } : {}), ...(q.mime ? { mime: q.mime } : {}), ...(q.visibility ? { visibility: q.visibility } : {}), ...(q.cursor ? { cursor: q.cursor } : {}) };
}
export function mediaHref(fields: Partial<Record<keyof LibraryQuery | "id", string>> = {}) {
  const params = new URLSearchParams({ module: "media" });
  for (const [key, value] of Object.entries(fields)) if (value && !(key === "status" && value === "active")) params.set(key, value);
  return "/admin?" + params.toString();
}
/** Pre-flight checks before asking the server for an upload URL. */
export function fileProblem(file: { type: string; size: number }, maxBytes = DEFAULT_MAX_BYTES): string | null {
  if (!(LIBRARY_MIMES as readonly string[]).includes(file.type)) return "Only JPEG, PNG and WebP images can be uploaded.";
  if (file.size <= 0) return "This file is empty.";
  if (file.size > maxBytes) return `This file is larger than ${Math.round(maxBytes / 1048576)} MB.`;
  return null;
}
export function safeFilename(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "image";
  return base.replace(/[<>\x00-\x1f]/g, "-").replace(/\.{2,}/g, ".").slice(-255) || "image";
}
export function altProblem(alt: string) {
  if (!alt.trim()) return "Alt text is required. Describe what the image shows.";
  if (alt.length > 512 || /[<>]/.test(alt)) return "Use up to 512 plain-text characters.";
  return null;
}
export function formatBytes(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`; }
const KIND: Record<MediaUsage["kind"], string> = { story: "Story", gallery: "Gallery", event: "Event", partner: "Partner", site_content: "Website" };
export function usageLabel(u: MediaUsage) { return `${KIND[u.kind]} · ${u.role.replace(/_/g, " ")}`; }
export function usageHref(u: MediaUsage) {
  const module = { story: "stories", gallery: "gallery", event: "events", partner: "partners", site_content: "content" }[u.kind];
  return u.kind === "site_content" ? `/admin?module=${module}` : `/admin?module=${module}&view=edit&id=${encodeURIComponent(u.entityId)}`;
}
export function mediaMessage(code: string): string {
  const m: Record<string, string> = {
    MEDIA_UNSUPPORTED_TYPE: "Only JPEG, PNG and WebP images are supported.",
    MEDIA_TOO_LARGE: "The file is larger than the upload limit.",
    MEDIA_INVALID_CONTENT: "The uploaded file is not a valid image of the stated type. It was discarded.",
    MEDIA_INVALID_DIMENSIONS: "The image dimensions are outside the allowed range. It was discarded.",
    MEDIA_ALT_REQUIRED: "Alt text is required.",
    MEDIA_VALIDATION_ERROR: "Review the details and try again.",
    MEDIA_NOT_FOUND: "This media item is no longer available.",
    MEDIA_FORBIDDEN: "You do not have permission to manage media.",
    MEDIA_STORAGE_UNAVAILABLE: "Media storage is not available right now. Nothing was uploaded.",
    MEDIA_CONFLICT: "This item changed since you opened it. Reload and try again.",
    MEDIA_IN_USE: "This image is still used (or appears in content history), so it cannot be archived.",
    MEDIA_UPLOAD_FAILED: "The upload did not complete. Try again.",
    MEDIA_UPLOAD_EXPIRED: "The upload link expired. Start the upload again.",
    MEDIA_UPLOAD_INCOMPLETE: "The file has not reached storage yet. Try again in a moment.",
    MEDIA_RATE_LIMITED: "Too many uploads in a short time. Wait a minute and try again.",
    MEDIA_NOT_CONFIGURED: "Media settings are misconfigured. Contact an administrator.",
    MEDIA_UNAVAILABLE: "The media library is temporarily unavailable.",
    UNAUTHENTICATED: "Sign in again to continue.", EMAIL_NOT_VERIFIED: "Verify your account before managing media.",
    ACCOUNT_SUSPENDED: "Your account is currently suspended.", ACCOUNT_DEACTIVATED: "Your account is no longer active.",
  };
  return m[code] ?? "We couldn't complete that action. Please try again.";
}
