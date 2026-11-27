"use client";
import { useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { MediaAssetPicker } from "@/features/media/components/MediaAssetPicker";
import type { listPickerMedia } from "@/features/media/api/actions";
import type { MediaAsset } from "@/lib/media/media-types";
import { BLOCK_LIMITS, ctaUrl, embedTarget, type ImageRef, type StoryBlockType } from "@/lib/stories/story-blocks";
import { newBlock, type EditorBlock } from "./model";

const LABELS: Record<StoryBlockType, string> = { paragraph: "Paragraph", heading: "Heading", image: "Image", gallery: "Gallery", quote: "Quote", embed: "Embed", cta: "Button", divider: "Divider" };
const ORDER: StoryBlockType[] = ["paragraph", "heading", "image", "gallery", "quote", "embed", "cta", "divider"];
type Picking = { key: string; mode: "image" | "gallery-add" | { gallery: number } } | null;

function Thumb({ asset }: { asset: MediaAsset | undefined }) {
  return <div className="uss-block-thumb">{asset?.deliveryAvailable && asset.url ? <img src={asset.url} alt="" /> : <span>{asset ? "Preview unavailable" : "No image"}</span>}</div>;
}

export function BlockEditor({ blocks, onChange, media, onMedia, errors, disabled, loadMedia }: {
  blocks: EditorBlock[]; onChange: (next: EditorBlock[]) => void; media: ReadonlyMap<string, MediaAsset>; onMedia: (asset: MediaAsset) => void;
  errors: Record<string, string>; disabled: boolean; loadMedia: typeof listPickerMedia;
}) {
  const [picking, setPicking] = useState<Picking>(null);
  const update = (key: string, patch: Partial<EditorBlock>) => onChange(blocks.map((b) => (b.key === key ? ({ ...b, ...patch } as EditorBlock) : b)));
  const move = (index: number, delta: number) => { const next = [...blocks]; const [item] = next.splice(index, 1); next.splice(index + delta, 0, item); onChange(next); };
  const remove = (key: string) => onChange(blocks.filter((b) => b.key !== key));
  const insert = (type: StoryBlockType, at = blocks.length) => { const next = [...blocks]; next.splice(at, 0, newBlock(type)); onChange(next); };
  function chosen(asset: MediaAsset) {
    if (!picking) return;
    onMedia(asset);
    const block = blocks.find((b) => b.key === picking.key);
    const ref: ImageRef = { mediaId: asset.id, alt: asset.altText ?? "", caption: null };
    if (block?.type === "image") update(block.key, { mediaId: asset.id, alt: block.alt || asset.altText || "" });
    else if (block?.type === "gallery") {
      if (picking.mode === "gallery-add") { if (block.items.length < BLOCK_LIMITS.galleryMax && !block.items.some((i) => i.mediaId === asset.id)) update(block.key, { items: [...block.items, ref] }); }
      else if (typeof picking.mode === "object") { const at = picking.mode.gallery; update(block.key, { items: block.items.map((item, i) => (i === at ? { ...item, mediaId: asset.id, alt: item.alt || asset.altText || "" } : item)) }); }
    }
  }
  return <div className="uss-block-editor">
    <ol className="uss-block-list" aria-label="Story content blocks">
      {blocks.map((block, index) => {
        const n = index + 1, error = errors[`block:${block.key}`];
        const id = (field: string) => `${block.key}-${field}`;
        return <li key={block.key} className={`uss-block-card${error ? " uss-block-card-error" : ""}`} aria-label={`Block ${n}: ${LABELS[block.type]}`}>
          <div className="uss-block-card-head">
            <span className="uss-block-type">{n}. {LABELS[block.type]}</span>
            <div className="uss-block-tools">
              <Button variant="text" onClick={() => move(index, -1)} disabled={disabled || index === 0} aria-label={`Move block ${n} up`}>↑</Button>
              <Button variant="text" onClick={() => move(index, 1)} disabled={disabled || index === blocks.length - 1} aria-label={`Move block ${n} down`}>↓</Button>
              <Button variant="text" onClick={() => insert("paragraph", index + 1)} disabled={disabled || blocks.length >= BLOCK_LIMITS.blocks} aria-label={`Add paragraph below block ${n}`}>+ ¶</Button>
              <Button variant="text" onClick={() => remove(block.key)} disabled={disabled} aria-label={`Remove block ${n}`}>Remove</Button>
            </div>
          </div>
          {block.type === "paragraph" && <Field label={`Paragraph ${n}`} hint="Plain text. Line breaks are kept; markup is not interpreted."><Textarea id={id("text")} className="resize-none" rows={4} value={block.text} maxLength={BLOCK_LIMITS.paragraph + 1} onChange={(e) => update(block.key, { text: e.target.value })} disabled={disabled} /></Field>}
          {block.type === "heading" && <div className="uss-block-row"><Field label="Level"><Select value={String(block.level)} onChange={(e) => update(block.key, { level: Number(e.target.value) as 2 | 3 })} disabled={disabled}><option value="2">Section (H2)</option><option value="3">Sub-section (H3)</option></Select></Field><Field label={`Heading ${n}`}><Input value={block.text} maxLength={BLOCK_LIMITS.heading + 1} onChange={(e) => update(block.key, { text: e.target.value })} disabled={disabled} /></Field></div>}
          {block.type === "image" && <div className="uss-block-media">
            <Thumb asset={media.get(block.mediaId)} />
            <div className="uss-block-media-fields">
              <Button variant="secondary" onClick={() => setPicking({ key: block.key, mode: "image" })} disabled={disabled}>{block.mediaId ? "Replace image" : "Choose image"}</Button>
              <Field label={`Alt text for image block ${n}`} required hint="Describe the image for people using screen readers."><Input value={block.alt} maxLength={BLOCK_LIMITS.alt + 1} onChange={(e) => update(block.key, { alt: e.target.value })} disabled={disabled} /></Field>
              <Field label={`Caption for image block ${n}`}><Input value={block.caption ?? ""} maxLength={BLOCK_LIMITS.caption + 1} onChange={(e) => update(block.key, { caption: e.target.value || null })} disabled={disabled} /></Field>
            </div>
          </div>}
          {block.type === "gallery" && <div className="uss-block-gallery-edit">
            <p className="uss-field-hint">{block.items.length} of {BLOCK_LIMITS.galleryMax} images · at least {BLOCK_LIMITS.galleryMin} required.</p>
            <ul>{block.items.map((item, i) => <li key={item.mediaId + i} className="uss-block-media">
              <Thumb asset={media.get(item.mediaId)} />
              <div className="uss-block-media-fields">
                <Field label={`Alt text for gallery ${n} image ${i + 1}`} required><Input value={item.alt} maxLength={BLOCK_LIMITS.alt + 1} onChange={(e) => update(block.key, { items: block.items.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)) })} disabled={disabled} /></Field>
                <div className="uss-block-tools">
                  <Button variant="text" onClick={() => setPicking({ key: block.key, mode: { gallery: i } })} disabled={disabled}>Replace</Button>
                  <Button variant="text" aria-label={`Move gallery ${n} image ${i + 1} earlier`} onClick={() => { const items = [...block.items]; [items[i - 1], items[i]] = [items[i], items[i - 1]]; update(block.key, { items }); }} disabled={disabled || i === 0}>↑</Button>
                  <Button variant="text" aria-label={`Remove gallery ${n} image ${i + 1}`} onClick={() => update(block.key, { items: block.items.filter((_, j) => j !== i) })} disabled={disabled}>Remove</Button>
                </div>
              </div>
            </li>)}</ul>
            <Button variant="secondary" onClick={() => setPicking({ key: block.key, mode: "gallery-add" })} disabled={disabled || block.items.length >= BLOCK_LIMITS.galleryMax}>Add gallery image</Button>
          </div>}
          {block.type === "quote" && <><Field label={`Quote ${n}`}><Textarea className="resize-none" rows={3} value={block.text} maxLength={BLOCK_LIMITS.quote + 1} onChange={(e) => update(block.key, { text: e.target.value })} disabled={disabled} /></Field><Field label="Attribution" hint="Optional: who said it."><Input value={block.attribution ?? ""} maxLength={BLOCK_LIMITS.attribution + 1} onChange={(e) => update(block.key, { attribution: e.target.value || null })} disabled={disabled} /></Field></>}
          {block.type === "embed" && (() => { const target = block.url ? embedTarget(block.url) : null; return <Field label={`Embed link ${n}`} hint={block.url ? (target ? `Recognised: ${target.title}${target.frameSrc ? "" : " (shown as a link card)"}.` : "Not an allowed link.") : "Paste a YouTube, Vimeo, Spotify, Instagram or Strava link."}><Input type="url" inputMode="url" value={block.url} maxLength={BLOCK_LIMITS.url} onChange={(e) => update(block.key, { url: e.target.value })} disabled={disabled} /></Field>; })()}
          {block.type === "cta" && <div className="uss-block-row"><Field label={`Button label ${n}`}><Input value={block.label} maxLength={BLOCK_LIMITS.ctaLabel + 1} onChange={(e) => update(block.key, { label: e.target.value })} disabled={disabled} /></Field><Field label="Button link" hint={block.url && !ctaUrl(block.url) ? "Use https:// or a site path such as /runs." : "https:// link or a site path such as /runs."}><Input value={block.url} inputMode="url" maxLength={BLOCK_LIMITS.url} onChange={(e) => update(block.key, { url: e.target.value })} disabled={disabled} /></Field></div>}
          {block.type === "divider" && <p className="uss-field-hint">A horizontal rule separates sections.</p>}
          {error && <p role="alert" className="uss-story-field-error">{error}</p>}
        </li>;
      })}
    </ol>
    <div className="uss-block-add" role="group" aria-label="Add a content block">
      <span className="uss-field-label">Add block</span>
      {ORDER.map((type) => <Button key={type} variant="secondary" onClick={() => insert(type)} disabled={disabled || blocks.length >= BLOCK_LIMITS.blocks}>+ {LABELS[type]}</Button>)}
    </div>
    <MediaAssetPicker open={picking !== null} onClose={() => setPicking(null)} title={picking?.mode === "gallery-add" ? "Add gallery image" : "Choose block image"} selectedId={null} loadMedia={loadMedia} onSelect={chosen} />
  </div>;
}
