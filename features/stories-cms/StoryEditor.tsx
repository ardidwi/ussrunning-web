"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Checkbox, Field, FormActions, FormSection, Input, LinkButton, Modal, Select, Textarea, Badge } from "@/components/ui";
import { useMemberDirty, useMemberLeave } from "@/components/dashboard/MemberNavigationGuard";
import { MediaAssetPicker } from "@/features/media/components/MediaAssetPicker";
import { listPickerMedia } from "@/features/media/api/actions";
import type { MediaAsset } from "@/lib/media/media-types";
import type { StoryContent } from "@/lib/stories/story-types";
import { archiveEditorStory, createEditorStory, getEditorStory, publishEditorStory, scheduleEditorStory, unpublishEditorStory, updateEditorStory, type EditorStory } from "./api/actions";
import { BlockEditor } from "./BlockEditor";
import { StoryBlocksView } from "./StoryBlocksView";
import { draftSignature, initialDraft, jakartaSchedule, previewBlocks, storyContent, storyHref, storyMessage, storyTime, validateStory, type EditorDraft, type StoryReferences } from "./model";

type Phase = "idle" | "submitting" | "success" | "error" | "conflict";
type Transition = "publish" | "schedule" | "unpublish" | "archive";
const editableKeys = ["title", "excerpt", "body", "contentType", "categoryId", "coverMediaId", "visibility", "featured", "bylineId", "tagIds"] as const satisfies readonly (keyof StoryContent)[];
const backendOperations = { createEditorStory, updateEditorStory, getEditorStory, publishEditorStory, scheduleEditorStory, unpublishEditorStory, archiveEditorStory, listPickerMedia };
function previewMedia(asset: MediaAsset | null) {
  return asset?.deliveryAvailable && asset.url ? <img src={asset.url} alt={asset.altText || "Story cover"} /> : <div className="uss-story-cover-fallback">{asset ? "Cover delivery unavailable" : "No cover selected"}</div>;
}
function mediaMap(story: EditorStory | null) { return new Map((story?.bodyMedia ?? []).map((m) => [m.id, m])); }
export function StoryEditor({ initial, references, startPreview = false, operations: overrides }: { initial: EditorStory | null; references: StoryReferences; startPreview?: boolean; operations?: Partial<typeof backendOperations> }) {
  const router = useRouter();
  const operations = { ...backendOperations, ...overrides };
  const setDirty = useMemberDirty();
  const leave = useMemberLeave();
  const [story, setStory] = useState(initial);
  const [draft, setDraft] = useState<EditorDraft>(() => initialDraft(initial, references));
  const [baseline, setBaseline] = useState(() => draftSignature(initialDraft(initial, references)));
  const [cover, setCover] = useState<MediaAsset | null>(initial?.cover ?? null);
  const [media, setMedia] = useState(() => mediaMap(initial));
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState(startPreview);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [scheduleLocal, setScheduleLocal] = useState("");
  const lock = useRef(false);
  const content = useMemo(() => storyContent(draft), [draft]);
  const dirty = JSON.stringify(content) !== baseline;
  const readOnly = story?.status === "published" || story?.status === "archived";
  const busy = readOnly || phase === "submitting";
  const tags = references.tags ?? [], bylines = references.bylines ?? [];
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
  function set<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setNotice("");
    if (phase !== "idle") setPhase("idle");
  }
  function adopt(value: EditorStory) {
    const next = initialDraft(value, references);
    setStory(value); setDraft(next); setBaseline(draftSignature(next)); setCover(value.cover); setMedia(mediaMap(value));
    setDirty(false);
    router.refresh();
  }
  function failed(code: string) {
    setNotice(storyMessage(code));
    setPhase(code === "STORY_CONFLICT" ? "conflict" : "error");
    if (code === "STORY_MEDIA_INVALID") setErrors({ cover: storyMessage(code) });
    else if (code === "STORY_INVALID_REFERENCE") setErrors({ contentType: storyMessage(code) });
    else if (code === "STORY_INVALID_CONTENT") setErrors({ body: storyMessage(code) });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current || readOnly) return;
    const nextErrors = validateStory(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setNotice("Review the highlighted fields before saving."); setPhase("error"); return; }
    lock.current = true; setPhase("submitting"); setNotice("");
    try {
      if (story) {
        const previous = JSON.parse(baseline) as StoryContent;
        const changes: Partial<StoryContent> = {};
        for (const key of editableKeys) if (JSON.stringify(previous[key]) !== JSON.stringify(content[key]))
          (changes as Record<string, unknown>)[key] = content[key];
        if (!Object.keys(changes).length) { setPhase("idle"); return; }
        const result = await operations.updateEditorStory({ id: story.id, expectedVersion: story.version, changes });
        if (!result.ok) { failed(result.code); return; }
        adopt(result.data); setNotice("Story changes saved."); setPhase("success");
      } else {
        const result = await operations.createEditorStory(content);
        if (!result.ok) { failed(result.code); return; }
        setDirty(false); setPhase("success"); setNotice("Draft created.");
        router.replace(storyHref({ view: "edit", id: result.data.id }));
      }
    } catch { failed("STORY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function reloadLatest() {
    if (!story || lock.current) return;
    lock.current = true; setPhase("submitting");
    try { const result = await operations.getEditorStory({ id: story.id });
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); setNotice("Latest version loaded. Review it before saving again."); setPhase("success");
    } catch { failed("STORY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function runTransition() {
    if (!story || !transition || lock.current || dirty) return;
    let publishAt: string | null = null;
    if (transition === "schedule") {
      publishAt = jakartaSchedule(scheduleLocal);
      if (!publishAt || Date.parse(publishAt) <= Date.now()) { setNotice("Choose a future date and time in Jakarta (WIB)."); setPhase("error"); return; }
    }
    lock.current = true; setPhase("submitting"); setNotice("");
    try {
      const request = { id: story.id, expectedVersion: story.version };
      const result = transition === "publish" ? await operations.publishEditorStory(request) : transition === "schedule" ? await operations.scheduleEditorStory({ ...request, publishAt }) : transition === "unpublish" ? await operations.unpublishEditorStory(request) : await operations.archiveEditorStory(request);
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); setTransition(null); setNotice(transition === "schedule" ? `Story scheduled for ${storyTime(result.data.publishAt)}.` : `Story ${transition === "publish" ? "published" : transition === "unpublish" ? "unpublished" : "archived"}.`); setPhase("success");
    } catch { failed("STORY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  function requestTransition(action: Transition) {
    if (dirty) { setNotice("Save your Story changes before changing publication status."); setPhase("error"); return; }
    setTransition(action);
  }
  if (preview) {
    const category = references.categories.find((c) => c.id === draft.categoryId);
    const byline = bylines.find((b) => b.id === draft.bylineId);
    return <section className="uss-story-preview" aria-label="Private Story preview">
      <div className="uss-story-preview-top"><span className="uss-story-preview-label">PREVIEW · PRIVATE WORKSPACE</span><Button variant="secondary" onClick={() => setPreview(false)}>Back to editor</Button></div>
      <div className="uss-story-preview-cover">{previewMedia(cover)}</div><p className="uss-member-kicker">{category?.name ?? draft.contentType} / {draft.visibility}</p><h1>{draft.title || "Untitled Story"}</h1>
      {byline && <p className="uss-article-byline">BY {byline.name.toUpperCase()}{byline.roleTitle ? ` · ${byline.roleTitle}` : ""}</p>}
      {draft.excerpt && <p className="uss-story-preview-excerpt">{draft.excerpt}</p>}
      <div className="uss-story-preview-body uss-article-body"><StoryBlocksView blocks={previewBlocks(draft.blocks, media)} empty={<p>Content blocks will appear here.</p>} /></div>
      <p className="uss-story-preview-note">This preview uses unsaved editor content and the same renderer as the public article. It is not publicly published.</p>
    </section>;
  }
  return <div className="uss-story-editor">
    <div className="uss-story-editor-header"><div><p className="uss-member-kicker">USS CMS / STORIES / {story ? "MANAGE" : "NEW DRAFT"}</p><h1>{story ? "EDIT STORY." : "NEW STORY."}</h1><p>{story ? "Shape the copy, then choose a deliberate publication action." : "Start with a private editorial draft."}</p></div><LinkButton href={storyHref()} variant="secondary">All Stories ↗</LinkButton></div>
    {story && <div className="uss-story-identity"><Badge tone={story.status === "published" ? "success" : story.status === "archived" ? "error" : "info"}>{story.status}</Badge><span>{story.visibility}</span><span>Version {story.version}</span><span>Updated {storyTime(story.updatedAt)}</span><span className="uss-story-url">/stories/{story.slug}</span>{dirty && <span className="uss-story-unsaved">● Unsaved changes</span>}</div>}
    {story?.status === "published" && <p className="uss-story-notice">Published Stories are read-only. Unpublish, edit, then publish again.</p>}
    {story?.status === "archived" && <p className="uss-story-notice">This Story is archived. Archived Stories are terminal.</p>}
    {references.truncated && <p className="uss-story-notice">Reference options are bounded. Ask an administrator if an option is missing.</p>}
    <div className="uss-story-status" role={phase === "error" || phase === "conflict" ? "alert" : "status"} aria-live="polite">{phase === "submitting" ? "Saving…" : notice}{phase === "conflict" && <Button variant="secondary" onClick={() => leave(() => void reloadLatest())}>Reload latest version</Button>}</div>
    <div className="uss-story-editor-grid"><form onSubmit={save} noValidate>
      <FormSection title="STORY INFORMATION" description="The headline, context and cover used in the editorial experience.">
        <Field label="Title" required hint="Main headline shown on the Story page and Story cards." error={errors.title}><Input value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={241} disabled={busy} /></Field>
        <Field label="Excerpt" hint="Short summary shown on listing cards and social previews. Leave blank for a body-derived summary." error={errors.excerpt}><Textarea className="resize-none" rows={3} value={draft.excerpt ?? ""} onChange={(event) => set("excerpt", event.target.value || null)} maxLength={601} disabled={busy} /></Field>
        <div className="uss-story-fields-two"><Field label="Content type" required hint="Choose an active editorial type." error={errors.contentType}><Select value={draft.contentType} onChange={(event) => set("contentType", event.target.value)} disabled={busy}><option value="">Select a type</option>{references.contentTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}</Select></Field>
          <Field label="Category" hint="Shown on the Story and used by the public category filter."><Select value={draft.categoryId ?? ""} onChange={(event) => set("categoryId", event.target.value || null)} disabled={busy}><option value="">No category</option>{references.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field></div>
        <div className="uss-story-fields-two"><Field label="Byline" hint="Editorial author name shown publicly. Defaults to your account name."><Select value={draft.bylineId ?? ""} onChange={(event) => set("bylineId", event.target.value || null)} disabled={busy}><option value="">Account display name</option>{bylines.map((b) => <option key={b.id} value={b.id}>{b.name}{b.roleTitle ? ` — ${b.roleTitle}` : ""}</option>)}</Select></Field>
          <Field label="Visibility" hint="Public Stories are eligible for the public feed only after publication."><Select value={draft.visibility} onChange={(event) => set("visibility", event.target.value as EditorDraft["visibility"])} disabled={busy}><option value="private">Private</option><option value="public">Public</option></Select></Field></div>
        <fieldset className="uss-story-tags"><legend className="uss-field-label">Tags</legend><p className="uss-field-hint">Up to 10. Manage the list under Categories &amp; tags.</p>
          {tags.length ? <div className="uss-story-tag-list">{tags.map((tag) => { const on = draft.tagIds.includes(tag.id); return <label key={tag.id} className={`uss-story-tag${on ? " is-on" : ""}`}><input type="checkbox" checked={on} disabled={busy || (!on && draft.tagIds.length >= 10)} onChange={() => set("tagIds", on ? draft.tagIds.filter((t) => t !== tag.id) : [...draft.tagIds, tag.id])} />{tag.name}</label>; })}</div> : <p className="uss-field-hint">No tags yet.</p>}
          {errors.tags && <p role="alert" className="uss-story-field-error">{errors.tags}</p>}
        </fieldset>
        <Checkbox label="Feature this Story" hint="Editorial placement flag for featured slots." checked={draft.featured} onChange={(event) => set("featured", event.target.checked)} disabled={busy} />
        <div className="uss-story-cover-field"><p className="uss-field-label">Cover media</p><p className="uss-field-hint">Main visual used on Story listings and article headers. A valid cover is required before publication.</p><div className="uss-story-cover-preview">{previewMedia(cover)}</div><div className="uss-story-actions"><Button variant="secondary" onClick={() => setPicker(true)} disabled={busy}>Select existing media</Button>{draft.coverMediaId && <Button variant="text" onClick={() => { set("coverMediaId", null); setCover(null); }} disabled={busy}>Remove cover</Button>}</div>{errors.cover && <p role="alert" className="uss-story-field-error">{errors.cover}</p>}</div>
      </FormSection>
      <FormSection title="CONTENT" description="Build the article from blocks. Text is plain; images come from the media library; embeds are limited to approved providers.">
        <BlockEditor blocks={draft.blocks} onChange={(blocks) => set("blocks", blocks)} media={media} onMedia={(asset) => setMedia((m) => new Map(m).set(asset.id, asset))} errors={errors} disabled={busy} loadMedia={operations.listPickerMedia} />
        {errors.body && <p role="alert" className="uss-story-field-error">{errors.body}</p>}
        <p className="uss-story-character-count">{content.body.length} blocks</p>
      </FormSection>
      <FormActions cancel={<Button variant="text" onClick={() => setPreview(true)}>Preview draft ↗</Button>}><Button type="submit" loading={phase === "submitting"} loadingLabel={story ? "Saving…" : "Creating draft…"} disabled={readOnly || !references.contentTypes.length || (!dirty && Boolean(story))}>{story ? "Save changes" : "Create draft"}</Button></FormActions>
    </form><aside className="uss-story-editor-rail"><h2>PUBLICATION.</h2><p>Saving does not publish. Publishing refreshes the public Stories pages within a minute.</p>{story ? <><dl><dt>Status</dt><dd>{story.status}</dd><dt>Public URL</dt><dd>/stories/{story.slug}</dd><dt>Scheduled</dt><dd>{storyTime(story.publishAt)}</dd><dt>Published</dt><dd>{storyTime(story.publishedAt)}</dd></dl><div className="uss-story-rail-actions">{story.status === "draft" && <><Button onClick={() => requestTransition("publish")}>Publish now</Button><Button variant="secondary" onClick={() => requestTransition("schedule")}>Schedule</Button></>}{story.status === "scheduled" && <><Button onClick={() => requestTransition("publish")}>Publish now</Button><Button variant="secondary" onClick={() => requestTransition("schedule")}>Reschedule</Button><Button variant="secondary" onClick={() => requestTransition("unpublish")}>Unpublish</Button></>}{story.status === "published" && <Button variant="secondary" onClick={() => requestTransition("unpublish")}>Unpublish to edit</Button>}{story.status !== "archived" && <Button variant="danger" onClick={() => requestTransition("archive")}>Archive Story</Button>}</div></> : <p>Save this draft to enable publication controls.</p>}</aside></div>
    <MediaAssetPicker open={picker} onClose={() => setPicker(false)} selectedId={draft.coverMediaId} loadMedia={operations.listPickerMedia} onSelect={(asset) => { set("coverMediaId", asset.id); setCover(asset); }} />
    <Modal open={transition !== null} onClose={() => setTransition(null)} title={transition === "archive" ? "Archive this Story?" : transition === "unpublish" ? "Unpublish this Story?" : transition === "schedule" ? "Schedule this Story?" : "Publish this Story now?"} description={transition === "archive" ? "The Story will leave public view, but its history will remain available." : transition === "unpublish" ? "The Story will leave public view. Edit it, then publish again when ready." : transition === "schedule" ? "The backend will publish at the specified absolute time. Check the Jakarta time before confirming." : "This will make the Story eligible for public delivery."} actions={<><Button variant="secondary" onClick={() => setTransition(null)}>Cancel</Button><Button variant={transition === "archive" ? "danger" : "primary"} loading={phase === "submitting"} onClick={() => void runTransition()}>{transition === "schedule" ? "Confirm schedule" : transition === "archive" ? "Archive Story" : transition === "unpublish" ? "Unpublish" : "Publish"}</Button></>}>
      {transition === "schedule" && <><Field label="Publication time (Jakarta / WIB, UTC+07:00)" required hint="Enter local Jakarta time. The exact timestamp is shown below before submission."><Input type="datetime-local" value={scheduleLocal} onChange={(event) => setScheduleLocal(event.target.value)} /></Field><p className="uss-story-schedule-review">{jakartaSchedule(scheduleLocal) ? `Publishes ${storyTime(jakartaSchedule(scheduleLocal))} · ${jakartaSchedule(scheduleLocal)}` : "Choose a valid date and time."}</p></>}
    </Modal>
  </div>;
}
