import 'server-only';
import { randomUUID } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { StoryError, storyOperation } from './story-errors';
import { invalid, object, plain, slugBase, uuid, version } from './story-validation';
import { listTaxonomy, mutateTaxonomy } from './story-taxonomy-repository';
import { TAXONOMY_KINDS, TAXONOMY_LIMITS } from './story-taxonomy-types';
import type { TaxonomyKind, TaxonomyLists, TaxonomyRecord } from './story-taxonomy-types';

const FIELDS: Record<TaxonomyKind, readonly string[]> = {
  category: ['name', 'slug', 'description', 'sortOrder', 'isActive'],
  tag: ['name', 'slug'],
  byline: ['name', 'slug', 'roleTitle', 'isActive'],
};
function kind(v: unknown): TaxonomyKind { if (!TAXONOMY_KINDS.includes(v as TaxonomyKind)) invalid(); return v as TaxonomyKind; }
function taxonomySlug(v: unknown): string { if (typeof v !== 'string' || v.length > TAXONOMY_LIMITS.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v)) throw new StoryError('STORY_INVALID_CONTENT'); return v; }
/** Field-level validation; create derives the slug from the name unless one is given. */
function fields(k: TaxonomyKind, value: unknown, creating: boolean): Record<string, unknown> {
  const v = object(value, FIELDS[k]), out: Record<string, unknown> = {};
  if (creating && v.name === undefined) throw new StoryError('STORY_INVALID_CONTENT');
  if (v.name !== undefined) out.name = plain(v.name, k === 'byline' ? TAXONOMY_LIMITS.bylineName : TAXONOMY_LIMITS.name);
  if (v.slug !== undefined && v.slug !== null && v.slug !== '') out.slug = taxonomySlug(v.slug);
  else if (creating) out.slug = taxonomySlug(slugBase(String(out.name)).slice(0, TAXONOMY_LIMITS.slug).replace(/-$/, '') || k);
  if (v.description !== undefined) out.description = plain(v.description, TAXONOMY_LIMITS.description, true);
  if (v.roleTitle !== undefined) out.roleTitle = plain(v.roleTitle, TAXONOMY_LIMITS.roleTitle, true);
  if (v.sortOrder !== undefined) { if (!Number.isInteger(v.sortOrder) || Math.abs(Number(v.sortOrder)) > TAXONOMY_LIMITS.sortOrder) invalid(); out.sortOrder = v.sortOrder; }
  if (v.isActive !== undefined) { if (typeof v.isActive !== 'boolean') invalid(); out.isActive = v.isActive; }
  if (!Object.keys(out).length) invalid();
  return out;
}
function done(r: { code: string; data: Record<string, unknown> | null }): TaxonomyRecord {
  if (r.code !== 'OK') throw new StoryError(r.code as StoryError['code']);
  if (!r.data) throw new StoryError('STORY_UNAVAILABLE');
  return r.data as unknown as TaxonomyRecord;
}
async function guarded<T>(fn: () => Promise<T>) { return storyOperation(async () => { try { return await fn(); } catch (e) { if (e && typeof e === 'object' && 'code' in e && e.code === '23503') throw new StoryError('STORY_TAXONOMY_IN_USE'); throw e; } }); }

export async function getStoryTaxonomy(): Promise<TaxonomyLists & { truncated: boolean }> {
  return storyOperation(async () => {
    const a = await requirePermission('cms.content.manage'), r = await listTaxonomy(a.account.id);
    if (!r.authorized) throw new StoryError('STORY_FORBIDDEN');
    const max = TAXONOMY_LIMITS.list;
    return { categories: r.categories.slice(0, max), tags: r.tags.slice(0, max), bylines: r.bylines.slice(0, max), truncated: [r.categories, r.tags, r.bylines].some((l) => l.length > max) };
  });
}
export async function createTaxonomyRecord(value: unknown) {
  return guarded(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['kind', 'fields']), k = kind(v.kind); return done(await mutateTaxonomy(a.account.id, k, 'create', randomUUID(), null, fields(k, v.fields, true))); });
}
export async function updateTaxonomyRecord(value: unknown) {
  return guarded(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['kind', 'id', 'expectedVersion', 'changes']), k = kind(v.kind); return done(await mutateTaxonomy(a.account.id, k, 'update', uuid(v.id), version(v.expectedVersion), fields(k, v.changes, false))); });
}
/** Deletion is refused (STORY_TAXONOMY_IN_USE) while any Story — draft, published or archived — references it. */
export async function deleteTaxonomyRecord(value: unknown) {
  return guarded(async () => { const a = await requirePermission('cms.content.manage'), v = object(value, ['kind', 'id', 'expectedVersion']), k = kind(v.kind); return done(await mutateTaxonomy(a.account.id, k, 'delete', uuid(v.id), version(v.expectedVersion), null)); });
}
