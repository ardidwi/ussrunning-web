"use client";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState, Field, Input, LinkButton, Modal, Select, Textarea } from "@/components/ui";
import type { MediaAsset, MediaLibraryItem, MediaLibraryPage, MediaUploadTicket, MediaUsage } from "@/lib/media/media-types";
import { archiveLibraryMedia, finalizeLibraryUpload, getLibraryMediaUsage, requestLibraryUpload, updateLibraryMedia, type MediaActionResult } from "../api/library-actions";
import { altProblem, fileProblem, formatBytes, LIBRARY_MIMES, mediaHref, mediaMessage, safeFilename, usageHref, usageLabel, type LibraryQuery } from "../model";
import "./media-library.css";

/** Browser PUT straight to object storage; the app server never receives the bytes. */
async function browserPut(ticket: MediaUploadTicket, file: File) {
  const response = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.headers, body: file });
  return response.ok;
}
const backend = { requestLibraryUpload, finalizeLibraryUpload, updateLibraryMedia, archiveLibraryMedia, getLibraryMediaUsage, putObject: browserPut };
export type LibraryOperations = typeof backend;
type Queued = { key: string; file: File; preview: string; alt: string; caption: string; visibility: "public" | "private"; state: "ready" | "uploading" | "done" | "error"; message: string };
let seq = 0;

function Preview({ asset }: { asset: MediaAsset }) {
  return asset.deliveryAvailable && asset.url ? <img src={asset.url} alt={asset.altText ?? ""} loading="lazy" /> : <span className="uss-media-unavailable">Preview unavailable</span>;
}

