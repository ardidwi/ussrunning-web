import type { GalleryContent, ManagedGallery } from "@/lib/gallery/gallery-types";

export const GALLERY_PAGE_SIZE = 20;
export const GALLERY_ITEM_PAGE_SIZE = 100;
export const GALLERY_STATUSES = ["draft", "published", "archived"] as const;
export type GalleryStatusFilter = (typeof GALLERY_STATUSES)[number];
export type GalleryDraft = GalleryContent;
export const emptyDraft: GalleryDraft = { title: "", description: null, visibility: "private", eventId: null, coverMediaId: null };
export function galleryDraft(value: ManagedGallery | null): GalleryDraft {
  return value ? { title: value.title, description: value.description, visibility: value.visibility, eventId: value.eventId, coverMediaId: value.coverMediaId } : { ...emptyDraft };
}
export function galleryContent(value: GalleryDraft): GalleryContent {
  return { ...value, title: value.title.trim(), description: value.description?.trim() || null };
}
export function galleryHref(fields: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ module: "gallery" });
  for (const [key, value] of Object.entries(fields)) if (value) params.set(key, value);
  return `/admin?${params}`;
}
export function galleryTime(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)} WIB` : "Time unavailable";
}
export function galleryMessage(code: string) {
  const messages: Record<string, string> = {
    GALLERY_NOT_FOUND: "This Gallery is no longer available.", GALLERY_FORBIDDEN: "You do not have permission to manage this Gallery.",
    GALLERY_CONFLICT: "This Gallery changed since you opened it. Reload the latest version before editing again.",
    GALLERY_ORDER_CONFLICT: "The Gallery item order changed. Reload the full item set before reordering again.",
    GALLERY_SLUG_TAKEN: "That Gallery URL is already in use. Try another title and save again.",
    GALLERY_INVALID_STATE: "Unpublish this Gallery before changing its content or items. Refresh to see the latest status.",
    GALLERY_INVALID_CONTENT: "Review the plain-text title, description, captions and alt text.",
    GALLERY_INVALID_INPUT: "Review the Gallery fields and try again.",
    GALLERY_MEDIA_INVALID: "Choose an active image with the required visibility.",
    GALLERY_INVALID_REFERENCE: "Choose a valid event reference, or leave the event unset.",
    GALLERY_NOT_PUBLISHABLE: "Add an eligible image item and review cover, media visibility and event before publishing.",
    GALLERY_ITEM_NOT_FOUND: "This item is no longer in the Gallery. Reload the latest items.",
    GALLERY_UNAVAILABLE: "Galleries are temporarily unavailable. Your changes were not saved.",
    UNAUTHENTICATED: "Sign in again to continue.", EMAIL_NOT_VERIFIED: "Verify your account before managing Galleries.",
    ACCOUNT_SUSPENDED: "Your account is currently suspended.", ACCOUNT_DEACTIVATED: "Your account is no longer active.",
  };
  return messages[code] ?? "We couldn't complete that action. Please try again.";
}
const forbidden = /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/;
export function validateGallery(value: GalleryDraft) {
  const errors: Record<string, string> = {};
  if (!value.title.trim()) errors.title = "Add a Gallery title.";
  else if (value.title.length > 240 || forbidden.test(value.title)) errors.title = "Use up to 240 plain-text characters without markup.";
  if (value.description && (value.description.length > 4000 || forbidden.test(value.description))) errors.description = "Use up to 4,000 plain-text characters without markup.";
  return errors;
}
export function validateItemText(caption: string, alt: string) {
  const errors: Record<string, string> = {};
  if (caption.length > 2000 || forbidden.test(caption)) errors.caption = "Use up to 2,000 plain-text characters without markup.";
  if (alt.length > 1000 || forbidden.test(alt)) errors.alt = "Use up to 1,000 plain-text characters without markup.";
  return errors;
}
/** Exact-set validation is presentation safety; BE-13 remains the final authority. */
export function exactOrder(activeIds: string[], nextCursor: string | null, orderedIds: string[]) {
  return nextCursor === null && activeIds.length === orderedIds.length && new Set(activeIds).size === activeIds.length && new Set(orderedIds).size === orderedIds.length && activeIds.every((id) => orderedIds.includes(id));
}
