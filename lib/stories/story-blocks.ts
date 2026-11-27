// D3.3 Story block schema. Isomorphic and dependency-free: the server uses it as the authoritative
// validator, the editor reuses it for immediate feedback. Text is always plain text; nothing here is
// ever rendered as HTML. Embeds are reduced to an allowlisted provider + canonical URL.

export const BLOCK_TYPES = ["paragraph", "heading", "image", "gallery", "quote", "embed", "cta", "divider"] as const;
export type StoryBlockType = (typeof BLOCK_TYPES)[number];
export const EMBED_PROVIDERS = ["youtube", "vimeo", "spotify", "instagram", "strava"] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

export type ParagraphBlock = { type: "paragraph"; text: string };
export type HeadingBlock = { type: "heading"; level: 2 | 3; text: string };
export type ImageRef = { mediaId: string; alt: string; caption: string | null };
export type ImageBlock = { type: "image" } & ImageRef;
export type GalleryBlock = { type: "gallery"; items: ImageRef[] };
export type QuoteBlock = { type: "quote"; text: string; attribution: string | null };
export type EmbedBlock = { type: "embed"; provider: EmbedProvider; url: string };
export type CtaBlock = { type: "cta"; label: string; url: string };
export type DividerBlock = { type: "divider" };
export type StoryBlock = ParagraphBlock | HeadingBlock | ImageBlock | GalleryBlock | QuoteBlock | EmbedBlock | CtaBlock | DividerBlock;

export const BLOCK_LIMITS = {
  blocks: 100, bodyBytes: 64000, paragraph: 4000, heading: 200, quote: 1000, attribution: 120,
  alt: 512, caption: 300, ctaLabel: 60, url: 500, galleryMin: 2, galleryMax: 12, mediaRefs: 40,
} as const;

export type BlockIssue = { index: number | null; reason: string };
export type BodyResult = { ok: true; blocks: StoryBlock[] } | { ok: false; issue: BlockIssue };

const UNSAFE = /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Invalid extends Error {}
function fail(reason: string): never { throw new Invalid(reason); }
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Each block must be an object.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((k) => !keys.includes(k))) fail("Unsupported block field.");
  return v;
}
function plain(value: unknown, max: number, label: string, optional = false): string | null {
  if (optional && (value === null || value === undefined || value === "")) return null;
  if (typeof value !== "string" || value.length > max || UNSAFE.test(value)) fail(`${label} must be plain text up to ${max} characters, without < or >.`);
  const t = value.trim();
  if (!t) { if (optional) return null; fail(`${label} is required.`); }
  return t;
}
function mediaId(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) fail("Choose an image from the media library.");
  return value.toLowerCase();
}
function imageRef(value: unknown, keys: readonly string[]): ImageRef {
  const v = record(value, keys);
  return { mediaId: mediaId(v.mediaId), alt: plain(v.alt, BLOCK_LIMITS.alt, "Alt text")!, caption: plain(v.caption, BLOCK_LIMITS.caption, "Caption", true) };
}

/** Canonical, allowlisted embed target. Anything else (other hosts, http, credentials, odd paths) is refused. */
export function embedTarget(raw: unknown): { provider: EmbedProvider; url: string; frameSrc: string | null; title: string } | null {
  if (typeof raw !== "string" || raw.length > BLOCK_LIMITS.url) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  if (host === "youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? parts[0] : parts[0] === "watch" || parts.length === 0 ? u.searchParams.get("v") : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1] : null;
    if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return { provider: "youtube", url: `https://www.youtube.com/watch?v=${id}`, frameSrc: `https://www.youtube-nocookie.com/embed/${id}`, title: "YouTube video" };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = host === "player.vimeo.com" ? (parts[0] === "video" ? parts[1] : null) : parts[0];
    if (!id || !/^\d{1,12}$/.test(id)) return null;
    return { provider: "vimeo", url: `https://vimeo.com/${id}`, frameSrc: `https://player.vimeo.com/video/${id}?dnt=1`, title: "Vimeo video" };
  }
  if (host === "open.spotify.com") {
    const [kind, id] = parts[0] === "embed" ? parts.slice(1) : parts;
    if (!["track", "album", "playlist", "episode", "show"].includes(kind) || !id || !/^[A-Za-z0-9]{22}$/.test(id)) return null;
    return { provider: "spotify", url: `https://open.spotify.com/${kind}/${id}`, frameSrc: `https://open.spotify.com/embed/${kind}/${id}`, title: "Spotify player" };
  }
  if (host === "instagram.com") {
    if (!["p", "reel"].includes(parts[0]) || !parts[1] || !/^[A-Za-z0-9_-]{5,40}$/.test(parts[1])) return null;
    // Link card only: Instagram's embed needs a third-party script, which the public site never loads.
    return { provider: "instagram", url: `https://www.instagram.com/${parts[0]}/${parts[1]}/`, frameSrc: null, title: "Instagram post" };
  }
  if (host === "strava.com") {
    if (!["activities", "routes", "segments"].includes(parts[0]) || !parts[1] || !/^\d{1,20}$/.test(parts[1])) return null;
    return { provider: "strava", url: `https://www.strava.com/${parts[0]}/${parts[1]}`, frameSrc: null, title: "Strava " + parts[0].replace(/s$/, "") };
  }
  return null;
}

