import 'server-only';
import { GalleryError } from './gallery-errors';
import type { GalleryContent, GalleryFilters } from './gallery-types';
export const GALLERY_FIELDS = ['title', 'description', 'eventId', 'coverMediaId', 'visibility'] as const;
export const GALLERY_LIMITS = { title: 240, description: 4000, caption: 2000, alt: 1000, page: 100, items: 1000 } as const;
export function invalid(): never { throw new GalleryError('GALLERY_INVALID_INPUT'); }
export function object(value: unknown, keys: readonly string[]) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        invalid();
    const v = value as Record<string, unknown>;
    if (Object.keys(v).some(k => !keys.includes(k)))
        invalid();
    return v;
}
export function uuid(v: unknown): string {
    if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
        invalid();
    return v;
}
export function version(v: unknown) {
    if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 2147483647)
        invalid();
    return Number(v);
}
export function plain(v: unknown, max: number, optional = false): string | null {
    if (optional && (v === null || v === undefined || v === ''))
        return null;
    if (typeof v !== 'string' || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
        throw new GalleryError('GALLERY_INVALID_CONTENT');
    const t = v.trim();
    if (!t && !optional)
        throw new GalleryError('GALLERY_INVALID_CONTENT');
    return t || null;
}
export function content(value: unknown): GalleryContent {
    const v = object(value, GALLERY_FIELDS), visibility = v.visibility ?? 'private';
    if (!['private', 'public'].includes(visibility as string))
        invalid();
    return { title: plain(v.title, GALLERY_LIMITS.title)!, description: plain(v.description, GALLERY_LIMITS.description, true), visibility: visibility as GalleryContent['visibility'], eventId: v.eventId == null ? null : uuid(v.eventId), coverMediaId: v.coverMediaId == null ? null : uuid(v.coverMediaId) };
}
export function itemText(value: unknown) { const v = object(value, ['caption', 'altTextOverride']); return { caption: plain(v.caption, GALLERY_LIMITS.caption, true), altTextOverride: plain(v.altTextOverride, GALLERY_LIMITS.alt, true) }; }
export function slugBase(title: string) { return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || 'gallery'; }
export function slug(v: unknown): string {
    if (typeof v !== 'string' || v.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))
        invalid();
    return v;
}
export function publicationDate(v: unknown): string {
    if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
        invalid();
    const [year, month, day] = v.slice(0, 10).split('-').map(Number), calendar = new Date(v.slice(0, 10) + 'T00:00:00Z');
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day || Number(v.slice(11, 13)) > 23)
        invalid();
    return new Date(v).toISOString();
}
export function filters(value: unknown = {}, managed = false): GalleryFilters {
    const v = object(value, managed ? ['limit', 'cursor', 'status', 'visibility'] : ['limit', 'cursor']);
    const limit = v.limit ?? 20;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > GALLERY_LIMITS.page)
        invalid();
    const status = v.status ?? null, vis = v.visibility ?? null;
    if (status !== null && !['draft', 'published', 'archived'].includes(status as string))
        invalid();
    if (vis !== null && !['public', 'private'].includes(vis as string))
        invalid();
    const scope = JSON.stringify([managed, status, vis]);
    let cursor: GalleryFilters['cursor'] = null;
    if (v.cursor != null) {
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
    }
    return { limit: Number(limit), status: status as GalleryFilters['status'], visibility: vis as GalleryFilters['visibility'], cursor, scope };
}
