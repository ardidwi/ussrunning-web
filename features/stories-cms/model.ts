import type { ManagedStory, StoryContent } from "@/lib/stories/story-types";

export type EditorDraft = Omit<StoryContent, "body"> & { bodyText: string };
export type StoryReferences = {
  contentTypes: { code: string; name: string }[];
  categories: { id: string; name: string; slug: string }[];
  truncated: boolean;
};
export const STORY_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type StoryStatusFilter = (typeof STORY_STATUSES)[number];
export const STORY_PAGE_SIZE = 20;
export function initialDraft(story: Omit<ManagedStory, "authorAccountId"> | null, references: StoryReferences): EditorDraft {
  return story ? {
    title: story.title, excerpt: story.excerpt, bodyText: story.body.join("\n\n"),
    contentType: story.contentType, categoryId: story.categoryId,
    coverMediaId: story.coverMediaId, visibility: story.visibility, featured: story.featured,
  } : {
    title: "", excerpt: null, bodyText: "", contentType: references.contentTypes[0]?.code ?? "",
    categoryId: null, coverMediaId: null, visibility: "private", featured: false,
  };
}
export function paragraphs(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
export function storyContent(draft: EditorDraft): StoryContent {
  const { bodyText, ...rest } = draft;
  return { ...rest, title: rest.title.trim(), excerpt: rest.excerpt?.trim() || null, body: paragraphs(bodyText) };
}
export function validateStory(draft: EditorDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const body = paragraphs(draft.bodyText);
  const forbidden = /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/;
  if (!draft.title.trim()) errors.title = "Add a Story title.";
  else if (draft.title.length > 240 || forbidden.test(draft.title)) errors.title = "Use up to 240 plain-text characters, without markup.";
  if (draft.excerpt && (draft.excerpt.length > 600 || forbidden.test(draft.excerpt))) errors.excerpt = "Use up to 600 plain-text characters, without markup.";
  if (!draft.contentType) errors.contentType = "Choose a content type.";
  if (body.length > 100 || body.some((part) => part.length > 4000 || forbidden.test(part)) || new TextEncoder().encode(JSON.stringify(body)).length > 64000)
    errors.bodyText = "Use up to 100 plain-text paragraphs, 4,000 characters each and 64 KB total.";
  return errors;
}
export function storyHref(fields: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ module: "stories" });
  for (const [key, value] of Object.entries(fields)) if (value) params.set(key, value);
  return "/admin?" + params.toString();
}
export function storyMessage(code: string): string {
  const messages: Record<string, string> = {
    STORY_NOT_FOUND: "This Story is no longer available.", STORY_FORBIDDEN: "You do not have permission to manage this Story.",
    STORY_CONFLICT: "This Story changed since you opened it. Reload the latest version before editing again.",
    STORY_SLUG_TAKEN: "That Story URL is already in use. Try another title and save again.",
    STORY_INVALID_STATE: "This action is not available in the Story's current state. Refresh to see the latest status.",
    STORY_INVALID_CONTENT: "Review the title, excerpt and plain-text body before saving.",
    STORY_INVALID_INPUT: "Review the Story fields and try again.", STORY_MEDIA_INVALID: "Choose an active cover image with the required visibility.",
    STORY_INVALID_REFERENCE: "Choose an active content type and category.",
    STORY_NOT_PUBLISHABLE: "Add a valid cover image before publishing or scheduling.",
    STORY_UNAVAILABLE: "Stories are temporarily unavailable. Your changes were not saved.",
    UNAUTHENTICATED: "Sign in again to continue.", EMAIL_NOT_VERIFIED: "Verify your account before managing Stories.",
    ACCOUNT_SUSPENDED: "Your account is currently suspended.", ACCOUNT_DEACTIVATED: "Your account is no longer active.",
  };
  return messages[code] ?? "We couldn't complete that action. Please try again.";
}
export const STORY_TIME_ZONE = "Asia/Jakarta";
export function storyTime(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: STORY_TIME_ZONE }).format(date) + " WIB" : "Time unavailable";
}
/** Editorial scheduling is entered explicitly in Jakarta time, never browser-local time. */
export function jakartaSchedule(value: string): string | null {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const iso = `${value}:00+07:00`;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || new Intl.DateTimeFormat("sv-SE", { timeZone: STORY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(" ", "T") !== value) return null;
  return iso;
}
