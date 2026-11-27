import type { ManagedStory, StoryContent, PublicStoryBlock, PublicImage } from "@/lib/stories/story-types";
import type { MediaAsset } from "@/lib/media/media-types";
import { parseStoryBody, BLOCK_LIMITS, type StoryBlock, type StoryBlockType, type ImageRef } from "@/lib/stories/story-blocks";

/** Editor blocks carry a client-only key for stable React identity; it is stripped before any request. */
export type EditorBlock = StoryBlock & { key: string };
export type EditorDraft = Omit<StoryContent, "body"> & { blocks: EditorBlock[] };
export type StoryReferences = {
  contentTypes: { code: string; name: string }[];
  categories: { id: string; name: string; slug: string }[];
  tags?: { id: string; name: string; slug: string }[];
  bylines?: { id: string; name: string; roleTitle: string | null }[];
  truncated: boolean;
};
export const STORY_STATUSES = ["draft", "scheduled", "published", "archived"] as const;
export type StoryStatusFilter = (typeof STORY_STATUSES)[number];
export const STORY_PAGE_SIZE = 20;
let sequence = 0;
export function blockKey() { sequence += 1; return `b${sequence}`; }
export function withKeys(blocks: readonly StoryBlock[]): EditorBlock[] { return blocks.map((b) => ({ ...b, key: blockKey() }) as EditorBlock); }
export function initialDraft(story: Omit<ManagedStory, "authorAccountId"> | null, references: StoryReferences): EditorDraft {
  return story ? {
    title: story.title, excerpt: story.excerpt, blocks: withKeys(story.body),
    contentType: story.contentType, categoryId: story.categoryId,
    coverMediaId: story.coverMediaId, visibility: story.visibility, featured: story.featured,
    bylineId: story.bylineId ?? null, tagIds: story.tagIds ?? [],
  } : {
    title: "", excerpt: null, blocks: [{ type: "paragraph", text: "", key: blockKey() }], contentType: references.contentTypes[0]?.code ?? "",
    categoryId: null, coverMediaId: null, visibility: "private", featured: false, bylineId: null, tagIds: [],
  };
}
/** Legacy plain-text helper: blank lines delimit paragraphs, markup is never interpreted. */
export function paragraphs(text: string): string[] {
  return text.replace(/\r\n/g, "\n").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
export function newBlock(type: StoryBlockType): EditorBlock {
  const key = blockKey();
  switch (type) {
    case "heading": return { type, level: 2, text: "", key };
    case "image": return { type, mediaId: "", alt: "", caption: null, key };
    case "gallery": return { type, items: [], key };
    case "quote": return { type, text: "", attribution: null, key };
    case "embed": return { type, provider: "youtube", url: "", key };
    case "cta": return { type, label: "", url: "", key };
    case "divider": return { type, key };
    default: return { type: "paragraph", text: "", key };
  }
}
/** Empty paragraphs are editor scaffolding, not content. */
export function bodyBlocks(blocks: readonly EditorBlock[]): StoryBlock[] {
  return blocks.filter((b) => !(b.type === "paragraph" && !b.text.trim())).map(({ key: _key, ...block }) => {
    if (block.type === "embed") { const { provider: _p, ...rest } = block; return rest as unknown as StoryBlock; }
    return block as StoryBlock;
  });
}
export function storyContent(draft: EditorDraft): StoryContent {
  const { blocks, ...rest } = draft;
  return { ...rest, title: rest.title.trim(), excerpt: rest.excerpt?.trim() || null, body: bodyBlocks(blocks), tagIds: [...rest.tagIds].sort() };
}
/** Comparable snapshot for dirty detection (ignores client keys). */
export function draftSignature(draft: EditorDraft) { return JSON.stringify(storyContent(draft)); }
export function validateStory(draft: EditorDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  const forbidden = /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/;
  if (!draft.title.trim()) errors.title = "Add a Story title.";
  else if (draft.title.length > 240 || forbidden.test(draft.title)) errors.title = "Use up to 240 plain-text characters, without markup.";
  if (draft.excerpt && (draft.excerpt.length > 600 || forbidden.test(draft.excerpt))) errors.excerpt = "Use up to 600 plain-text characters, without markup.";
  if (!draft.contentType) errors.contentType = "Choose a content type.";
  if (draft.tagIds.length > 10) errors.tags = "Use up to 10 tags.";
  const body = bodyBlocks(draft.blocks);
  const parsed = parseStoryBody(body);
  if (!parsed.ok) {
    errors.body = parsed.issue.reason;
    if (parsed.issue.index !== null) {
      // Map the index in the submitted body back to the visible editor block.
      const visible = draft.blocks.filter((b) => !(b.type === "paragraph" && !b.text.trim()));
      const block = visible[parsed.issue.index];
      if (block) errors[`block:${block.key}`] = parsed.issue.reason;
    }
  }
  return errors;
}
export { BLOCK_LIMITS };
/** Preview uses the same public render model as /stories/[slug]. */
export function previewBlocks(blocks: readonly EditorBlock[], media: ReadonlyMap<string, MediaAsset>): PublicStoryBlock[] {
  const image = (ref: ImageRef): PublicImage | null => { const m = media.get(ref.mediaId); return m && m.deliveryAvailable && m.url ? { media: m, alt: ref.alt, caption: ref.caption } : null; };
  const out: PublicStoryBlock[] = [];
  for (const b of bodyBlocks(blocks)) {
    if (b.type === "image") { const i = image(b); if (i) out.push({ type: "image", ...i }); }
    else if (b.type === "gallery") { const items = b.items.map(image).filter((i): i is PublicImage => i !== null); if (items.length) out.push({ type: "gallery", items }); }
    else if (b.type === "embed") { const parsed = parseStoryBody([b]); if (parsed.ok) out.push(parsed.blocks[0] as PublicStoryBlock); }
    else out.push(b);
  }
  return out;
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
    STORY_SLUG_TAKEN: "That URL is already in use. Try another title or slug and save again.",
    STORY_INVALID_STATE: "This action is not available in the Story's current state. Refresh to see the latest status.",
    STORY_INVALID_CONTENT: "Review the title, excerpt and content blocks before saving.",
    STORY_INVALID_INPUT: "Review the Story fields and try again.", STORY_MEDIA_INVALID: "Choose active library images with the required visibility (public Stories need public images).",
    STORY_INVALID_REFERENCE: "Choose an active content type, category, byline and existing tags.",
    STORY_NOT_PUBLISHABLE: "Add a title, at least one content block and a valid cover image before publishing or scheduling.",
    STORY_TAXONOMY_IN_USE: "This item is still used by at least one Story (including archived ones). Reassign those Stories or deactivate it instead.",
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
