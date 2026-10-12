import 'server-only';
import { randomUUID } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { resolveMediaAsset } from '@/lib/media/media-service';
import { GalleryError, galleryOperation } from './gallery-errors';
import { object, uuid, version, content, filters, slug, slugBase, itemText, GALLERY_FIELDS, GALLERY_LIMITS } from './gallery-validation';
import { readGallery, listGalleries, readItems, writeGallery, readHistory } from './gallery-repository';
import type { GalleryContent, GalleryRecord, ManagedGallery, PublicGallery, GalleryItem, GalleryPage } from './gallery-types';
function allowed(r: {
    authorized: boolean;
}) { if (!r.authorized)
    throw new GalleryError('GALLERY_FORBIDDEN'); }
async function managed(r: GalleryRecord): Promise<ManagedGallery> { const { media, ...dto } = r; return { ...dto, ...content(dtoContent(r)), cover: media ? await resolveMediaAsset(media) : null }; }
function dtoContent(r: GalleryContent) { return Object.fromEntries(GALLERY_FIELDS.map(k => [k, r[k]])); }
async function publicDto(r: GalleryRecord): Promise<PublicGallery> { const c = content(dtoContent(r)); return { slug: r.slug, title: c.title, description: c.description, publishedAt: r.publishedAt!, cover: r.media ? await resolveMediaAsset(r.media) : null }; }
export async function getManagedGallery(value: unknown) { return galleryOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id']), r = await readGallery(uuid(v.id), a.account.id); allowed(r); if (!r.data)
    throw new GalleryError('GALLERY_NOT_FOUND'); return managed(r.data); }); }
export async function getPublicGalleryBySlug(value: unknown) { return galleryOperation(async () => { const r = await readGallery(slug(value)); if (!r.data)
    throw new GalleryError('GALLERY_NOT_FOUND'); return publicDto(r.data); }); }
function list(value: unknown, isManaged: true): Promise<GalleryPage<ManagedGallery>>;
function list(value: unknown, isManaged: false): Promise<GalleryPage<PublicGallery>>;
async function list(value: unknown, isManaged: boolean) { const actor = isManaged ? (await requirePermission('cms.content.manage')).account.id : undefined, f = filters(value, isManaged), r = await listGalleries(f, actor); allowed(r); const page = r.items.slice(0, f.limit), last = page.at(-1); return { items: await Promise.all(page.map(x => isManaged ? managed(x) : publicDto(x))), nextCursor: r.items.length > f.limit && last ? Buffer.from(JSON.stringify({ date: isManaged ? last.createdAt : last.publishedAt, id: last.id, scope: f.scope })).toString('base64url') : null }; }
export async function listManagedGalleries(v: unknown = {}) { return galleryOperation(() => list(v, true)); }
export async function listPublicGalleries(v: unknown = {}) { return galleryOperation(() => list(v, false)); }
async function mutate(id: string, op: string, expected: number | null, payload: Record<string, unknown>, base: string | null = null) { const a = await requirePermission('cms.content.manage'), r = await writeGallery(a.account.id, id, op, expected, payload, base); if (r.code !== 'OK')
    throw new GalleryError(r.code as GalleryError['code']); return getManagedGallery({ id }); }
export async function createGallery(value: unknown) { return galleryOperation(async () => { await requirePermission('cms.content.manage'); const c = content(value); return mutate(randomUUID(), 'create', null, c, slugBase(c.title)); }); }
export async function updateGallery(value: unknown) { return galleryOperation(async () => { const v = object(value, ['id', 'expectedVersion', 'changes']), id = uuid(v.id), patch = object(v.changes, GALLERY_FIELDS); if (!Object.keys(patch).length)
    throw new GalleryError('GALLERY_INVALID_INPUT'); const r = await getManagedGallery({ id }); return mutate(id, 'update', version(v.expectedVersion), content({ ...dtoContent(r), ...patch })); }); }
