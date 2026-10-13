import 'server-only';
import { requirePermission } from '@/lib/authz/guards';
import { resolveMediaAsset } from '@/lib/media/media-service';
import { SiteError, siteOperation } from './site-errors';
import { SITE_DEFAULTS } from './site-defaults';
import { key, payload, object, version, SITE_POLICY } from './site-validation';
import { SITE_KEYS, SURFACE_KEYS } from './site-types';
import type { SiteKey, Surface, ManagedSlot, PublicSlot } from './site-types';
import { readSlots, mutate } from './site-repository';
import type { ReadSlot } from './site-repository';
function allowed(r: {
    authorized: boolean;
}) { if (!r.authorized)
    throw new SiteError('SITE_CONTENT_FORBIDDEN'); }
async function managed(r: ReadSlot): Promise<ManagedSlot> { const { referencesValid, media, content, publishedContent, ...safe } = r; const p = payload(r.key, content); return { ...safe, payload: p, publishedPayload: publishedContent ? payload(r.key, publishedContent) : null, hasUnpublishedChanges: r.publishedVersion !== r.version, media: await Promise.all(media.map(resolveMediaAsset)) } as ManagedSlot; }
export async function getManagedSiteContent(v: unknown): Promise<ManagedSlot> { return siteOperation(async () => { const a = await requirePermission('cms.content.manage'), x = object(v, ['key']), k = key(x.key), r = await readSlots([k], a.account.id); allowed(r); if (!r.items[0])
    throw new SiteError('SITE_CONTENT_NOT_FOUND'); return managed(r.items[0]); }); }
export async function listManagedSiteContent(v: unknown = {}) { return siteOperation(async () => { const a = await requirePermission('cms.content.manage'), x = object(v, ['status', 'limit', 'cursor']), limit = x.limit ?? SITE_POLICY.defaultPage, status = x.status ?? null; if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > SITE_POLICY.maxPage || (status !== null && !['draft', 'published', 'archived'].includes(String(status))))
    throw new SiteError('SITE_CONTENT_INVALID_PAYLOAD'); let after: string | null = null; if (x.cursor != null) {
    try {
        if (typeof x.cursor !== 'string' || x.cursor.length > 512)
            throw Error();
        const c = JSON.parse(Buffer.from(x.cursor, 'base64url').toString());
        if (c.status !== status)
            throw Error();
        after = key(c.key);
    }
    catch {
        throw new SiteError('SITE_CONTENT_INVALID_PAYLOAD');
    }
} const r = await readSlots(SITE_KEYS, a.account.id, status as string | null, after, Number(limit) + 1); allowed(r); const page = r.items.slice(0, Number(limit)), last = page.at(-1); return { items: await Promise.all(page.map(managed)), nextCursor: r.items.length > Number(limit) && last ? Buffer.from(JSON.stringify({ key: last.key, status })).toString('base64url') : null }; }); }
async function mutation(v: unknown, op: 'create' | 'update' | 'publish' | 'unpublish' | 'archive') { return siteOperation(async () => { const a = await requirePermission('cms.content.manage'), x = object(v, op === 'create' ? ['key', 'payload'] : op === 'update' ? ['key', 'expectedVersion', 'payload'] : ['key', 'expectedVersion']), k = key(x.key), expected = op === 'create' ? null : version(x.expectedVersion); let p: unknown = null; if (op === 'create' || op === 'update')
    p = payload(k, x.payload); if (op === 'publish') {
    const current = await getManagedSiteContent({ key: k });
    p = payload(k, current.payload);
} const r = await mutate(a.account.id, k, op, expected, p); if (r.code !== 'OK')
    throw new SiteError(r.code as SiteError['code']); return getManagedSiteContent({ key: k }); }); }
export async function createSiteContentDraft(v: unknown) { return mutation(v, 'create'); }
export async function updateSiteContentDraft(v: unknown) { return mutation(v, 'update'); }
export async function publishSiteContent(v: unknown) { return mutation(v, 'publish'); }
export async function unpublishSiteContent(v: unknown) { return mutation(v, 'unpublish'); }
export async function archiveSiteContent(v: unknown) { return mutation(v, 'archive'); }
function fallback(k: SiteKey, reason: PublicSlot['fallbackReason']): PublicSlot { try {
    return { key: k, payload: payload(k, SITE_DEFAULTS[k]), media: [], source: 'default', fallbackReason: reason, publishedAt: null } as PublicSlot;
}
catch {
    return { key: k, payload: null, media: [], source: 'empty', fallbackReason: reason, publishedAt: null } as PublicSlot;
} }
async function published(k: SiteKey, r: ReadSlot | undefined): Promise<PublicSlot> { if (!r)
    return fallback(k, 'missing'); try {
    const p = payload(k, r.publishedContent);
    if (!r.referencesValid)
        return fallback(k, 'invalid');
    return { key: k, payload: p, media: await Promise.all(r.media.map(resolveMediaAsset)), source: 'published', fallbackReason: null, publishedAt: r.publishedAt } as PublicSlot;
}
catch {
    return fallback(k, 'invalid');
} }
async function publicSlots(keys: readonly SiteKey[]) { let records: ReadSlot[]; try {
    records = (await readSlots(keys)).items;
}
catch {
    return keys.map(k => fallback(k, 'unavailable'));
} const byKey = new Map(records.map(r => [r.key, r])); return Promise.all(keys.map(k => published(k, byKey.get(k)))); }
export async function getPublicSiteContent<K extends SiteKey>(v: K): Promise<PublicSlot<K>> { const k = key(v); return (await publicSlots([k]))[0] as PublicSlot<K>; }
export async function getPublicSiteBundle(v: unknown) { if (typeof v !== 'string' || !Object.hasOwn(SURFACE_KEYS, v))
    throw new SiteError('SITE_CONTENT_INVALID_KEY'); return { surface: v as Surface, slots: await publicSlots(SURFACE_KEYS[v as Surface]) }; }
export async function getHomepageContent() { return getPublicSiteBundle('homepage'); }
export async function getAuthSurfaceContent(v: 'login' | 'register') { if (v !== 'login' && v !== 'register')
    throw new SiteError('SITE_CONTENT_INVALID_KEY'); return getPublicSiteBundle(v); }
/** Exact-set section order is the typed homepage.sections draft; normal expectedVersion update/publish is atomic. */
export async function reorderHomepageSections(v: unknown) { const x = object(v, ['expectedVersion', 'order']); return updateSiteContentDraft({ key: 'homepage.sections', expectedVersion: x.expectedVersion, payload: { order: x.order } }); }
export async function previewSiteContent(v: unknown) { return getManagedSiteContent(v); }
