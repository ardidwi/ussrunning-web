import "server-only";
import type { MetadataRoute } from "next";
import { listPublicStories } from "@/lib/stories/story-actions";
import { getPublicEventList } from "@/lib/events/event-actions";
import { listPublicGalleries } from "@/lib/gallery/gallery-actions";

/** Public, indexable pages that always exist. */
export const STATIC_PUBLIC_PATHS = [
  "/",
  "/runs",
  "/stories",
  "/gallery",
  "/partners",
  "/about",
  "/membership",
  "/join",
  "/privacy",
  "/terms",
] as const;

/** Upper bound of pages read per collection, keeping the sitemap request bounded. */
const MAX_PAGES = 10;

type Page<T> = { items: T[]; nextCursor: string | null };
type Result<T> = { ok: true; data: Page<T> } | { ok: false; code: string };

async function collect<T>(
  read: (cursor: string | null) => Promise<Result<T>>,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await read(cursor);
    // A failing collection is omitted rather than failing the whole sitemap.
    if (!result.ok) break;
    items.push(...result.data.items);
    if (!result.data.nextCursor) break;
    cursor = result.data.nextCursor;
  }
  return items;
}

export async function collectPublicSitemapEntries(base: URL): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, base).toString();
  const [stories, events, galleries] = await Promise.all([
    collect((cursor) => listPublicStories({ limit: 100, ...(cursor ? { cursor } : {}) })),
    collect((cursor) => getPublicEventList({ limit: 50, ...(cursor ? { cursor } : {}) })),
    collect((cursor) => listPublicGalleries({ limit: 100, ...(cursor ? { cursor } : {}) })),
  ]);
  return [
    ...STATIC_PUBLIC_PATHS.map((path) => ({
      url: url(path),
      changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
      priority: path === "/" ? 1 : 0.7,
    })),
    ...stories.map((story) => ({
      url: url(`/stories/${encodeURIComponent(story.slug)}`),
      lastModified: story.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...events.map((event) => ({
      url: url(`/runs/${encodeURIComponent(event.slug)}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...galleries.map((gallery) => ({
      url: url(`/gallery/${encodeURIComponent(gallery.slug)}`),
      lastModified: gallery.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
