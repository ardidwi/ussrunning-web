import type { StoryStatus } from '@/lib/db/types';
import type { MediaAsset, MediaRecord } from '@/lib/media/media-types';
export type StoryVisibility = 'public' | 'private';
export interface StoryContent {
    title: string;
    excerpt: string | null;
    body: string[];
    contentType: string;
    categoryId: string | null;
    coverMediaId: string | null;
    visibility: StoryVisibility;
    featured: boolean;
}
export interface StoryRecord extends StoryContent {
    id: string;
    slug: string;
    status: StoryStatus;
    version: number;
    authorAccountId: string | null;
    authorName: string | null;
    publishedAt: string | null;
    publishAt: string | null;
    createdAt: string;
    updatedAt: string;
    media: MediaRecord | null;
}
export interface ManagedStory extends Omit<StoryRecord, 'media'> {
    cover: MediaAsset | null;
}
export interface PublicStory {
    slug: string;
    title: string;
    excerpt: string | null;
    body: string[];
    contentType: string;
    author: {
        displayName: string | null;
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
    cursor: {
        date: string;
        id: string;
    } | null;
    scope: string;
}
