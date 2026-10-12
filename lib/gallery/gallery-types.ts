import type { MediaAsset, MediaRecord } from '@/lib/media/media-types';
export type GalleryContent = {
    title: string;
    description: string | null;
    visibility: 'public' | 'private';
    eventId: string | null;
    coverMediaId: string | null;
};
export type GalleryRecord = GalleryContent & {
    id: string;
    slug: string;
    status: 'draft' | 'published' | 'archived';
    version: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string | null;
    media: MediaRecord | null;
};
export type ManagedGallery = Omit<GalleryRecord, 'media'> & {
    cover: MediaAsset | null;
};
export type PublicGallery = {
    slug: string;
    title: string;
    description: string | null;
    publishedAt: string;
    cover: MediaAsset | null;
};
export type ItemRecord = {
    id: string;
    caption: string | null;
    altTextOverride: string | null;
    sortOrder: number;
    media: MediaRecord;
};
export type GalleryItem = Omit<ItemRecord, 'media'> & {
    media: MediaAsset;
};
export type GalleryPage<T> = {
    items: T[];
    nextCursor: string | null;
};
export type GalleryFilters = {
    limit: number;
    status: GalleryRecord['status'] | null;
    visibility: GalleryContent['visibility'] | null;
    cursor: {
        date: string;
        id: string;
    } | null;
    scope: string;
};
