"use client";
import { useState } from "react";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import type { EditorStory } from "./api/actions";
import type { MediaAsset } from "@/lib/media/media-types";
import { StoryEditor } from "./StoryEditor";
import { StoryList } from "./StoriesWorkspace";
import { TaxonomyManager } from "./TaxonomyManager";
import type { TaxonomyLists } from "@/lib/stories/story-taxonomy-types";
import type { StoryReferences } from "./model";

const id = "22222222-2222-4222-8222-222222222222";
const now = "2026-10-13T09:30:00.000Z";
const refs: StoryReferences = { contentTypes: [{ code: "editorial", name: "Editorial" }, { code: "news", name: "News" }], categories: [{ id: "33333333-3333-4333-8333-333333333333", name: "Crew", slug: "crew" }], tags: [{ id: "66666666-6666-4666-8666-666666666661", name: "Night run", slug: "night-run" }, { id: "66666666-6666-4666-8666-666666666662", name: "Race week", slug: "race-week" }], bylines: [{ id: "77777777-7777-4777-8777-777777777771", name: "Fictional Editor", roleTitle: "Editor" }], truncated: false };
const media: MediaAsset = { id: "44444444-4444-4444-8444-444444444444", url: "/uss-logo.png", deliveryAvailable: true, mimeType: "image/png", sizeBytes: 12345, width: 800, height: 600, altText: "Fictional USS editorial image", caption: null, status: "active", visibility: "public", version: 1, createdAt: now, updatedAt: now };
const unavailableMedia = { ...media, id: "55555555-5555-4555-8555-555555555555", url: null, deliveryAvailable: false, altText: "Undeliverable fictional image" };
const base: EditorStory = { id, slug: "fictional-city-run", status: "draft", version: 2, title: "18 RUNNERS. ONE CITY. STILL MOVING.", excerpt: "A fictional editorial summary for development review.", body: [{ type: "heading", level: 2, text: "Before sunrise" }, { type: "paragraph", text: "The city wakes while the crew is already moving." }, { type: "image", mediaId: media.id, alt: "Fictional crew at the start line", caption: "Start line" }, { type: "quote", text: "Every route is a chance to find your people.", attribution: "Fictional coach" }, { type: "embed", provider: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, { type: "cta", label: "Join a run", url: "/runs" }], bodyMedia: [media], bylineId: null, tagIds: [refs.tags![0].id], bylineName: null, bylineRole: null, category: { slug: "crew", name: "Crew" }, tags: [{ slug: "night-run", name: "Night run" }], contentType: "editorial", categoryId: refs.categories[0].id, coverMediaId: media.id, visibility: "public", featured: false, authorName: "Fictional editor", publishedAt: null, publishAt: null, createdAt: now, updatedAt: now, cover: media };
const taxonomy: TaxonomyLists & { truncated: boolean } = { truncated: false,
  categories: [{ id: refs.categories[0].id, name: "Crew", slug: "crew", description: "People of USS", sortOrder: 0, isActive: true, version: 1, usageCount: 3, updatedAt: now }, { id: "33333333-3333-4333-8333-333333333334", name: "Race week", slug: "race-week", description: null, sortOrder: 1, isActive: true, version: 1, usageCount: 0, updatedAt: now }],
  tags: [{ id: "66666666-6666-4666-8666-666666666661", name: "Night run", slug: "night-run", version: 1, usageCount: 2, updatedAt: now }],
  bylines: [{ id: "77777777-7777-4777-8777-777777777771", name: "Fictional Editor", slug: "fictional-editor", roleTitle: "Editor", isActive: true, version: 1, usageCount: 0, updatedAt: now }] };
/** Development-only visual/interaction fixture; no production session, writes or MediaAsset storage. */
export default function StoryReference({ scenario = "draft", view = "edit" }: { scenario?: string; view?: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  const [current, setCurrent] = useState<EditorStory>(() => ({ ...base, status: scenario === "published" ? "published" : scenario === "scheduled" ? "scheduled" : scenario === "archived" ? "archived" : "draft", publishAt: scenario === "scheduled" ? "2026-12-01T11:00:00Z" : null, publishedAt: scenario === "published" ? now : null, cover: scenario === "media-unavailable" ? unavailableMedia : scenario === "no-cover" ? null : media, coverMediaId: scenario === "no-cover" ? null : scenario === "media-unavailable" ? unavailableMedia.id : media.id }));
  const [createRequests, setCreateRequests] = useState(0);
  const snapshot = { roles: ["admin" as const], permissions: ROLE_PERMISSIONS.admin, displayName: "Fictional CMS reviewer" };
  const operations = {
    createEditorStory: async (input: unknown) => {
      setCreateRequests((count) => count + 1);
      if (scenario === "slow-create") await new Promise((resolve) => setTimeout(resolve, 800));
      return { ok: true as const, data: { ...current, ...(input as Partial<EditorStory>), status: "draft" as const, version: 1 } };
    },
    updateEditorStory: async (input: unknown) => {
      if (scenario === "conflict") return { ok: false as const, code: "STORY_CONFLICT" as const };
      if (scenario === "save-error") return { ok: false as const, code: "STORY_UNAVAILABLE" as const };
      const value = input as { expectedVersion: number; changes: Partial<EditorStory> };
      const next: EditorStory = { ...current, ...value.changes, version: current.version + 1, updatedAt: now, cover: current.cover };
      setCurrent(next); return { ok: true as const, data: next };
    },
    getEditorStory: async () => ({ ok: true as const, data: current }),
    publishEditorStory: async () => { const next: EditorStory = { ...current, status: "published", version: current.version + 1, publishedAt: now }; setCurrent(next); return { ok: true as const, data: next }; },
    scheduleEditorStory: async (input: unknown) => { const next: EditorStory = { ...current, status: "scheduled", version: current.version + 1, publishAt: (input as { publishAt: string }).publishAt }; setCurrent(next); return { ok: true as const, data: next }; },
    unpublishEditorStory: async () => { const next: EditorStory = { ...current, status: "draft", version: current.version + 1, publishAt: null, publishedAt: null }; setCurrent(next); return { ok: true as const, data: next }; },
    archiveEditorStory: async () => { const next: EditorStory = { ...current, status: "archived", version: current.version + 1 }; setCurrent(next); return { ok: true as const, data: next }; },
    listPickerMedia: async (cursor?: string) => ({ ok: true as const, data: { items: cursor ? [unavailableMedia] : [media], nextCursor: cursor ? null : "fictional-cursor" } }),
  };
  const { body: _body, bodyMedia: _bodyMedia, ...summary } = current;
  return <PermissionsProvider snapshot={snapshot}><CmsShell module="stories" displayName={snapshot.displayName}>
    <p className="uss-reference-disclosure">Development-only fictional Stories. No backend identity, media storage or publication authority.</p><span data-testid="story-create-requests" className="uss-reference-disclosure">Fictional create requests: {createRequests}</span>
    {scenario === "forbidden" ? <ServiceFeedback code="INSUFFICIENT_PERMISSION" /> : scenario === "unavailable" ? <ServiceFeedback code="STORY_UNAVAILABLE" /> : view === "taxonomy" ? <TaxonomyManager initial={taxonomy} operations={{ createEditorTaxonomy: async (input: unknown) => { const v = input as { kind: string; fields: { name: string; slug?: string } }; return { ok: true as const, data: { id: crypto.randomUUID(), name: v.fields.name, slug: v.fields.slug || v.fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), version: 1, usageCount: 0, updatedAt: now, description: null, sortOrder: 0, isActive: true, roleTitle: null } }; }, updateEditorTaxonomy: async (input: unknown) => { const v = input as { id: string; changes: Record<string, unknown> }; const found = [...taxonomy.categories, ...taxonomy.tags, ...taxonomy.bylines].find((x) => x.id === v.id)!; return { ok: true as const, data: { ...found, ...v.changes, version: found.version + 1 } as typeof found }; }, deleteEditorTaxonomy: async (input: unknown) => { const v = input as { id: string }; if (scenario === "in-use") return { ok: false as const, code: "STORY_TAXONOMY_IN_USE" as const }; const found = [...taxonomy.categories, ...taxonomy.tags, ...taxonomy.bylines].find((x) => x.id === v.id)!; return { ok: true as const, data: found }; } }} /> : view === "list" ? <StoryList items={scenario === "empty" ? [] : [summary]} nextCursor={scenario === "pagination" ? "fictional-cursor" : null} status="" /> : <StoryEditor key={scenario + view} initial={view === "create" ? null : current} references={refs} startPreview={view === "preview"} operations={operations} />}
  </CmsShell></PermissionsProvider>;
}