async function transition(v: unknown, op: string) { return galleryOperation(async () => { const r = object(v, ['id', 'expectedVersion']); return mutate(uuid(r.id), op, version(r.expectedVersion), {}); }); }
export async function publishGallery(v: unknown) { return transition(v, 'publish'); }
export async function unpublishGallery(v: unknown) { return transition(v, 'unpublish'); }
export async function archiveGallery(v: unknown) { return transition(v, 'archive'); }
export async function addGalleryItem(v: unknown) { return galleryOperation(async () => { const x = object(v, ['id', 'expectedVersion', 'mediaAssetId', 'caption', 'altTextOverride']); return mutate(uuid(x.id), 'add', version(x.expectedVersion), { itemId: randomUUID(), mediaAssetId: uuid(x.mediaAssetId), ...itemText({ caption: x.caption, altTextOverride: x.altTextOverride }) }); }); }
export async function updateGalleryItem(v: unknown) { return galleryOperation(async () => { const x = object(v, ['id', 'expectedVersion', 'itemId', 'caption', 'altTextOverride']); return mutate(uuid(x.id), 'item', version(x.expectedVersion), { itemId: uuid(x.itemId), ...itemText({ caption: x.caption, altTextOverride: x.altTextOverride }) }); }); }
export async function removeGalleryItem(v: unknown) { return galleryOperation(async () => { const x = object(v, ['id', 'expectedVersion', 'itemId']); return mutate(uuid(x.id), 'remove', version(x.expectedVersion), { itemId: uuid(x.itemId) }); }); }
export async function reorderGalleryItems(v: unknown) { return galleryOperation(async () => { const x = object(v, ['id', 'expectedVersion', 'itemIds']); if (!Array.isArray(x.itemIds) || x.itemIds.length > GALLERY_LIMITS.items)
    throw new GalleryError('GALLERY_INVALID_INPUT'); return mutate(uuid(x.id), 'reorder', version(x.expectedVersion), { itemIds: x.itemIds.map(uuid) }); }); }
async function items(value: unknown, managedRead: boolean): Promise<GalleryPage<GalleryItem>> {
    const x = object(value, managedRead ? ['id', 'limit', 'cursor'] : ['slug', 'limit', 'cursor']), key = managedRead ? uuid(x.id) : slug(x.slug), actor = managedRead ? (await requirePermission('cms.content.manage')).account.id : undefined, limit = x.limit ?? 20;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > GALLERY_LIMITS.page)
        throw new GalleryError('GALLERY_INVALID_INPUT');
    const scope = JSON.stringify([managedRead, key]);
    let order: number | null = null, id: string | null = null;
    if (x.cursor != null) {
        try {
            if (typeof x.cursor !== 'string' || x.cursor.length > 1024)
                throw Error();
            const c = JSON.parse(Buffer.from(x.cursor, 'base64url').toString());
            if (c.scope !== scope || !Number.isInteger(c.order) || c.order < 0 || c.order > 2147483647)
                throw Error();
            order = c.order;
            id = uuid(c.id);
        }
        catch {
            throw new GalleryError('GALLERY_INVALID_INPUT');
        }
    }
    const r = await readItems(key, actor, Number(limit), order, id);
    allowed(r);
    if (!r.found)
        throw new GalleryError('GALLERY_NOT_FOUND');
    const page = r.items.slice(0, Number(limit)), last = page.at(-1);
    return { items: await Promise.all(page.map(async (x) => ({ ...x, ...itemText({ caption: x.caption, altTextOverride: x.altTextOverride }), media: await resolveMediaAsset(x.media) }))), nextCursor: r.items.length > Number(limit) && last ? Buffer.from(JSON.stringify({ scope, order: last.sortOrder, id: last.id })).toString('base64url') : null };
}
export async function listManagedGalleryItems(v: unknown) { return galleryOperation(() => items(v, true)); }
export async function listPublicGalleryItems(v: unknown) { return galleryOperation(() => items(v, false)); }
/** Bounded Gallery history metadata; existing CMS frontend entity unions remain unchanged. */
export async function listGalleryRevisions(value: unknown) { return galleryOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id', 'limit', 'beforeVersion']), id = uuid(v.id), limit = v.limit ?? 20; if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > GALLERY_LIMITS.page)
    throw new GalleryError('GALLERY_INVALID_INPUT'); const before = v.beforeVersion == null ? null : version(v.beforeVersion), r = await readHistory(a.account.id, id, Number(limit), before); allowed(r); if (!r.found)
    throw new GalleryError('GALLERY_NOT_FOUND'); const items = r.items.slice(0, Number(limit)); return { items, nextBeforeVersion: r.items.length > Number(limit) ? items.at(-1)!.version : null }; }); }
