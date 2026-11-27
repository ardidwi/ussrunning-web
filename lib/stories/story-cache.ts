import 'server-only';
import { unstable_cache } from 'next/cache';
import { getPublicStoryBySlug, listPublicStories, listPublicStoryCategories } from './story-actions';
import type { StoryResult } from './story-actions';

/**
 * D3.8 public Story read cache. Every public Story read is tagged STORY_CACHE_TAG; CMS mutations call
 * updateTag(STORY_CACHE_TAG) (features/stories-cms/api/actions.ts, features/media/api/library-actions.ts)
 * so publish/unpublish/archive show up on the next request without a redeploy. The 60 s ceiling covers
 * time-based transitions (scheduled Stories going live, media visibility edits made elsewhere).
 * Failures are never cached: a transient outage must not stick for a minute.
 */
export const STORY_CACHE_TAG = 'public-stories';
export const STORY_CACHE_SECONDS = 60;
class Uncached<T> extends Error { constructor(readonly result: T) { super('uncached'); } }
function cached<A extends unknown[], T>(key: string, fn: (...args: A) => Promise<StoryResult<T>>) {
  const inner = unstable_cache(async (...args: A) => { const r = await fn(...args); if (!r.ok) throw new Uncached(r); return r; }, [key], { tags: [STORY_CACHE_TAG], revalidate: STORY_CACHE_SECONDS });
  return async (...args: A): Promise<StoryResult<T>> => { try { return await inner(...args); } catch (e) { if (e instanceof Uncached) return e.result as StoryResult<T>; return fn(...args); } };
}
export const cachedPublicStories = cached('public-stories-list', (input: { limit: number; cursor?: string; category?: string }) => listPublicStories(input));
export const cachedPublicStory = cached('public-story-slug', (slug: string) => getPublicStoryBySlug(slug));
export const cachedPublicCategories = cached('public-story-categories', () => listPublicStoryCategories());
