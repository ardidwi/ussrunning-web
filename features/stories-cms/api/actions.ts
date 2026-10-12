"use server";
import { revalidatePath } from "next/cache";
import * as stories from "@/lib/stories/story-actions";
import type { ManagedStory } from "@/lib/stories/story-types";

export type EditorStory = Omit<ManagedStory, "authorAccountId">;
function safe(story: ManagedStory): EditorStory {
  const { authorAccountId: _internalAccountId, ...editorStory } = story;
  return editorStory;
}
async function mutation(result: Promise<stories.StoryResult<ManagedStory>>) {
  const response = await result;
  if (response.ok) { revalidatePath("/admin"); return { ok: true as const, data: safe(response.data) }; }
  return response;
}
/** BE-12 remains the only writer and permission authority. This narrows the client DTO. */
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
