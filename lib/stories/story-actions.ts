"use server";
import * as service from './story-service';
import * as taxonomy from './story-taxonomy';
import { StoryError } from './story-errors';
import { AccountError } from '@/lib/auth/errors';
import type { StoryCode } from './story-errors';
import type { AccountErrorCode } from '@/lib/auth/errors';
export type StoryResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: StoryCode | AccountErrorCode;
};
async function run<T>(fn: () => Promise<T>): Promise<StoryResult<T>> { try {
    return { ok: true, data: await fn() };
}
catch (e) {
    return { ok: false, code: e instanceof StoryError || e instanceof AccountError ? e.code : 'STORY_UNAVAILABLE' };
} }
export async function createStory(input: unknown) { return run(() => service.createStory(input)); }
export async function updateStory(input: unknown) { return run(() => service.updateStory(input)); }
export async function getManagedStory(input: unknown) { return run(() => service.getManagedStory(input)); }
export async function listManagedStories(input: unknown = {}) { return run(() => service.listManagedStories(input)); }
export async function listPublicStories(input: unknown = {}) { return run(() => service.listPublicStories(input)); }
export async function getPublicStoryBySlug(input: unknown) { return run(() => service.getPublicStoryBySlug(input)); }
export async function publishStory(input: unknown) { return run(() => service.publishStory(input)); }
export async function scheduleStory(input: unknown) { return run(() => service.scheduleStory(input)); }
export async function unpublishStory(input: unknown) { return run(() => service.unpublishStory(input)); }
export async function archiveStory(input: unknown) { return run(() => service.archiveStory(input)); }
export async function getStoryReferenceData() { return run(() => service.getStoryReferenceData()); }
export async function getStoryTaxonomy() { return run(() => taxonomy.getStoryTaxonomy()); }
export async function createTaxonomyRecord(input: unknown) { return run(() => taxonomy.createTaxonomyRecord(input)); }
export async function updateTaxonomyRecord(input: unknown) { return run(() => taxonomy.updateTaxonomyRecord(input)); }
export async function deleteTaxonomyRecord(input: unknown) { return run(() => taxonomy.deleteTaxonomyRecord(input)); }
export async function listPublicStoryCategories() { return run(() => service.listPublicStoryCategories()); }
