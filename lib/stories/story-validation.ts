import 'server-only';
import { StoryError } from './story-errors';
import type { StoryContent, StoryFilters } from './story-types';
export const STORY_FIELDS = ['title', 'excerpt', 'body', 'contentType', 'categoryId', 'coverMediaId', 'visibility', 'featured'] as const;
export const STORY_LIMITS = { title: 240, excerpt: 600, paragraph: 4000, paragraphs: 100, bodyBytes: 64000, page: 100 } as const;
export function invalid(): never { throw new StoryError('STORY_INVALID_INPUT'); }
export function object(value: unknown, keys: readonly string[]) { if (!value || typeof value !== 'object' || Array.isArray(value))
    invalid(); const v = value as Record<string, unknown>; if (Object.keys(v).some(k => !keys.includes(k)))
    invalid(); return v; }
export function uuid(v: unknown): string { if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    invalid(); return v; }
export function version(v: unknown) { if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 2147483647)
    invalid(); return Number(v); }
export function plain(v: unknown, max: number, optional = false): string | null { if (optional && (v === null || v === undefined || v === ''))
    return null; if (typeof v !== 'string' || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
    throw new StoryError('STORY_INVALID_CONTENT'); const t = v.trim(); if (!t && !optional)
    throw new StoryError('STORY_INVALID_CONTENT'); return t || null; }
export function body(v: unknown): string[] { if (!Array.isArray(v) || v.length > STORY_LIMITS.paragraphs || Buffer.byteLength(JSON.stringify(v)) > STORY_LIMITS.bodyBytes)
    throw new StoryError('STORY_INVALID_CONTENT'); return v.map(p => plain(p, STORY_LIMITS.paragraph)!); }
export function content(value: unknown): StoryContent { const v = object(value, STORY_FIELDS); const visibility = v.visibility ?? 'private'; if (!['private', 'public'].includes(visibility as string))
    invalid(); if (v.featured !== undefined && typeof v.featured !== 'boolean')
    invalid(); const type = plain(v.contentType, 80); if (!type || !/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(type))
    invalid(); const paragraphs = body(v.body ?? []); return { title: plain(v.title, STORY_LIMITS.title)!, excerpt: plain(v.excerpt, STORY_LIMITS.excerpt, true) ?? (paragraphs.join(' ').slice(0, STORY_LIMITS.excerpt) || null), body: paragraphs, contentType: type, categoryId: v.categoryId == null ? null : uuid(v.categoryId), coverMediaId: v.coverMediaId == null ? null : uuid(v.coverMediaId), visibility: visibility as StoryContent['visibility'], featured: (v.featured ?? false) as boolean }; }
export function slugBase(title: string) { return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || 'story'; }
export function slug(v: unknown): string { if (typeof v !== 'string' || v.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))
    invalid(); return v; }
export function publicationDate(v: unknown): string {
    if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
        invalid();
    const [year, month, day] = v.slice(0, 10).split('-').map(Number), calendar = new Date(v.slice(0, 10) + 'T00:00:00Z');
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day || Number(v.slice(11, 13)) > 23)
        invalid();
    return new Date(v).toISOString();
}
export function filters(value: unknown = {}, managed = false): StoryFilters { const v = object(value, managed ? ['limit', 'cursor', 'status', 'visibility'] : ['limit', 'cursor']); const limit = v.limit ?? 20; if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > STORY_LIMITS.page)
    invalid(); const status = v.status ?? null, vis = v.visibility ?? null; if (status !== null && !['draft', 'published', 'scheduled', 'archived'].includes(status as string))
    invalid(); if (vis !== null && !['public', 'private'].includes(vis as string))
    invalid(); const scope = JSON.stringify([managed, status, vis]); let cursor: StoryFilters['cursor'] = null; if (v.cursor != null) {
    if (typeof v.cursor !== 'string' || v.cursor.length > 1024)
        invalid();
    try {
        const c = JSON.parse(Buffer.from(v.cursor, 'base64url').toString());
        if (c.scope !== scope)
            invalid();
        publicationDate(c.date);
        // Preserve DB microseconds: JS Date normalization would skip cursor-adjacent rows.
        cursor = { date: c.date, id: uuid(c.id) };
    }
    catch {
        invalid();
    }
} return { limit: Number(limit), status: status as StoryFilters['status'], visibility: vis as StoryFilters['visibility'], cursor, scope }; }