/** CTA destinations: https URLs without credentials, or a same-site path. Never javascript:/data:/protocol-relative. */
export function ctaUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > BLOCK_LIMITS.url) return null;
  const v = raw.trim();
  if (/^\/(?!\/)[A-Za-z0-9\-._~/?#[\]@!$&'()*+,;=%]*$/.test(v) && !v.includes("\\")) return v;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return u.toString();
  } catch { return null; }
}

function block(value: unknown): StoryBlock {
  // Legacy bodies (string[]) convert to paragraphs; the stored value is never rewritten in place.
  if (typeof value === "string") return { type: "paragraph", text: plain(value, BLOCK_LIMITS.paragraph, "Paragraph")! };
  const type = (value && typeof value === "object" && !Array.isArray(value) ? (value as { type?: unknown }).type : undefined) as StoryBlockType | undefined;
  switch (type) {
    case "paragraph": { const v = record(value, ["type", "text"]); return { type, text: plain(v.text, BLOCK_LIMITS.paragraph, "Paragraph")! }; }
    case "heading": { const v = record(value, ["type", "level", "text"]); if (v.level !== 2 && v.level !== 3) fail("Heading level must be 2 or 3."); return { type, level: v.level, text: plain(v.text, BLOCK_LIMITS.heading, "Heading")! }; }
    case "image": { const r = imageRef(value, ["type", "mediaId", "alt", "caption"]); return { type, ...r }; }
    case "gallery": {
      const v = record(value, ["type", "items"]);
      if (!Array.isArray(v.items) || v.items.length < BLOCK_LIMITS.galleryMin || v.items.length > BLOCK_LIMITS.galleryMax) fail(`A gallery needs ${BLOCK_LIMITS.galleryMin}–${BLOCK_LIMITS.galleryMax} images.`);
      return { type, items: v.items.map((item) => imageRef(item, ["mediaId", "alt", "caption"])) };
    }
    case "quote": { const v = record(value, ["type", "text", "attribution"]); return { type, text: plain(v.text, BLOCK_LIMITS.quote, "Quote")!, attribution: plain(v.attribution, BLOCK_LIMITS.attribution, "Attribution", true) }; }
    case "embed": {
      const v = record(value, ["type", "provider", "url"]);
      const target = embedTarget(v.url);
      if (!target || (v.provider !== undefined && v.provider !== target.provider)) fail("Embeds are limited to YouTube, Vimeo, Spotify, Instagram and Strava links.");
      return { type, provider: target.provider, url: target.url };
    }
    case "cta": {
      const v = record(value, ["type", "label", "url"]);
      const url = ctaUrl(v.url);
      if (!url) fail("Button links must be https:// URLs or a site path starting with /.");
      return { type, label: plain(v.label, BLOCK_LIMITS.ctaLabel, "Button label")!, url };
    }
    case "divider": record(value, ["type"]); return { type };
    default: fail("Unsupported block type.");
  }
}

export function parseStoryBody(value: unknown): BodyResult {
  if (!Array.isArray(value)) return { ok: false, issue: { index: null, reason: "Story body must be a list of blocks." } };
  if (value.length > BLOCK_LIMITS.blocks) return { ok: false, issue: { index: null, reason: `Use up to ${BLOCK_LIMITS.blocks} blocks.` } };
  const blocks: StoryBlock[] = [];
  for (let i = 0; i < value.length; i++) {
    try { blocks.push(block(value[i])); }
    catch (e) { if (e instanceof Invalid) return { ok: false, issue: { index: i, reason: e.message } }; throw e; }
  }
  if (new TextEncoder().encode(JSON.stringify(blocks)).length > BLOCK_LIMITS.bodyBytes) return { ok: false, issue: { index: null, reason: "Story body is larger than 64 KB." } };
  if (storyMediaIds(blocks).length > BLOCK_LIMITS.mediaRefs) return { ok: false, issue: { index: null, reason: `Use up to ${BLOCK_LIMITS.mediaRefs} images in one Story.` } };
  return { ok: true, blocks };
}

export function storyMediaIds(blocks: readonly StoryBlock[]): string[] {
  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.type === "image") ids.add(b.mediaId);
    else if (b.type === "gallery") for (const item of b.items) ids.add(item.mediaId);
  }
  return [...ids];
}

/** Plain-text summary used for excerpt fallback and social descriptions. */
export function storyPlainText(blocks: readonly StoryBlock[]): string {
  return blocks.map((b) => (b.type === "paragraph" || b.type === "quote" ? b.text : "")).filter(Boolean).join(" ");
}
