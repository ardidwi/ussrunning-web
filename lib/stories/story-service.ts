import 'server-only';
import { randomUUID } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { resolveMediaAsset } from '@/lib/media/media-service';
import { StoryError, storyOperation } from './story-errors';
import { STORY_FIELDS, content, object, uuid, version, slug, slugBase, filters, publicationDate } from './story-validation';
import { readStory, listStories, writeStory, readStoryReferences } from './story-repository';
import type { StoryOperation } from './story-repository';
import type { StoryRecord, ManagedStory, PublicStory, StoryPage, StoryContent } from './story-types';
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
async function managed(r: StoryRecord): Promise<ManagedStory> { const { media, ...dto } = r; return { ...dto, ...content(from(r)), cover: media ? await resolveMediaAsset(media) : null }; }
async function publicStory(r: StoryRecord): Promise<PublicStory> { const c = content(from(r)); const name = r.authorName?.trim() ?? null; return { slug: r.slug, title: c.title, excerpt: c.excerpt, body: c.body, contentType: c.contentType, featured: c.featured, author: { displayName: name && name.length <= 240 && !/[<>\x00-\x1f]/.test(name) ? name : null }, publishedAt: r.publishedAt ?? r.publishAt!, cover: r.media ? await resolveMediaAsset(r.media) : null }; }
export async function getManagedStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id']), row = await readStory(uuid(v.id), a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); return managed(row.data); }); }
export async function getPublicStoryBySlug(value: unknown): Promise<PublicStory> { return storyOperation(async () => { const row = await readStory(slug(value)); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); return publicStory(row.data); }); }
async function list(value: unknown, isManaged: boolean) { const actor = isManaged ? (await requirePermission('cms.content.manage')).account.id : undefined; const f = filters(value, isManaged), r = await listStories(f, actor); allowed(r); const page = r.items.slice(0, f.limit), last = page.at(-1); return { items: page, nextCursor: r.items.length > f.limit && last ? Buffer.from(JSON.stringify({ date: isManaged ? last.createdAt : last.publishedAt ?? last.publishAt, id: last.id, scope: f.scope })).toString('base64url') : null }; }
export async function listManagedStories(value: unknown = {}): Promise<StoryPage<Omit<ManagedStory, 'body'>>> { return storyOperation(async () => { const p = await list(value, true); return { ...p, items: await Promise.all(p.items.map(async (r) => { const { body: _body, ...summary } = await managed(r); return summary; })) }; }); }
export async function listPublicStories(value: unknown = {}): Promise<StoryPage<Omit<PublicStory, 'body'>>> { return storyOperation(async () => { const p = await list(value, false); return { ...p, items: await Promise.all(p.items.map(async (r) => { const { body: _body, ...summary } = await publicStory(r); return summary; })) }; }); }
export async function createStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), c = content(value), id = randomUUID(); const r = await writeStory(a.account.id, id, 'create', c, null, null, slugBase(c.title), [...STORY_FIELDS]); return getManagedStory({ id: result(r) }); }); }
export async function updateStory(value: unknown): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['id', 'expectedVersion', 'changes']), id = uuid(v.id), expected = version(v.expectedVersion), patch = object(v.changes, STORY_FIELDS); if (!Object.keys(patch).length)
    throw new StoryError('STORY_INVALID_INPUT'); const row = await readStory(id, a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); if (row.data.version !== expected)
    throw new StoryError('STORY_CONFLICT'); const c = content({ ...from(row.data), ...patch }); const r = await writeStory(a.account.id, id, 'update', c, expected, null, null, Object.keys(patch)); return getManagedStory({ id: result(r) }); }); }
async function transition(value: unknown, op: Exclude<StoryOperation, 'create' | 'update'>): Promise<ManagedStory> { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, op === 'schedule' ? ['id', 'expectedVersion', 'publishAt'] : ['id', 'expectedVersion']), id = uuid(v.id), expected = version(v.expectedVersion); const row = await readStory(id, a.account.id); allowed(row); if (!row.data)
    throw new StoryError('STORY_NOT_FOUND'); if (op === 'publish' || op === 'schedule')
    content(from(row.data)); const r = await writeStory(a.account.id, id, op, null, expected, op === 'schedule' ? publicationDate(v.publishAt) : null, null, ['status', ...(op === 'schedule' ? ['publishAt'] : [])]); return getManagedStory({ id: result(r) }); }); }
export async function publishStory(v: unknown) { return transition(v, 'publish'); }
export async function scheduleStory(v: unknown) { return transition(v, 'schedule'); }
export async function unpublishStory(v: unknown) { return transition(v, 'unpublish'); }
export async function archiveStory(v: unknown) { return transition(v, 'archive'); }
export async function getStoryReferenceData() { return storyOperation(async () => { const a = await requirePermission('cms.content.manage'), r = await readStoryReferences(a.account.id); allowed(r); return { contentTypes: r.contentTypes.slice(0, 100), categories: r.categories.slice(0, 100), truncated: r.contentTypes.length > 100 || r.categories.length > 100 }; }); }
