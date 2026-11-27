import 'server-only';
import { randomUUID } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { resolveMediaAsset } from '@/lib/media/media-service';
import { StoryError, storyOperation } from './story-errors';
import { STORY_FIELDS, content, object, uuid, version, slug, slugBase, filters, publicationDate } from './story-validation';
import { readStory, listStories, writeStory, readStoryReferences, readPublicCategories } from './story-repository';
import type { StoryOperation } from './story-repository';
import type { StoryRecord, ManagedStory, PublicStory, PublicStoryBlock, PublicImage, StoryPage, StoryContent } from './story-types';
import type { MediaAsset } from '@/lib/media/media-types';
import { storyMediaIds } from './story-blocks';
import type { ImageRef } from './story-blocks';
function allowed(row: {
    authorized: boolean;
}) { if (!row.authorized)
    throw new StoryError('STORY_FORBIDDEN'); }
function result(r: {
    code: string;
    id: string | null;
}) { if (r.code !== 'OK')
    throw new StoryError(r.code as StoryError['code']); if (!r.id)
    throw new StoryError('STORY_UNAVAILABLE'); return r.id; }
function from(r: StoryRecord): StoryContent { return Object.fromEntries(STORY_FIELDS.map(k => [k, r[k]])) as unknown as StoryContent; }
async function resolveAll(r: StoryRecord) { const [cover, body] = await Promise.all([r.media ? resolveMediaAsset(r.media) : null, Promise.all((r.bodyMedia ?? []).map(m => resolveMediaAsset(m)))]); return { cover, body }; }
async function managed(r: StoryRecord): Promise<ManagedStory> { const { media: _media, bodyMedia: _bodyMedia, ...dto } = r; const resolved = await resolveAll(r); return { ...dto, ...content(from(r)), cover: resolved.cover, bodyMedia: resolved.body }; }
const safeName = (v: string | null | undefined) => { const n = v?.trim() ?? null; return n && n.length <= 240 && !/[<>\x00-\x1f]/.test(n) ? n : null; };
/** Public blocks never carry media ids; undeliverable images are dropped rather than rendered broken. */
function publicBlocks(c: StoryContent, media: MediaAsset[]): PublicStoryBlock[] { const byId = new Map(media.filter(m => m.deliveryAvailable && m.url).map(m => [m.id, m])); const image = (ref: ImageRef): PublicImage | null => { const m = byId.get(ref.mediaId); return m ? { media: m, alt: ref.alt, caption: ref.caption } : null; }; const out: PublicStoryBlock[] = []; for (const b of c.body) {
    if (b.type === 'image') { const i = image(b); if (i) out.push({ type: 'image', ...i }); }
    else if (b.type === 'gallery') { const items = b.items.map(image).filter((i): i is PublicImage => i !== null); if (items.length) out.push({ type: 'gallery', items }); }
    else out.push(b);
} return out; }
async function publicStory(r: StoryRecord, withBody = true): Promise<PublicStory> { const c = content(from(r)); const resolved = await resolveAll(r); return { slug: r.slug, title: c.title, excerpt: c.excerpt, body: withBody ? publicBlocks(c, resolved.body) : [], contentType: c.contentType, category: r.category ?? null, tags: r.tags ?? [], featured: c.featured, author: { displayName: safeName(r.bylineName) ?? safeName(r.authorName), roleTitle: r.bylineName ? safeName(r.bylineRole) : null }, publishedAt: r.publishedAt ?? r.publishAt!, cover: resolved.cover }; }
export async function getManagedStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id']), row = await readStory(uuid(v.id), a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); return managed(row.data); }); }
export async function getPublicStoryBySlug(value: unknown): Promise<PublicStory> { return storyOperation(async () => { const row = await readStory(slug(value)); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); return publicStory(row.data); }); }
async function list(value: unknown, isManaged: boolean) { const actor = isManaged ? (await requirePermission('cms.content.manage')).account.id : undefined; const f = filters(value, isManaged), r = await listStories(f, actor); allowed(r); const page = r.items.slice(0, f.limit), last = page.at(-1); return { items: page, nextCursor: r.items.length > f.limit && last ? Buffer.from(JSON.stringify({ date: isManaged ? last.createdAt : last.publishedAt ?? last.publishAt, id: last.id, scope: f.scope })).toString('base64url') : null }; }
export async function listManagedStories(value: unknown = {}): Promise<StoryPage<Omit<ManagedStory, 'body' | 'bodyMedia'>>> { return storyOperation(async () => { const p = await list(value, true); return { ...p, items: await Promise.all(p.items.map(async (r) => { const { body: _body, bodyMedia: _bodyMedia, ...summary } = await managed(r); return summary; })) }; }); }
export async function listPublicStories(value: unknown = {}): Promise<StoryPage<Omit<PublicStory, 'body'>>> { return storyOperation(async () => { const p = await list(value, false); return { ...p, items: await Promise.all(p.items.map(async (r) => { const { body: _body, ...summary } = await publicStory(r, false); return summary; })) }; }); }
export async function createStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), c = content(value), id = randomUUID(); const r = await writeStory(a.account.id, id, 'create', c, null, null, slugBase(c.title), [...STORY_FIELDS], storyMediaIds(c.body), c.tagIds); return getManagedStory({ id: result(r) }); }); }
export async function updateStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id', 'expectedVersion', 'changes']), id = uuid(v.id), expected = version(v.expectedVersion), patch = object(v.changes, STORY_FIELDS); if (!Object.keys(patch).length)
    throw new StoryError('STORY_INVALID_INPUT'); const row = await readStory(id, a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); if (row.data.version !== expected)
    throw new StoryError('STORY_CONFLICT'); const c = content({ ...from(row.data), ...patch }); const r = await writeStory(a.account.id, id, 'update', c, expected, null, null, Object.keys(patch), storyMediaIds(c.body), c.tagIds); return getManagedStory({ id: result(r) }); }); }
async function transition(value: unknown, op: Exclude<StoryOperation, 'create' | 'update'>): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, op === 'schedule' ? ['id', 'expectedVersion', 'publishAt'] : ['id', 'expectedVersion']), id = uuid(v.id), expected = version(v.expectedVersion); const row = await readStory(id, a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); const ids = op === 'publish' || op === 'schedule' ? storyMediaIds(content(from(row.data)).body) : []; const r = await writeStory(a.account.id, id, op, null, expected, op === 'schedule' ? publicationDate(v.publishAt) : null, null, ['status', ...(op === 'schedule' ? ['publishAt'] : [])], ids, null); return getManagedStory({ id: result(r) }); }); }
export async function publishStory(v: unknown) { return transition(v, 'publish'); }
export async function scheduleStory(v: unknown) { return transition(v, 'schedule'); }
export async function unpublishStory(v: unknown) { return transition(v, 'unpublish'); }
export async function archiveStory(v: unknown) { return transition(v, 'archive'); }
export async function getStoryReferenceData() { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), r = await readStoryReferences(a.account.id); allowed(r); return { contentTypes: r.contentTypes.slice(0, 100), categories: r.categories.slice(0, 100), tags: r.tags.slice(0, 200), bylines: r.bylines.slice(0, 100), truncated: r.contentTypes.length > 100 || r.categories.length > 100 || r.tags.length > 200 || r.bylines.length > 100 }; }); }

export async function listPublicStoryCategories() { return storyOperation(async () => readPublicCategories()); }
