import type { StoryStatus } from '@/lib/db/types';
import type { MediaAsset, MediaRecord } from '@/lib/media/media-types';
import type { StoryBlock, EmbedProvider } from './story-blocks';
export type StoryVisibility = 'public' | 'private';
export interface StoryContent {
    title: string;
    excerpt: string | null;
    body: StoryBlock[];
    contentType: string;
    categoryId: string | null;
    coverMediaId: string | null;
    visibility: StoryVisibility;
    featured: boolean;
    bylineId: string | null;
    tagIds: string[];
}
export interface StoryTaxonomyRef { slug: string; name: string }
export interface StoryRecord extends StoryContent {
    id: string;
    slug: string;
    status: StoryStatus;
    version: number;
    authorAccountId: string | null;
    authorName: string | null;
    bylineName: string | null;
    bylineRole: string | null;
    category: StoryTaxonomyRef | null;
    tags: StoryTaxonomyRef[];
    publishedAt: string | null;
    publishAt: string | null;
    createdAt: string;
    updatedAt: string;
    media: MediaRecord | null;
    bodyMedia: MediaRecord[];
}
export interface ManagedStory extends Omit<StoryRecord, 'media' | 'bodyMedia'> {
    cover: MediaAsset | null;
    /** Resolved images referenced by image/gallery blocks, keyed by id in the editor. */
    bodyMedia: MediaAsset[];
}
/** Public render model: images resolved to deliverable assets, embeds reduced to allowlisted targets. */
export type PublicImage = { media: MediaAsset; alt: string; caption: string | null };
export type PublicStoryBlock =
    | Exclude<StoryBlock, { type: 'image' } | { type: 'gallery' } | { type: 'embed' }>
    | ({ type: 'image' } & PublicImage)
    | { type: 'gallery'; items: PublicImage[] }
    | { type: 'embed'; provider: EmbedProvider; url: string };
export interface PublicStory {
    slug: string;
    title: string;
    excerpt: string | null;
    body: PublicStoryBlock[];
    contentType: string;
    category: StoryTaxonomyRef | null;
    tags: StoryTaxonomyRef[];
    author: {
        displayName: string | null;
        roleTitle: string | null;
    };
    publishedAt: string;
    cover: MediaAsset | null;
    featured: boolean;
}
export interface StoryPage<T> {
    items: T[];
    nextCursor: string | null;
}
export interface StoryFilters {
    limit: number;
    status: StoryStatus | null;
    visibility: StoryVisibility | null;
    category: string | null;
    cursor: {
        date: string;
        id: string;
    } | null;
    scope: string;
}
