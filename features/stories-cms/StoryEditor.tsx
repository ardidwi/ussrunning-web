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
import { initialDraft, jakartaSchedule, storyContent, storyHref, storyMessage, storyTime, validateStory, type EditorDraft, type StoryReferences } from "./model";

type Phase = "idle" | "submitting" | "success" | "error" | "conflict";
type Transition = "publish" | "schedule" | "unpublish" | "archive";
const editableKeys = ["title", "excerpt", "body", "contentType", "categoryId", "coverMediaId", "visibility", "featured"] as const satisfies readonly (keyof StoryContent)[];
const backendOperations = { createEditorStory, updateEditorStory, getEditorStory, publishEditorStory, scheduleEditorStory, unpublishEditorStory, archiveEditorStory, listPickerMedia };
function previewMedia(asset: MediaAsset | null) {
  return asset?.deliveryAvailable && asset.url ? <img src={asset.url} alt={asset.altText || "Story cover"} /> : <div className="uss-story-cover-fallback">{asset ? "Cover delivery unavailable" : "No cover selected"}</div>;
}
export function StoryEditor({ initial, references, startPreview = false, operations: overrides }: { initial: EditorStory | null; references: StoryReferences; startPreview?: boolean; operations?: Partial<typeof backendOperations> }) {
  const router = useRouter();
  const operations = { ...backendOperations, ...overrides };
  const setDirty = useMemberDirty();
  const leave = useMemberLeave();
  const [story, setStory] = useState(initial);
  const [draft, setDraft] = useState<EditorDraft>(() => initialDraft(initial, references));
  const [baseline, setBaseline] = useState<EditorDraft>(() => initialDraft(initial, references));
  const [cover, setCover] = useState<MediaAsset | null>(initial?.cover ?? null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState(startPreview);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [scheduleLocal, setScheduleLocal] = useState("");
  const lock = useRef(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const content = useMemo(() => storyContent(draft), [draft]);
  const readOnly = story?.status === "published" || story?.status === "archived";
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
  function set<K extends keyof EditorDraft>(key: K, value: EditorDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
    setNotice("");
    if (phase !== "idle") setPhase("idle");
  }
  function adopt(value: EditorStory) {
    const next = initialDraft(value, references);
    setStory(value); setDraft(next); setBaseline(next); setCover(value.cover);
    setDirty(false);
    router.refresh();
  }
  function failed(code: string) {
    setNotice(storyMessage(code));
    setPhase(code === "STORY_CONFLICT" ? "conflict" : "error");
    if (code === "STORY_MEDIA_INVALID") setErrors({ cover: storyMessage(code) });
    else if (code === "STORY_INVALID_REFERENCE") setErrors({ contentType: storyMessage(code) });
    else if (code === "STORY_INVALID_CONTENT") setErrors({ bodyText: storyMessage(code) });
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
        const previous = storyContent(baseline);
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
  if (preview) return <section className="uss-story-preview" aria-label="Private Story preview">
    <div className="uss-story-preview-top"><span className="uss-story-preview-label">PREVIEW · PRIVATE WORKSPACE</span><Button variant="secondary" onClick={() => setPreview(false)}>Back to editor</Button></div>
    <div className="uss-story-preview-cover">{previewMedia(cover)}</div><p className="uss-member-kicker">{draft.contentType} / {draft.visibility}</p><h1>{draft.title || "Untitled Story"}</h1>{draft.excerpt && <p className="uss-story-preview-excerpt">{draft.excerpt}</p>}
    <div className="uss-story-preview-body">{content.body.length ? content.body.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>Body copy will appear here.</p>}</div>
    <p className="uss-story-preview-note">This preview uses unsaved editor text. It is not publicly published.</p>
  </section>;
  return <div className="uss-story-editor">
    <div className="uss-story-editor-header"><div><p className="uss-member-kicker">USS CMS / STORIES / {story ? "MANAGE" : "NEW DRAFT"}</p><h1>{story ? "EDIT STORY." : "NEW STORY."}</h1><p>{story ? "Shape the copy, then choose a deliberate publication action." : "Start with a private editorial draft."}</p></div><LinkButton href={storyHref()} variant="secondary">All Stories ↗</LinkButton></div>
    {story && <div className="uss-story-identity"><Badge tone={story.status === "published" ? "success" : story.status === "archived" ? "error" : "info"}>{story.status}</Badge><span>{story.visibility}</span><span>Version {story.version}</span><span>Updated {storyTime(story.updatedAt)}</span><span className="uss-story-url">/stories/{story.slug}</span></div>}
    {story?.status === "published" && <p className="uss-story-notice">Published Stories are read-only. Unpublish, edit, then publish again.</p>}
    {story?.status === "archived" && <p className="uss-story-notice">This Story is archived. BE-12 treats archived Stories as terminal.</p>}
    {references.truncated && <p className="uss-story-notice">Reference options are bounded to 100 items. Ask an administrator if an option is missing.</p>}
    <div className="uss-story-status" role={phase === "error" || phase === "conflict" ? "alert" : "status"} aria-live="polite">{phase === "submitting" ? "Saving…" : notice}{phase === "conflict" && <Button variant="secondary" onClick={() => leave(() => void reloadLatest())}>Reload latest version</Button>}</div>
    <div className="uss-story-editor-grid"><form onSubmit={save} noValidate>
      <FormSection title="STORY INFORMATION" description="The headline, context and cover used in the editorial experience.">
        <Field label="Title" required hint="Main headline shown on the Story page and Story cards." error={errors.title}><Input value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={241} disabled={readOnly || phase === "submitting"} /></Field>
        <Field label="Excerpt" hint="Short summary shown on listing cards and social previews. Leave blank for a body-derived summary." error={errors.excerpt}><Textarea className="resize-none" rows={3} value={draft.excerpt ?? ""} onChange={(event) => set("excerpt", event.target.value || null)} maxLength={601} disabled={readOnly || phase === "submitting"} /></Field>
        <div className="uss-story-fields-two"><Field label="Content type" required hint="Choose an active editorial type." error={errors.contentType}><Select value={draft.contentType} onChange={(event) => set("contentType", event.target.value)} disabled={readOnly || phase === "submitting"}><option value="">Select a type</option>{references.contentTypes.map((type) => <option key={type.code} value={type.code}>{type.name}</option>)}</Select></Field>
          <Field label="Category" hint="Optional active category from the editorial taxonomy."><Select value={draft.categoryId ?? ""} onChange={(event) => set("categoryId", event.target.value || null)} disabled={readOnly || phase === "submitting"}><option value="">No category</option>{references.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></Field></div>
        <div className="uss-story-fields-two"><Field label="Visibility" hint="Public Stories are eligible for the public feed only after publication."><Select value={draft.visibility} onChange={(event) => set("visibility", event.target.value as EditorDraft["visibility"])} disabled={readOnly || phase === "submitting"}><option value="private">Private</option><option value="public">Public</option></Select></Field><Checkbox label="Feature this Story" hint="Editorial placement flag; public display depends on the public Stories integration." checked={draft.featured} onChange={(event) => set("featured", event.target.checked)} disabled={readOnly || phase === "submitting"} /></div>
        <div className="uss-story-cover-field"><p className="uss-field-label">Cover media</p><p className="uss-field-hint">Main visual used on Story listings and article headers. A valid cover is required before publication.</p><div className="uss-story-cover-preview">{previewMedia(cover)}</div><div className="uss-story-actions"><Button variant="secondary" onClick={() => setPicker(true)} disabled={readOnly || phase === "submitting"}>Select existing media</Button>{draft.coverMediaId && <Button variant="text" onClick={() => { set("coverMediaId", null); setCover(null); }} disabled={readOnly || phase === "submitting"}>Remove cover</Button>}</div>{errors.cover && <p role="alert" className="uss-story-field-error">{errors.cover}</p>}</div>
      </FormSection>
      <FormSection title="BODY COPY" description="Plain-text paragraphs. Empty lines separate paragraphs; markup is not interpreted.">
        <Field label="Story body" hint="Write in paragraphs. Up to 100 paragraphs and 4,000 characters per paragraph." error={errors.bodyText}><Textarea className="uss-story-body-input resize-none" rows={12} value={draft.bodyText} onChange={(event) => set("bodyText", event.target.value)} disabled={readOnly || phase === "submitting"} /></Field><p className="uss-story-character-count">{content.body.length} paragraphs · {draft.bodyText.length} characters</p>
      </FormSection>
      <FormActions cancel={<Button variant="text" onClick={() => setPreview(true)}>Preview draft ↗</Button>}><Button type="submit" loading={phase === "submitting"} loadingLabel={story ? "Saving…" : "Creating draft…"} disabled={readOnly || !references.contentTypes.length || (!dirty && Boolean(story))}>{story ? "Save changes" : "Create draft"}</Button></FormActions>
    </form><aside className="uss-story-editor-rail"><h2>PUBLICATION.</h2><p>Story state comes from BE-12. Saving text does not publish it.</p>{story ? <><dl><dt>Status</dt><dd>{story.status}</dd><dt>Public URL</dt><dd>/stories/{story.slug}</dd><dt>Scheduled</dt><dd>{storyTime(story.publishAt)}</dd><dt>Published</dt><dd>{storyTime(story.publishedAt)}</dd></dl><p className="uss-story-rail-note">The public Stories page still uses legacy content. This CMS preview is the reliable view until public migration.</p><div className="uss-story-rail-actions">{story.status === "draft" && <><Button onClick={() => requestTransition("publish")}>Publish now</Button><Button variant="secondary" onClick={() => requestTransition("schedule")}>Schedule</Button></>}{story.status === "scheduled" && <><Button onClick={() => requestTransition("publish")}>Publish now</Button><Button variant="secondary" onClick={() => requestTransition("schedule")}>Reschedule</Button><Button variant="secondary" onClick={() => requestTransition("unpublish")}>Unpublish</Button></>}{story.status === "published" && <Button variant="secondary" onClick={() => requestTransition("unpublish")}>Unpublish to edit</Button>}{story.status !== "archived" && <Button variant="danger" onClick={() => requestTransition("archive")}>Archive Story</Button>}</div></> : <p>Save this draft to enable publication controls.</p>}</aside></div>
    <MediaAssetPicker open={picker} onClose={() => setPicker(false)} selectedId={draft.coverMediaId} loadMedia={operations.listPickerMedia} onSelect={(asset) => { set("coverMediaId", asset.id); setCover(asset); }} />
    <Modal open={transition !== null} onClose={() => setTransition(null)} title={transition === "archive" ? "Archive this Story?" : transition === "unpublish" ? "Unpublish this Story?" : transition === "schedule" ? "Schedule this Story?" : "Publish this Story now?"} description={transition === "archive" ? "The Story will leave public view, but its history will remain available." : transition === "unpublish" ? "The Story will leave public view. Edit it, then publish again when ready." : transition === "schedule" ? "The backend will publish at the specified absolute time. Check the Jakarta time before confirming." : "This will make the Story eligible for public delivery under BE-12 rules."} actions={<><Button variant="secondary" onClick={() => setTransition(null)}>Cancel</Button><Button variant={transition === "archive" ? "danger" : "primary"} loading={phase === "submitting"} onClick={() => void runTransition()}>{transition === "schedule" ? "Confirm schedule" : transition === "archive" ? "Archive Story" : transition === "unpublish" ? "Unpublish" : "Publish"}</Button></>}>
      {transition === "schedule" && <><Field label="Publication time (Jakarta / WIB, UTC+07:00)" required hint="Enter local Jakarta time. The exact timestamp is shown below before submission."><Input type="datetime-local" value={scheduleLocal} onChange={(event) => setScheduleLocal(event.target.value)} /></Field><p className="uss-story-schedule-review">{jakartaSchedule(scheduleLocal) ? `Publishes ${storyTime(jakartaSchedule(scheduleLocal))} · ${jakartaSchedule(scheduleLocal)}` : "Choose a valid date and time."}</p></>}
    </Modal>
  </div>;
}
