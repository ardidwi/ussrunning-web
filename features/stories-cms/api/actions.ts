"use server";
import { revalidatePath, updateTag } from "next/cache";
import * as stories from "@/lib/stories/story-actions";
import { STORY_CACHE_TAG } from "@/lib/stories/story-cache";
import type { ManagedStory } from "@/lib/stories/story-types";

export type EditorStory = Omit<ManagedStory, "authorAccountId">;
function safe(story: ManagedStory): EditorStory {
  const { authorAccountId: _internalAccountId, ...editorStory } = story;
  return editorStory;
}
/** D3.8: any successful write expires the tagged public Story cache immediately (read-your-own-writes). */
function expirePublic() { revalidatePath("/admin"); updateTag(STORY_CACHE_TAG); }
async function mutation(result: Promise<stories.StoryResult<ManagedStory>>) {
  const response = await result;
  if (response.ok) { expirePublic(); return { ok: true as const, data: safe(response.data) }; }
  return response;
}
/** The Story service remains the only writer and permission authority. This narrows the client DTO. */
export async function createEditorStory(input: unknown) { return mutation(stories.createStory(input)); }
export async function updateEditorStory(input: unknown) { return mutation(stories.updateStory(input)); }
export async function publishEditorStory(input: unknown) { return mutation(stories.publishStory(input)); }
export async function scheduleEditorStory(input: unknown) { return mutation(stories.scheduleStory(input)); }
export async function unpublishEditorStory(input: unknown) { return mutation(stories.unpublishStory(input)); }
export async function archiveEditorStory(input: unknown) { return mutation(stories.archiveStory(input)); }
export async function getEditorStory(input: unknown) {
  const response = await stories.getManagedStory(input);
  return response.ok ? { ok: true as const, data: safe(response.data) } : response;
}
async function taxonomyMutation<T>(result: Promise<stories.StoryResult<T>>) { const r = await result; if (r.ok) expirePublic(); return r; }
export async function createEditorTaxonomy(input: unknown) { return taxonomyMutation(stories.createTaxonomyRecord(input)); }
export async function updateEditorTaxonomy(input: unknown) { return taxonomyMutation(stories.updateTaxonomyRecord(input)); }
export async function deleteEditorTaxonomy(input: unknown) { return taxonomyMutation(stories.deleteTaxonomyRecord(input)); }