export function MediaLibrary({ page, query, error, operations }: { page: MediaLibraryPage | null; query: LibraryQuery; error: string | null; operations?: Partial<LibraryOperations> }) {
  const router = useRouter();
  const ops = { ...backend, ...operations };
  const [items, setItems] = useState<MediaLibraryItem[]>(page?.items ?? []);
  const [queue, setQueue] = useState<Queued[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<{ tone: "status" | "alert"; text: string } | null>(null);
  const [selected, setSelected] = useState<MediaLibraryItem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uploading = queue.some((q) => q.state === "uploading");
  useEffect(() => setItems(page?.items ?? []), [page]);
  useEffect(() => () => queue.forEach((q) => URL.revokeObjectURL(q.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!queue.some((q) => q.state === "ready" || q.state === "uploading")) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [queue]);

  function add(files: FileList | File[]) {
    const next: Queued[] = [];
    for (const file of Array.from(files).slice(0, 20)) {
      const problem = fileProblem(file);
      next.push({ key: `u${++seq}`, file, preview: problem ? "" : URL.createObjectURL(file), alt: "", caption: "", visibility: "public", state: problem ? "error" : "ready", message: problem ?? "" });
    }
    setQueue((q) => [...q, ...next]); setNotice(null);
  }
  const patch = (key: string, p: Partial<Queued>) => setQueue((q) => q.map((x) => (x.key === key ? { ...x, ...p } : x)));
  async function uploadOne(item: Queued) {
    const problem = altProblem(item.alt);
    if (problem) { patch(item.key, { state: "ready", message: problem }); return false; }
    patch(item.key, { state: "uploading", message: "Uploading…" });
    try {
      const ticket = await ops.requestLibraryUpload({ filename: safeFilename(item.file.name), mimeType: item.file.type, sizeBytes: item.file.size, altText: item.alt.trim(), caption: item.caption.trim() || null, visibility: item.visibility });
      if (!ticket.ok) { patch(item.key, { state: "error", message: mediaMessage(ticket.code) }); return false; }
      if (!(await ops.putObject(ticket.data, item.file))) { patch(item.key, { state: "error", message: mediaMessage("MEDIA_UPLOAD_FAILED") }); return false; }
      const done = await ops.finalizeLibraryUpload({ uploadId: ticket.data.uploadId });
      if (!done.ok) { patch(item.key, { state: "error", message: mediaMessage(done.code) }); return false; }
      patch(item.key, { state: "done", message: "Uploaded." });
      setItems((list) => [{ ...done.data, usageCount: 0 }, ...list.filter((x) => x.id !== done.data.id)]);
      return true;
    } catch { patch(item.key, { state: "error", message: mediaMessage("MEDIA_UPLOAD_FAILED") }); return false; }
  }
  async function uploadAll() {
    let ok = 0, failed = 0;
    for (const item of queue.filter((q) => q.state === "ready")) { if (await uploadOne(item)) ok++; else failed++; }
    setNotice(failed ? { tone: "alert", text: `${ok} uploaded, ${failed} need attention.` } : { tone: "status", text: `${ok} image${ok === 1 ? "" : "s"} uploaded.` });
    if (ok) router.refresh();
  }
  function drop(event: DragEvent) { event.preventDefault(); setDragging(false); if (event.dataTransfer.files.length) add(event.dataTransfer.files); }
  const ready = queue.filter((q) => q.state === "ready").length;
  return <div className="uss-media-library">
    <div className="uss-story-toolbar"><div><p className="uss-member-kicker">USS CMS / MEDIA</p><h1>MEDIA LIBRARY.</h1><p>Every image used across Stories, Gallery, Events, Partners and the website. Alt text is required.</p></div></div>
    <section className={`uss-media-drop${dragging ? " is-dragging" : ""}`} aria-label="Upload images" onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
      <p><strong>Drag images here</strong> or choose files. JPEG, PNG or WebP. Files upload directly to storage and are checked by the server before they appear.</p>
      <input ref={input} type="file" accept={LIBRARY_MIMES.join(",")} multiple hidden onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }} />
      <Button variant="secondary" onClick={() => input.current?.click()} disabled={uploading}>Choose images</Button>
    </section>
    {queue.length > 0 && <section className="uss-media-queue" aria-label="Upload queue">
      <ul>{queue.map((item, i) => <li key={item.key} className={`uss-media-queue-item is-${item.state}`}>
        <div className="uss-media-queue-thumb">{item.preview ? <img src={item.preview} alt="" /> : <span>✕</span>}</div>
        <div className="uss-media-queue-fields">
          <p className="uss-media-queue-name">{item.file.name} · {formatBytes(item.file.size)}</p>
          {item.state !== "done" && item.preview && <>
            <Field label={`Alt text for ${item.file.name}`} required hint="Describe what the image shows."><Input value={item.alt} maxLength={513} onChange={(e) => patch(item.key, { alt: e.target.value, message: "" })} disabled={item.state === "uploading"} /></Field>
            <div className="uss-story-fields-two">
              <Field label={`Caption for upload ${i + 1}`}><Input value={item.caption} maxLength={2000} onChange={(e) => patch(item.key, { caption: e.target.value })} disabled={item.state === "uploading"} /></Field>
              <Field label={`Visibility for upload ${i + 1}`} hint="Public images can appear on public pages."><Select value={item.visibility} onChange={(e) => patch(item.key, { visibility: e.target.value as Queued["visibility"] })} disabled={item.state === "uploading"}><option value="public">Public</option><option value="private">Private</option></Select></Field>
            </div></>}
          {item.message && <p role={item.state === "error" || (item.state === "ready" && item.message) ? "alert" : "status"} className={item.state === "done" ? "uss-media-ok" : "uss-story-field-error"}>{item.message}</p>}
        </div>
        <Button variant="text" onClick={() => { URL.revokeObjectURL(item.preview); setQueue((q) => q.filter((x) => x.key !== item.key)); }} disabled={item.state === "uploading"} aria-label={`Remove ${item.file.name} from queue`}>Remove</Button>
      </li>)}</ul>
      <div className="uss-story-actions"><Button onClick={() => void uploadAll()} loading={uploading} loadingLabel="Uploading…" disabled={!ready}>Upload {ready || ""} image{ready === 1 ? "" : "s"}</Button><Button variant="text" onClick={() => setQueue((q) => q.filter((x) => x.state === "uploading" || x.state === "ready"))} disabled={uploading}>Clear finished</Button></div>
    </section>}
    {notice && <p className="uss-story-notice" role={notice.tone}>{notice.text}</p>}
    <form className="uss-media-filters" role="search" method="get" action="/admin">
      <input type="hidden" name="module" value="media" />
      <Field label="Search"><Input name="q" defaultValue={query.q} maxLength={120} placeholder="Alt text, caption or file name" /></Field>
      <Field label="Type"><Select name="mime" defaultValue={query.mime}><option value="">All types</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option><option value="image/webp">WebP</option></Select></Field>
      <Field label="Visibility"><Select name="visibility" defaultValue={query.visibility}><option value="">Any</option><option value="public">Public</option><option value="private">Private</option></Select></Field>
      <Field label="Status"><Select name="status" defaultValue={query.status}><option value="active">Active</option><option value="archived">Archived</option></Select></Field>
      <div className="uss-media-filter-actions"><Button type="submit" variant="secondary">Apply</Button>{(query.q || query.mime || query.visibility || query.status !== "active") && <LinkButton href={mediaHref()} variant="text">Reset</LinkButton>}</div>
    </form>
    {error ? <div className="uss-story-failure" role="alert"><p>{error}</p><LinkButton href={mediaHref()} variant="secondary">Reload library</LinkButton></div>
      : items.length === 0 ? <EmptyState title={query.q || query.mime || query.visibility ? "No media matches these filters." : query.status === "archived" ? "No archived media." : "No media yet."} description="Upload images above, or change the filters." />
      : <ul className="uss-media-grid" aria-label="Media items">{items.map((item) => <li key={item.id}>
        <button type="button" className="uss-media-tile" onClick={() => setSelected(item)} aria-label={`Open details for ${item.altText || "untitled image"}`}>
          <span className="uss-media-tile-img"><Preview asset={item} /></span>
          <span className="uss-media-tile-copy"><strong>{item.altText || "Missing alt text"}</strong><small>{item.visibility} · {item.mimeType.replace("image/", "").toUpperCase()} · {item.width}×{item.height}</small><small>{item.usageCount ? `Used in ${item.usageCount} place${item.usageCount === 1 ? "" : "s"}` : "Not used yet"}</small></span>
        </button>
      </li>)}</ul>}
    <nav className="uss-story-pagination" aria-label="Media pages">{query.cursor && <LinkButton href={mediaHref({ ...query, cursor: "" })} variant="text">First page</LinkButton>}{page?.nextCursor && <LinkButton href={mediaHref({ ...query, cursor: page.nextCursor })} variant="secondary">Next page ↗</LinkButton>}</nav>
    <MediaDetail item={selected} onClose={() => setSelected(null)} ops={ops} onChanged={(next) => { setItems((list) => next.status !== query.status ? list.filter((x) => x.id !== next.id) : list.map((x) => (x.id === next.id ? next : x))); setSelected(next.status === query.status ? next : null); router.refresh(); }} />
  </div>;
}

