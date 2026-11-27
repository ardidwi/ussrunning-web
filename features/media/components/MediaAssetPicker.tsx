"use client";
import { useEffect, useRef, useState } from "react";
import { Button, EmptyState, Input, Modal } from "@/components/ui";
import type { MediaAsset, MediaPage } from "@/lib/media/media-types";
import { listPickerMedia } from "../api/actions";

export function MediaAssetPicker({ open, onClose, onSelect, selectedId, loadMedia = listPickerMedia, title = "Select cover media" }: {
  open: boolean; onClose: () => void; onSelect: (asset: MediaAsset) => void; selectedId: string | null;
  loadMedia?: typeof listPickerMedia; title?: string;
}) {
  const [page, setPage] = useState<MediaPage>({ items: [], nextCursor: null });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const request = useRef(0);
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");
  async function load(cursor?: string, q = applied) {
    const id = ++request.current;
    setState("loading");
    try {
      const result = await loadMedia(cursor, q || undefined);
      if (id !== request.current) return;
      if (!result.ok) { setState("error"); return; }
      setPage((previous) => ({ items: cursor ? [...previous.items, ...result.data.items] : result.data.items, nextCursor: result.data.nextCursor }));
      setState("idle");
    } catch { if (id === request.current) setState("error"); }
  }
  function runSearch() { const q = search.trim(); setApplied(q); void load(undefined, q); }
  useEffect(() => {
    if (open) { setSearch(""); setApplied(""); void load(undefined, ""); }
    return () => { request.current++; };
  }, [open, loadMedia]);
  return <Modal open={open} onClose={onClose} title={title} description="Choose an image from the media library. Upload new images in the Media workspace." className="uss-media-picker" actions={<Button variant="secondary" onClick={onClose}>Close picker</Button>}>
    {/* Not a <form>: the picker is rendered inside editor forms, and nested forms are invalid HTML. */}
    <div className="uss-media-picker-search" role="search">
      <Input type="search" aria-label="Search media by alt text, caption or file name" placeholder="Search alt text, caption, file name" value={search} maxLength={120} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); runSearch(); } }} />
      <Button variant="secondary" onClick={runSearch}>Search</Button>
      <a className="uss-media-picker-link" href="/admin?module=media" target="_blank" rel="noopener">Open media library ↗</a>
    </div>
    {state === "loading" && page.items.length === 0 && <p role="status">Loading media…</p>}
    {state === "error" && <div role="alert" className="uss-story-notice"><p>We couldn't load the media library.</p><Button variant="secondary" onClick={() => void load()}>Retry</Button></div>}
    {state !== "loading" && state !== "error" && page.items.length === 0 && <EmptyState title={applied ? "No media matches this search." : "No active media yet."} description={applied ? "Try another word, or clear the search." : "Upload images in the Media workspace, then choose them here."} />}
    <ul className="uss-media-list">
      {page.items.map((asset) => <li key={asset.id}>
        <button type="button" className="uss-media-choice" aria-pressed={selectedId === asset.id} onClick={() => { onSelect(asset); onClose(); }}>
          {asset.deliveryAvailable && asset.url ? <img src={asset.url} alt={asset.altText || "Media preview"} /> : <span className="uss-media-unavailable">Preview unavailable</span>}
          <span><strong>{asset.altText || "Untitled media"}</strong><small>{asset.visibility} · {asset.mimeType} · {asset.deliveryAvailable ? "Deliverable" : "Delivery unavailable"}</small></span>
          {selectedId === asset.id && <span aria-label="Selected">✓</span>}
        </button>
      </li>)}
    </ul>
    {page.nextCursor && <Button variant="secondary" loading={state === "loading"} loadingLabel="Loading…" onClick={() => void load(page.nextCursor!)}>Load more media</Button>}
  </Modal>;
}
