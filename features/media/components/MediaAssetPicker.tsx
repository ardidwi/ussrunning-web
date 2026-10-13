"use client";
import { useEffect, useRef, useState } from "react";
import { Button, EmptyState, Modal } from "@/components/ui";
import type { MediaAsset, MediaPage } from "@/lib/media/media-types";
import { listPickerMedia } from "../api/actions";

export function MediaAssetPicker({ open, onClose, onSelect, selectedId, loadMedia = listPickerMedia, title = "Select cover media" }: {
  open: boolean; onClose: () => void; onSelect: (asset: MediaAsset) => void; selectedId: string | null;
  loadMedia?: typeof listPickerMedia; title?: string;
}) {
  const [page, setPage] = useState<MediaPage>({ items: [], nextCursor: null });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const request = useRef(0);
  async function load(cursor?: string) {
    const id = ++request.current;
    setState("loading");
    try {
      const result = await loadMedia(cursor);
      if (id !== request.current) return;
      if (!result.ok) { setState("error"); return; }
      setPage((previous) => ({ items: cursor ? [...previous.items, ...result.data.items] : result.data.items, nextCursor: result.data.nextCursor }));
      setState("idle");
    } catch { if (id === request.current) setState("error"); }
  }
  useEffect(() => {
    if (open) void load();
    return () => { request.current++; };
  }, [open, loadMedia]);
  return <Modal open={open} onClose={onClose} title={title} description="Choose an existing BE-11 MediaAsset. Upload is unavailable until persistent storage is configured." className="uss-media-picker" actions={<Button variant="secondary" onClick={onClose}>Close picker</Button>}>
    {state === "loading" && page.items.length === 0 && <p role="status">Loading media…</p>}
    {state === "error" && <div role="alert" className="uss-story-notice"><p>We couldn't load the media library.</p><Button variant="secondary" onClick={() => void load()}>Retry</Button></div>}
    {state !== "loading" && state !== "error" && page.items.length === 0 && <EmptyState title="No active media yet." description="The media library has no selectable assets. Persistent upload is not connected here." />}
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