function MediaDetail({ item, onClose, ops, onChanged }: { item: MediaLibraryItem | null; onClose: () => void; ops: LibraryOperations; onChanged: (next: MediaLibraryItem) => void }) {
  const [alt, setAlt] = useState(""); const [caption, setCaption] = useState(""); const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [usage, setUsage] = useState<MediaUsage[] | null>(null); const [usageError, setUsageError] = useState(false);
  const [message, setMessage] = useState<{ tone: "status" | "alert"; text: string } | null>(null);
  const [busy, setBusy] = useState(false); const [confirm, setConfirm] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    if (!item) return;
    setAlt(item.altText ?? ""); setCaption(item.caption ?? ""); setVisibility(item.visibility); setMessage(null); setConfirm(false); setUsage(null); setUsageError(false);
    let live = true;
    ops.getLibraryMediaUsage({ id: item.id }).then((r) => { if (!live) return; if (r.ok) setUsage(r.data); else setUsageError(true); }).catch(() => live && setUsageError(true));
    return () => { live = false; };
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return null;
  const altError = altProblem(alt);
  const dirty = alt !== (item.altText ?? "") || caption !== (item.caption ?? "") || visibility !== item.visibility;
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!item || lock.current || altError || !dirty) return;
    lock.current = true; setBusy(true); setMessage(null);
    const changes: Record<string, unknown> = {};
    if (alt !== (item.altText ?? "")) changes.altText = alt.trim();
    if (caption !== (item.caption ?? "")) changes.caption = caption.trim() || null;
    if (visibility !== item.visibility) changes.visibility = visibility;
    try { const r: MediaActionResult<MediaAsset> = await ops.updateLibraryMedia({ id: item.id, expectedVersion: item.version, ...changes });
      if (!r.ok) { setMessage({ tone: "alert", text: mediaMessage(r.code) }); return; }
      onChanged({ ...r.data, usageCount: item.usageCount }); setMessage({ tone: "status", text: "Details saved." });
    } catch { setMessage({ tone: "alert", text: mediaMessage("MEDIA_UNAVAILABLE") }); }
    finally { lock.current = false; setBusy(false); }
  }
  async function archive() {
    if (!item || lock.current) return;
    lock.current = true; setBusy(true);
    try { const r = await ops.archiveLibraryMedia({ id: item.id, expectedVersion: item.version });
      if (!r.ok) { setMessage({ tone: "alert", text: mediaMessage(r.code) }); setConfirm(false); return; }
      onChanged({ ...r.data, usageCount: item.usageCount });
    } catch { setMessage({ tone: "alert", text: mediaMessage("MEDIA_UNAVAILABLE") }); }
    finally { lock.current = false; setBusy(false); }
  }
  const archived = item.status === "archived";
  return <Modal open onClose={onClose} title="Media details" description={`${item.mimeType} · ${formatBytes(item.sizeBytes)} · ${item.width}×${item.height}`} className="uss-media-detail" actions={<Button variant="secondary" onClick={onClose}>Close</Button>}>
    <div className="uss-media-detail-grid">
      <div className="uss-media-detail-img"><Preview asset={item} /></div>
      <form onSubmit={save} noValidate className="uss-media-detail-form">
        <div className="uss-story-row-meta"><Badge tone={archived ? "error" : "success"}>{item.status}</Badge><span>{item.visibility}</span><span>v{item.version}</span></div>
        <Field label="Alt text" required error={alt ? altError ?? undefined : "Alt text is required."}><Textarea className="resize-none" rows={3} value={alt} maxLength={513} onChange={(e) => setAlt(e.target.value)} disabled={busy || archived} /></Field>
        <Field label="Caption"><Input value={caption} maxLength={2000} onChange={(e) => setCaption(e.target.value)} disabled={busy || archived} /></Field>
        <Field label="Visibility" hint="Public Stories and pages can only use public images."><Select value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")} disabled={busy || archived}><option value="public">Public</option><option value="private">Private</option></Select></Field>
        {message && <p className="uss-story-notice" role={message.tone}>{message.text}</p>}
        {!archived && <div className="uss-story-actions"><Button type="submit" loading={busy} loadingLabel="Saving…" disabled={!dirty || Boolean(altError)}>Save details</Button>{!confirm ? <Button variant="text" onClick={() => setConfirm(true)} disabled={busy || (usage?.length ?? 0) > 0}>Archive</Button> : <><Button variant="danger" onClick={() => void archive()} loading={busy}>Confirm archive</Button><Button variant="text" onClick={() => setConfirm(false)}>Keep</Button></>}</div>}
        {confirm && <p className="uss-field-hint">Archiving hides the image from pickers. The file and its history are kept.</p>}
      </form>
    </div>
    <section className="uss-media-usage" aria-label="Where this image is used"><h3>USED WHERE.</h3>
      {usageError ? <p role="alert">Usage could not be loaded. Archive stays blocked by the server if the image is referenced.</p>
        : usage === null ? <p role="status">Loading usage…</p>
        : usage.length === 0 ? <p>Not used in any Story, Gallery, Event, Partner or website slot.</p>
        : <ul>{usage.map((u) => <li key={`${u.kind}-${u.role}-${u.entityId}`}><a href={usageHref(u)}>{u.label}</a><span>{usageLabel(u)}{u.status ? ` · ${u.status}` : ""}</span></li>)}</ul>}
    </section>
  </Modal>;
}
