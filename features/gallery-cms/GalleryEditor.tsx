"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, FormActions, FormSection, Input, LinkButton, Modal, Select, Textarea } from "@/components/ui";
import { useMemberDirty, useMemberLeave } from "@/components/dashboard/MemberNavigationGuard";
import { MediaAssetPicker } from "@/features/media/components/MediaAssetPicker";
import { listPickerMedia } from "@/features/media/api/actions";
import type { MediaAsset } from "@/lib/media/media-types";
import type { GalleryContent, GalleryItem, ManagedGallery } from "@/lib/gallery/gallery-types";
import { addEditorGalleryItem, archiveEditorGallery, createEditorGallery, publishEditorGallery, readEditorGallery, readEditorGalleryItems, readEditorGalleryRevisions, readGalleryEventOptions, removeEditorGalleryItem, reorderEditorGalleryItems, unpublishEditorGallery, updateEditorGallery, updateEditorGalleryItem } from "./api/actions";
import { GALLERY_ITEM_PAGE_SIZE, exactOrder, galleryContent, galleryDraft, galleryHref, galleryMessage, galleryTime, validateGallery, validateItemText, type GalleryDraft } from "./model";

type Revision = { id: string; version: number; action: string; createdAt: string };
type EventOption = { id: string; title: string; status: string };
type Phase = "idle" | "submitting" | "success" | "error" | "conflict";
type ItemDraft = { caption: string; alt: string };
type Transition = "publish" | "unpublish" | "archive";
const actions = { createEditorGallery, updateEditorGallery, readEditorGallery, publishEditorGallery, unpublishEditorGallery, archiveEditorGallery, addEditorGalleryItem, updateEditorGalleryItem, removeEditorGalleryItem, reorderEditorGalleryItems, readEditorGalleryItems, readEditorGalleryRevisions, readGalleryEventOptions, listPickerMedia };
function itemDrafts(items: GalleryItem[]): Record<string, ItemDraft> { return Object.fromEntries(items.map((item) => [item.id, { caption: item.caption ?? "", alt: item.altTextOverride ?? "" }])); }
function mediaImage(asset: MediaAsset | null, label: string, override?: string | null) { return asset?.deliveryAvailable && asset.url ? <img src={asset.url} alt={override || asset.altText || label} /> : <div className="uss-gallery-cover-fallback">{asset ? "Preview unavailable" : "No cover selected"}</div>; }
export function GalleryEditor({ initial, initialItems, initialItemCursor, initialRevisions, initialRevisionError, eventOptions, eventOptionsError, startPreview = false, operations: overrides }: {
  initial: ManagedGallery | null; initialItems: GalleryItem[]; initialItemCursor: string | null; initialRevisions: Revision[]; initialRevisionError: string | null;
  eventOptions: { items: EventOption[]; nextCursor: string | null } | null; eventOptionsError: string | null; startPreview?: boolean; operations?: Partial<typeof actions>;
}) {
  const router = useRouter(), setDirty = useMemberDirty(), leave = useMemberLeave();
  const api = { ...actions, ...overrides };
  const [gallery, setGallery] = useState(initial);
  const [draft, setDraft] = useState<GalleryDraft>(() => galleryDraft(initial));
  const [baseline, setBaseline] = useState<GalleryDraft>(() => galleryDraft(initial));
  const [cover, setCover] = useState<MediaAsset | null>(initial?.cover ?? null);
  const [items, setItems] = useState(initialItems);
  const [baselineOrder, setBaselineOrder] = useState(initialItems.map((item) => item.id));
  const [nextCursor, setNextCursor] = useState(initialItemCursor);
  const [itemFields, setItemFields] = useState<Record<string, ItemDraft>>(() => itemDrafts(initialItems));
  const [revisions, setRevisions] = useState(initialRevisions);
  const [historyError, setHistoryError] = useState(Boolean(initialRevisionError));
  const [phase, setPhase] = useState<Phase>("idle"), [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [picker, setPicker] = useState<"cover" | "item" | null>(null);
  const [preview, setPreview] = useState(startPreview), [transition, setTransition] = useState<Transition | null>(null);
  const [removeItem, setRemoveItem] = useState<string | null>(null);
  const [itemLoading, setItemLoading] = useState(false);
  const [events, setEvents] = useState(eventOptions), [eventLoading, setEventLoading] = useState(false), [eventError, setEventError] = useState(eventOptionsError);
  const lock = useRef(false);
  const formDirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const orderDirty = items.map((item) => item.id).join(",") !== baselineOrder.join(",");
  const itemDirty = items.some((item) => JSON.stringify(itemFields[item.id]) !== JSON.stringify({ caption: item.caption ?? "", alt: item.altTextOverride ?? "" }));
  const dirty = formDirty || orderDirty || itemDirty;
  const readOnly = gallery?.status === "published" || gallery?.status === "archived";
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
  function set<K extends keyof GalleryDraft>(key: K, value: GalleryDraft[K]) { setDraft((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, [key]: "" })); setNotice(""); if (phase !== "idle") setPhase("idle"); }
  function adopt(next: ManagedGallery, preserveDraft = false) { const value = galleryDraft(next); setGallery(next); setBaseline(value); if (!preserveDraft) { setDraft(value); setCover(next.cover); setDirty(false); } router.refresh(); if (next.version !== gallery?.version) void api.readEditorGalleryRevisions({ id: next.id, limit: 10 }).then((result) => { if (result.ok) { setRevisions(result.data.items); setHistoryError(false); } else setHistoryError(true); }).catch(() => setHistoryError(true)); }
  function failed(code: string) { setNotice(galleryMessage(code)); setPhase(code === "GALLERY_CONFLICT" || code === "GALLERY_ORDER_CONFLICT" ? "conflict" : "error"); if (code === "GALLERY_MEDIA_INVALID") setErrors({ cover: galleryMessage(code) }); else if (code === "GALLERY_INVALID_REFERENCE") setErrors({ eventId: galleryMessage(code) }); }
  async function loadItems(id: string, all: boolean, preserve: Record<string, ItemDraft> = {}) {
    setItemLoading(true);
    try {
      let cursor: string | null = null, loaded: GalleryItem[] = [], loops = 0;
      do {
        const result = await api.readEditorGalleryItems({ id, limit: GALLERY_ITEM_PAGE_SIZE, ...(cursor ? { cursor } : {}) });
        if (!result.ok) { failed(result.code); return false; }
        loaded = [...loaded, ...result.data.items]; cursor = result.data.nextCursor;
        if (loaded.length > 1000 || ++loops > 10) { failed("GALLERY_UNAVAILABLE"); return false; }
      } while (all && cursor);
      setItems(loaded); setBaselineOrder(loaded.map((item) => item.id)); setItemFields({ ...itemDrafts(loaded), ...Object.fromEntries(Object.entries(preserve).filter(([key]) => loaded.some((item) => item.id === key))) }); setNextCursor(cursor);
      return true;
    } catch { failed("GALLERY_UNAVAILABLE"); return false; }
    finally { setItemLoading(false); }
  }
  async function reloadLatest() {
    if (!gallery || lock.current) return;
    lock.current = true; setPhase("submitting");
    try { const result = await api.readEditorGallery({ id: gallery.id });
      if (!result.ok) { failed(result.code); return; }
      if (!await loadItems(gallery.id, true)) return;
      adopt(result.data); setNotice("Latest Gallery and item order loaded. Review before saving again."); setPhase("success");
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function loadMoreEvents() {
    if (!events?.nextCursor || eventLoading) return;
    setEventLoading(true); setEventError(null);
    try { const result = await api.readGalleryEventOptions(events.nextCursor);
      if (!result.ok) { setEventError(result.code); return; }
      setEvents((previous) => ({ items: [...(previous?.items ?? []), ...result.data.items], nextCursor: result.data.nextCursor }));
    } catch { setEventError("EVENT_UNAVAILABLE"); }
    finally { setEventLoading(false); }
  }
  async function retryEvents() {
    if (eventLoading) return;
    setEventLoading(true); setEventError(null);
    try { const result = await api.readGalleryEventOptions();
      if (!result.ok) { setEventError(result.code); return; }
      setEvents(result.data);
    } catch { setEventError("EVENT_UNAVAILABLE"); }
    finally { setEventLoading(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (lock.current || readOnly) return;
    if (orderDirty || itemDirty) { setNotice("Save item text and order before changing Gallery details."); setPhase("error"); return; }
    const validation = validateGallery(draft); setErrors(validation);
    if (Object.keys(validation).length) { setNotice("Review the highlighted fields before saving."); setPhase("error"); return; }
    lock.current = true; setPhase("submitting"); setNotice("");
    try {
      const content = galleryContent(draft);
      if (!gallery) {
        const result = await api.createEditorGallery(content);
        if (!result.ok) { failed(result.code); return; }
        setDirty(false); setPhase("success"); setNotice("Draft Gallery created."); router.replace(galleryHref({ view: "edit", id: result.data.id }));
      } else {
        const previous = galleryContent(baseline), changes: Partial<GalleryContent> = {};
        for (const key of ["title", "description", "visibility", "eventId", "coverMediaId"] as const) if (previous[key] !== content[key]) (changes as Record<string, unknown>)[key] = content[key];
        if (!Object.keys(changes).length) { setPhase("idle"); return; }
        const result = await api.updateEditorGallery({ id: gallery.id, expectedVersion: gallery.version, changes });
        if (!result.ok) { failed(result.code); return; }
        adopt(result.data); setNotice("Gallery changes saved."); setPhase("success");
      }
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function transitionNow() {
    if (!gallery || !transition || lock.current || dirty) return;
    lock.current = true; setPhase("submitting"); setNotice("");
    try { const request = { id: gallery.id, expectedVersion: gallery.version };
      const result = transition === "publish" ? await api.publishEditorGallery(request) : transition === "unpublish" ? await api.unpublishEditorGallery(request) : await api.archiveEditorGallery(request);
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); setTransition(null); setNotice(`Gallery ${transition === "publish" ? "published" : transition === "unpublish" ? "unpublished" : "archived"}.`); setPhase("success");
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  function requestTransition(value: Transition) { if (dirty) { setNotice("Save Gallery and item changes before changing publication status."); setPhase("error"); return; } setTransition(value); }
  async function addItem(asset: MediaAsset) {
    if (!gallery || lock.current || readOnly || dirty) return;
    lock.current = true; setPhase("submitting");
    try { const result = await api.addEditorGalleryItem({ id: gallery.id, expectedVersion: gallery.version, mediaAssetId: asset.id });
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); if (await loadItems(gallery.id, true)) { setNotice("Image added to Gallery."); setPhase("success"); }
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function saveItem(item: GalleryItem) {
    if (!gallery || lock.current || readOnly || orderDirty) return;
    const value = itemFields[item.id], validation = validateItemText(value.caption, value.alt);
    setErrors(validation);
    if (Object.keys(validation).length) { setNotice("Review the highlighted item text."); setPhase("error"); return; }
    lock.current = true; setPhase("submitting");
    try { const result = await api.updateEditorGalleryItem({ id: gallery.id, expectedVersion: gallery.version, itemId: item.id, caption: value.caption || null, altTextOverride: value.alt || null });
      if (!result.ok) { failed(result.code); return; }
      const preserve = Object.fromEntries(items.filter((other) => other.id !== item.id && itemFields[other.id] && JSON.stringify(itemFields[other.id]) !== JSON.stringify({ caption: other.caption ?? "", alt: other.altTextOverride ?? "" })).map((other) => [other.id, itemFields[other.id]]));
      adopt(result.data, formDirty); if (await loadItems(gallery.id, true, preserve)) { setNotice("Image details saved. Other unsaved changes are still here."); setPhase("success"); }
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  async function removeSelectedItem() {
    if (!gallery || !removeItem || lock.current || readOnly || dirty) return;
    lock.current = true; setPhase("submitting");
    try { const result = await api.removeEditorGalleryItem({ id: gallery.id, expectedVersion: gallery.version, itemId: removeItem });
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); if (await loadItems(gallery.id, true)) { setRemoveItem(null); setNotice("Image reference removed. The media asset remains in the library."); setPhase("success"); }
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  function move(index: number, delta: number) {
    const other = index + delta;
    if (nextCursor !== null || itemDirty || other < 0 || other >= items.length || readOnly) return;
    setItems((previous) => { const next = [...previous]; [next[index], next[other]] = [next[other], next[index]]; return next; });
  }
  async function saveOrder() {
    if (!gallery || lock.current || !orderDirty || itemDirty || !exactOrder(baselineOrder, nextCursor, items.map((item) => item.id))) { setNotice("Save image text and load the complete active set before saving order."); setPhase("error"); return; }
    lock.current = true; setPhase("submitting");
    try { const result = await api.reorderEditorGalleryItems({ id: gallery.id, expectedVersion: gallery.version, itemIds: items.map((item) => item.id) });
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data, formDirty); if (await loadItems(gallery.id, true)) { setNotice("Image order saved."); setPhase("success"); }
    } catch { failed("GALLERY_UNAVAILABLE"); }
    finally { lock.current = false; }
  }
  const selectedEvent = events?.items.find((event) => event.id === draft.eventId);
  if (preview) return <section className="uss-gallery-preview" aria-label="Private Gallery preview"><div className="uss-gallery-preview-top"><span>PREVIEW · PRIVATE WORKSPACE</span><Button variant="secondary" onClick={() => setPreview(false)}>Back to editor</Button></div><div className="uss-gallery-preview-cover">{mediaImage(cover, "Gallery cover")}</div><p className="uss-member-kicker">{draft.visibility} / {gallery?.status ?? "unsaved draft"}</p><h1>{draft.title || "Untitled Gallery"}</h1>{draft.description && <p>{draft.description}</p>}<div className="uss-gallery-preview-grid">{items.map((item) => <figure key={item.id}>{mediaImage(item.media, "Gallery image", itemFields[item.id]?.alt || item.altTextOverride)}<figcaption>{itemFields[item.id]?.caption || item.caption || item.altTextOverride || item.media.altText || "Image without caption"}</figcaption></figure>)}</div><p className="uss-gallery-muted">This preview uses managed draft content. It is not a public Gallery page.</p></section>;
  return <div className="uss-gallery-editor">
    <div className="uss-gallery-toolbar"><div><p className="uss-member-kicker">USS CMS / GALLERY / {gallery ? "MANAGE" : "NEW DRAFT"}</p><h1>{gallery ? "EDIT GALLERY." : "NEW GALLERY."}</h1><p>Build a collection image by image, then publish when it is ready.</p></div><LinkButton href={galleryHref()} variant="secondary">All Galleries ↗</LinkButton></div>
    {gallery && <div className="uss-gallery-meta uss-gallery-identity"><Badge tone={gallery.status === "published" ? "success" : gallery.status === "archived" ? "error" : "info"}>{gallery.status}</Badge><span>{gallery.visibility}</span><span>Version {gallery.version}</span><span>Updated {galleryTime(gallery.updatedAt)}</span><span>/gallery/{gallery.slug}</span></div>}
    {gallery?.status === "published" && <p className="uss-gallery-notice">Published Galleries are read-only. Unpublish, edit, then publish again.</p>}
    {gallery?.status === "archived" && <p className="uss-gallery-notice">This Gallery is archived. Its media assets and history remain retained.</p>}
    <div className="uss-gallery-status" role={phase === "error" || phase === "conflict" ? "alert" : "status"} aria-live="polite">{phase === "submitting" ? "Saving…" : notice}{phase === "conflict" && <Button variant="secondary" onClick={() => leave(() => void reloadLatest())}>Reload latest Gallery</Button>}</div>
    <div className="uss-gallery-editor-grid"><form onSubmit={save} noValidate><FormSection title="GALLERY INFORMATION" description="The collection identity and context seen by your editorial team.">
      <Field label="Title" required hint="Public headline for this collection; the server creates a stable URL when you first save." error={errors.title}><Input value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={241} disabled={readOnly || phase === "submitting"} /></Field>
      <Field label="Description" hint="Optional plain-text introduction to the images. Markup is not interpreted." error={errors.description}><Textarea className="resize-none" rows={5} value={draft.description ?? ""} onChange={(event) => set("description", event.target.value || null)} maxLength={4001} disabled={readOnly || phase === "submitting"} /></Field>
      <div className="uss-gallery-fields-two"><Field label="Visibility" hint="Private collections stay within the CMS even when published."><Select value={draft.visibility} onChange={(event) => set("visibility", event.target.value as GalleryDraft["visibility"])} disabled={readOnly || phase === "submitting"}><option value="private">Private</option><option value="public">Public</option></Select></Field><Field label="Related event" hint="Optional. Choose a managed event; public publication still follows backend event rules." error={errors.eventId}><Select value={draft.eventId ?? ""} onChange={(event) => set("eventId", event.target.value || null)} disabled={readOnly || phase === "submitting" || !events}><option value="">No event</option>{draft.eventId && !selectedEvent && <option value={draft.eventId}>Linked event (not in current options)</option>}{events?.items.map((event) => <option key={event.id} value={event.id}>{event.title} · {event.status}</option>)}</Select></Field></div>
      {eventError && <div role="alert" className="uss-gallery-event-error"><p>Event options are unavailable. Existing event links are preserved.</p><Button variant="secondary" loading={eventLoading} onClick={() => void retryEvents()}>Retry event options</Button></div>}{events?.nextCursor && <Button variant="secondary" loading={eventLoading} onClick={() => void loadMoreEvents()}>Load more events</Button>}
      <div className="uss-gallery-cover-field"><p className="uss-field-label">Cover media</p><p className="uss-field-hint">Choose an existing BE-11 image. Delivery may be unavailable until persistent storage is configured.</p><div className="uss-gallery-cover-preview">{mediaImage(cover, "Gallery cover")}</div><div className="uss-gallery-actions"><Button variant="secondary" onClick={() => setPicker("cover")} disabled={readOnly || phase === "submitting"}>Select cover</Button>{draft.coverMediaId && <Button variant="text" onClick={() => { set("coverMediaId", null); setCover(null); }} disabled={readOnly || phase === "submitting"}>Remove cover</Button>}</div>{errors.cover && <p role="alert" className="uss-gallery-error">{errors.cover}</p>}</div>
    </FormSection><FormActions cancel={<Button variant="text" onClick={() => setPreview(true)}>Preview Gallery ↗</Button>}><Button type="submit" loading={phase === "submitting"} loadingLabel={gallery ? "Saving…" : "Creating draft…"} disabled={readOnly || (!!gallery && !formDirty)}>{gallery ? "Save changes" : "Create draft"}</Button></FormActions></form>
    <aside className="uss-gallery-rail"><h2>PUBLICATION.</h2><p>Saving a draft does not publish it. BE-13 checks image, cover and event eligibility.</p>{gallery ? <><dl><dt>Status</dt><dd>{gallery.status}</dd><dt>Slug</dt><dd>/gallery/{gallery.slug}</dd><dt>Published</dt><dd>{galleryTime(gallery.publishedAt)}</dd></dl><p className="uss-gallery-muted">The public Gallery frontend is not wired yet. Use protected preview to review content.</p><div className="uss-gallery-actions">{gallery.status === "draft" && <Button onClick={() => requestTransition("publish")}>Publish Gallery</Button>}{gallery.status === "published" && <Button variant="secondary" onClick={() => requestTransition("unpublish")}>Unpublish to edit</Button>}{gallery.status !== "archived" && <Button variant="danger" onClick={() => requestTransition("archive")}>Archive Gallery</Button>}</div></> : <p>Save the draft to add images and enable publication.</p>}{gallery && <div className="uss-gallery-history"><h3>RECENT CHANGES.</h3>{historyError && <p role="status">Recent change metadata could not be refreshed. Reload the Gallery to try again.</p>}{revisions.length ? <ol>{revisions.map((revision) => <li key={revision.id}>Version {revision.version} · {revision.action} · {galleryTime(revision.createdAt)}</li>)}</ol> : <p>Revision metadata is unavailable or empty.</p>}<p>Metadata preview only. No restore action is available.</p></div>}</aside></div>
    {gallery && <section className="uss-gallery-items" aria-label="Gallery images"><div className="uss-gallery-items-head"><div><p className="uss-member-kicker">COLLECTION / ACTIVE ITEMS</p><h2>IMAGE ORDER.</h2><p>Loaded {items.length} image{items.length === 1 ? "" : "s"}{nextCursor ? "; more remain" : "; full active set"}. Remove only detaches the Gallery reference.</p></div><Button onClick={() => setPicker("item")} disabled={readOnly || phase === "submitting" || dirty}>Add existing image</Button></div>
      {itemLoading && <p role="status">Loading Gallery images…</p>}{nextCursor && <div className="uss-gallery-order-note"><p>Load the complete active set before moving or saving image order. Save image text first to keep those edits.</p><Button variant="secondary" loading={itemLoading} disabled={itemDirty} onClick={() => void loadItems(gallery.id, true)}>Load all images for ordering</Button></div>}
      {!items.length && !itemLoading && <p className="uss-gallery-notice">No images yet. Add an existing MediaAsset before publication.</p>}
      <ol className="uss-gallery-item-list">{items.map((item, index) => <li key={item.id} className="uss-gallery-item"><div className="uss-gallery-item-visual">{mediaImage(item.media, "Gallery image", itemFields[item.id]?.alt || item.altTextOverride)}</div><div className="uss-gallery-item-copy"><p className="uss-member-kicker">IMAGE {String(index + 1).padStart(2, "0")} / {item.media.visibility}</p><Field label={`Caption for image ${index + 1}`} hint="Optional text shown with this Gallery image." error={errors.caption}><Input value={itemFields[item.id]?.caption ?? ""} onChange={(event) => setItemFields((old) => ({ ...old, [item.id]: { ...old[item.id], caption: event.target.value } }))} maxLength={2001} disabled={readOnly || phase === "submitting"} /></Field><Field label={`Alt text override for image ${index + 1}`} hint={`Leave blank to use MediaAsset alt text${item.media.altText ? `: ${item.media.altText}` : "; no fallback alt text is available"}.`} error={errors.alt}><Input value={itemFields[item.id]?.alt ?? ""} onChange={(event) => setItemFields((old) => ({ ...old, [item.id]: { ...old[item.id], alt: event.target.value } }))} maxLength={1001} disabled={readOnly || phase === "submitting"} /></Field><div className="uss-gallery-actions"><Button variant="secondary" onClick={() => void saveItem(item)} disabled={readOnly || phase === "submitting" || orderDirty || !itemFields[item.id] || (itemFields[item.id].caption === (item.caption ?? "") && itemFields[item.id].alt === (item.altTextOverride ?? ""))}>Save image text</Button><Button variant="danger" onClick={() => setRemoveItem(item.id)} disabled={readOnly || phase === "submitting" || dirty}>Remove from Gallery</Button></div></div><div className="uss-gallery-reorder"><Button variant="secondary" aria-label={`Move image ${index + 1} up`} onClick={() => move(index, -1)} disabled={readOnly || !!nextCursor || itemDirty || index === 0 || phase === "submitting"}>↑</Button><Button variant="secondary" aria-label={`Move image ${index + 1} down`} onClick={() => move(index, 1)} disabled={readOnly || !!nextCursor || itemDirty || index === items.length - 1 || phase === "submitting"}>↓</Button></div></li>)}</ol>
      {orderDirty && <div className="uss-gallery-order-note" role="status"><p>Image order has changed locally. Save the full order or reload to discard it.</p><Button loading={phase === "submitting"} onClick={() => void saveOrder()}>Save image order</Button></div>}
    </section>}
    <MediaAssetPicker open={picker !== null} onClose={() => setPicker(null)} title={picker === "item" ? "Add Gallery image" : "Select cover media"} selectedId={picker === "cover" ? draft.coverMediaId : null} loadMedia={api.listPickerMedia} onSelect={(asset) => { if (picker === "item") void addItem(asset); else { set("coverMediaId", asset.id); setCover(asset); } }} />
    <Modal open={transition !== null} onClose={() => setTransition(null)} title={transition === "archive" ? "Archive this Gallery?" : transition === "unpublish" ? "Unpublish this Gallery?" : "Publish this Gallery?"} description={transition === "archive" ? "The collection leaves public view; images and history remain retained." : transition === "unpublish" ? "The collection leaves public view. Edit it, then publish again." : "BE-13 will verify the active images, cover, visibility and linked event before publication."} actions={<><Button variant="secondary" onClick={() => setTransition(null)}>Cancel</Button><Button variant={transition === "archive" ? "danger" : "primary"} loading={phase === "submitting"} onClick={() => void transitionNow()}>{transition === "archive" ? "Archive Gallery" : transition === "unpublish" ? "Unpublish" : "Publish"}</Button></>} />
    <Modal open={removeItem !== null} onClose={() => setRemoveItem(null)} title="Remove image from this Gallery?" description="The underlying MediaAsset stays in the media library; only this Gallery reference is removed." actions={<><Button variant="secondary" onClick={() => setRemoveItem(null)}>Keep image</Button><Button variant="danger" loading={phase === "submitting"} onClick={() => void removeSelectedItem()}>Remove from Gallery</Button></>} />
  </div>;
}
