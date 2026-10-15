"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { MediaAssetPicker } from "@/features/media/components/MediaAssetPicker";
import {
  archiveSiteContent,
  createSiteContentDraft,
  publishSiteContent,
  unpublishSiteContent,
  updateSiteContentDraft,
} from "@/lib/site-content/site-actions";
import type { ManagedSlot, SiteKey, SlotPayloads } from "@/lib/site-content/site-types";
import { SECTION_IDS } from "@/lib/site-content/site-types";
import type { MediaAsset } from "@/lib/media/media-types";
import { clonePayload, joinLines, siteContentMessage, splitLines } from "./model";

type Item = {
  key: SiteKey;
  label: { title: string; description: string };
  slot: ManagedSlot | null;
  fallback: SlotPayloads[SiteKey];
};

type Payload = Record<string, unknown>;
type Notice = { kind: "success" | "error"; text: string } | null;

function asPayload(value: unknown): Payload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Payload)
    : {};
}

function Input({ label, value, onChange, helper, multiline = false, type = "text" }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  multiline?: boolean;
  type?: "text" | "email" | "url" | "number";
}) {
  const id = `site-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label className="uss-form-field" htmlFor={id}>
      <span>{label}</span>
      {multiline ? (
        <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      <small>{helper ?? "\u00a0"}</small>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="uss-form-field">
      <span>{label}</span>
      <span className="uss-checkbox-row">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
        <span>{checked ? "Enabled" : "Disabled"}</span>
      </span>
      <small>Controls presentation visibility only.</small>
    </label>
  );
}

function SlotFields({ slotKey, payload, setField, openPicker }: {
  slotKey: SiteKey;
  payload: Payload;
  setField: (name: string, value: unknown) => void;
  openPicker: (field: string) => void;
}) {
  const cta = asPayload(payload.cta);
  const text = (name: string) => typeof payload[name] === "string" ? String(payload[name]) : "";
  const bool = (name: string) => payload[name] === true;
  const number = (name: string, fallback = 50) => typeof payload[name] === "number" ? Number(payload[name]) : fallback;
  const list = (name: string) => Array.isArray(payload[name]) ? (payload[name] as string[]) : [];
  const setCta = (name: "label" | "href", value: string) => setField("cta", { ...cta, [name]: value });
  const mediaButton = (field: string, label: string) => (
    <div className="uss-form-field">
      <span>{label}</span>
      <div className="uss-member-quick">
        <Button variant="secondary" onClick={() => openPicker(field)}>Choose media</Button>
        {text(field) ? <Button variant="ghost" onClick={() => setField(field, null)}>Clear</Button> : null}
      </div>
      <small>{text(field) || "No media selected."}</small>
    </div>
  );
  const ctaFields = () => (
    <>
      <Input label="CTA label" value={typeof cta.label === "string" ? cta.label : ""} onChange={(value) => setCta("label", value)} helper="Leave both CTA fields blank only if the slot supports no CTA." />
      <Input label="CTA link" value={typeof cta.href === "string" ? cta.href : ""} onChange={(value) => setCta("href", value)} helper="Approved USS path or HTTPS URL." />
    </>
  );

  switch (slotKey) {
    case "homepage.hero":
      return <><Toggle label="Hero visibility" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Eyebrow" value={text("eyebrow")} onChange={(v) => setField("eyebrow", v)} /><Input label="Established" value={text("established")} onChange={(v) => setField("established", v)} /><Input label="Headline" value={text("headline")} onChange={(v) => setField("headline", v)} multiline /><Input label="Description" value={text("description")} onChange={(v) => setField("description", v)} multiline />{ctaFields()}{mediaButton("desktopMediaId", "Desktop media")}{mediaButton("mobileMediaId", "Mobile media")}<Input label="Image focus" type="number" value={String(number("focus"))} onChange={(v) => setField("focus", Number(v))} helper="0–100" /><Input label="Overlay" type="number" value={String(number("overlay", 55))} onChange={(v) => setField("overlay", Number(v))} helper="0–100" /></>;
    case "homepage.membership":
      return <><Toggle label="Section visibility" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Kicker" value={text("kicker")} onChange={(v) => setField("kicker", v)} /><Input label="Headline" value={text("headline")} onChange={(v) => setField("headline", v)} multiline /><Input label="Description" value={text("description")} onChange={(v) => setField("description", v)} multiline />{ctaFields()}{mediaButton("imageMediaId", "Section image")}</>;
    case "homepage.manifesto":
      return <><Toggle label="Section visibility" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Label" value={text("label")} onChange={(v) => setField("label", v)} /><Input label="Paragraphs" value={joinLines(list("paragraphs"))} onChange={(v) => setField("paragraphs", splitLines(v))} multiline helper="One paragraph per line." /><Input label="Footnote" value={text("footnote")} onChange={(v) => setField("footnote", v)} />{ctaFields()}</>;
    case "homepage.marquee":
      return <><Toggle label="Marquee visibility" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Marquee text" value={text("text")} onChange={(v) => setField("text", v)} /></>;
    case "homepage.featured":
      return <><Toggle label="Featured content" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Story IDs" value={joinLines(list("storyIds"))} onChange={(v) => setField("storyIds", splitLines(v))} multiline helper="One canonical UUID per line." /><Input label="Gallery IDs" value={joinLines(list("galleryIds"))} onChange={(v) => setField("galleryIds", splitLines(v))} multiline helper="One canonical UUID per line." /><Input label="Partner IDs" value={joinLines(list("partnerIds"))} onChange={(v) => setField("partnerIds", splitLines(v))} multiline helper="One canonical UUID per line." /><Input label="Event IDs" value={joinLines(list("eventIds"))} onChange={(v) => setField("eventIds", splitLines(v))} multiline helper="One canonical UUID per line." /></>;
    case "homepage.sections":
      return <Input label="Section order" value={joinLines(list("order"))} onChange={(v) => setField("order", splitLines(v))} multiline helper={`Use every section exactly once: ${SECTION_IDS.join(", ")}.`} />;
    case "login.visual":
      return <><Toggle label="Visual visibility" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Kicker" value={text("kicker")} onChange={(v) => setField("kicker", v)} /><Input label="Headline" value={text("headline")} onChange={(v) => setField("headline", v)} multiline /><Input label="Description" value={text("description")} onChange={(v) => setField("description", v)} multiline />{mediaButton("desktopMediaId", "Desktop media")}{mediaButton("mobileMediaId", "Mobile media")}<Input label="Image focus" type="number" value={String(number("focus"))} onChange={(v) => setField("focus", Number(v))} helper="0–100" /><Input label="Overlay" type="number" value={String(number("overlay", 55))} onChange={(v) => setField("overlay", Number(v))} helper="0–100" /></>;
    case "auth.login":
      return <><Input label="Eyebrow" value={text("eyebrow")} onChange={(v) => setField("eyebrow", v)} /><Input label="Heading" value={text("heading")} onChange={(v) => setField("heading", v)} multiline /><Input label="Description" value={text("description")} onChange={(v) => setField("description", v)} multiline /><p className="uss-member-note">This editor cannot change verification, session, callback or activation rules.</p></>;
    case "auth.register":
      return <><Toggle label="Registration presentation" checked={bool("enabled")} onChange={(v) => setField("enabled", v)} /><Input label="Eyebrow" value={text("eyebrow")} onChange={(v) => setField("eyebrow", v)} /><Input label="Headline" value={text("headline")} onChange={(v) => setField("headline", v)} multiline /><Input label="Description" value={text("description")} onChange={(v) => setField("description", v)} multiline /><Input label="Form kicker" value={text("formKicker")} onChange={(v) => setField("formKicker", v)} /><Input label="Form description" value={text("formDescription")} onChange={(v) => setField("formDescription", v)} multiline />{mediaButton("backgroundMediaId", "Background media")}<p className="uss-member-note">Account lifecycle and provider behavior remain backend-owned.</p></>;
    case "footer.global":
      return <><Input label="Tagline" value={text("tagline")} onChange={(v) => setField("tagline", v)} /><Input label="Newsletter kicker" value={text("newsletterKicker")} onChange={(v) => setField("newsletterKicker", v)} /><Input label="Newsletter title" value={text("newsletterTitle")} onChange={(v) => setField("newsletterTitle", v)} /><Input label="Newsletter description" value={text("newsletterDescription")} onChange={(v) => setField("newsletterDescription", v)} multiline /><Input label="Copyright" value={text("copyright")} onChange={(v) => setField("copyright", v)} /><Input label="Instagram" type="url" value={text("instagram")} onChange={(v) => setField("instagram", v)} helper="HTTPS URL only." /><Input label="Strava" type="url" value={text("strava")} onChange={(v) => setField("strava", v)} helper="HTTPS URL only." /><Input label="Contact email" type="email" value={text("contactEmail")} onChange={(v) => setField("contactEmail", v)} /></>;
  }
}

function EditorCard({ item }: { item: Item }) {
  const [slot, setSlot] = useState<ManagedSlot | null>(item.slot);
  const [payload, setPayload] = useState<Payload>(() => asPayload(clonePayload((item.slot?.payload ?? item.fallback) as SlotPayloads[SiteKey])));
  const [notice, setNotice] = useState<Notice>(null);
  const [preview, setPreview] = useState(false);
  const [pickerField, setPickerField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = useMemo(() => JSON.stringify(payload) !== JSON.stringify(asPayload(slot?.payload ?? item.fallback)), [payload, slot, item.fallback]);
  const setField = (name: string, value: unknown) => { setPayload((current) => ({ ...current, [name]: value })); setNotice(null); };
  const applyResult = (result: Awaited<ReturnType<typeof updateSiteContentDraft>>) => {
    if (!result.ok) { setNotice({ kind: "error", text: siteContentMessage(result.code) }); return; }
    setSlot(result.data);
    setPayload(asPayload(clonePayload(result.data.payload as SlotPayloads[SiteKey])));
    setNotice({ kind: "success", text: "Draft saved." });
  };
  const save = () => startTransition(async () => {
    const result = slot
      ? await updateSiteContentDraft({ key: item.key, expectedVersion: slot.version, payload })
      : await createSiteContentDraft({ key: item.key, payload });
    applyResult(result);
  });
  const lifecycle = (operation: "publish" | "unpublish" | "archive") => {
    if (!slot || dirty) { setNotice({ kind: "error", text: dirty ? "Save the draft before changing its lifecycle." : "Create the draft first." }); return; }
    startTransition(async () => {
      const action = operation === "publish" ? publishSiteContent : operation === "unpublish" ? unpublishSiteContent : archiveSiteContent;
      const result = await action({ key: item.key, expectedVersion: slot.version });
      if (!result.ok) { setNotice({ kind: "error", text: siteContentMessage(result.code) }); return; }
      setSlot(result.data);
      setPayload(asPayload(clonePayload(result.data.payload as SlotPayloads[SiteKey])));
      setNotice({ kind: "success", text: operation === "publish" ? "Published to the website." : operation === "unpublish" ? "Unpublished. Public presentation now uses the approved fallback." : "Archived." });
    });
  };
  const selectMedia = (asset: MediaAsset) => { if (pickerField) setField(pickerField, asset.id); };

  return (
    <article className="uss-member-panel" style={{ overflow: "hidden" }}>
      <div className="uss-story-toolbar">
        <div><p className="uss-member-kicker">{item.key}</p><h2>{item.label.title}</h2><p>{item.label.description}</p></div>
        <div><strong>{slot?.status ?? "not created"}</strong>{slot?.hasUnpublishedChanges ? <p>Unpublished changes</p> : null}</div>
      </div>
      <div className="uss-form-grid">
        <SlotFields slotKey={item.key} payload={payload} setField={setField} openPicker={setPickerField} />
      </div>
      {notice ? <div className="uss-story-notice" role={notice.kind === "error" ? "alert" : "status"}><p>{notice.text}</p></div> : <div style={{ minHeight: 24 }} aria-hidden="true" />}
      {preview ? <div className="uss-member-panel"><p className="uss-member-kicker">DRAFT PREVIEW DATA</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(payload, null, 2)}</pre><small>Preview shows the exact typed draft payload. Publishing is a separate action.</small></div> : null}
      <div className="uss-member-quick">
        <Button loading={pending} loadingLabel="Saving…" onClick={save} disabled={!dirty && Boolean(slot)}>Save draft</Button>
        <Button variant="secondary" onClick={() => setPreview((value) => !value)}>{preview ? "Hide preview" : "Preview draft"}</Button>
        <Button variant="secondary" loading={pending} onClick={() => lifecycle("publish")} disabled={!slot || dirty}>Publish</Button>
        {slot?.status === "published" ? <Button variant="ghost" loading={pending} onClick={() => lifecycle("unpublish")} disabled={dirty}>Unpublish</Button> : null}
        {slot && slot.status !== "archived" ? <Button variant="danger" loading={pending} onClick={() => lifecycle("archive")} disabled={dirty}>Archive</Button> : null}
      </div>
      <MediaAssetPicker open={Boolean(pickerField)} onClose={() => setPickerField(null)} onSelect={selectMedia} selectedId={pickerField && typeof payload[pickerField] === "string" ? String(payload[pickerField]) : null} title="Select website media" />
    </article>
  );
}

export function SiteContentEditor({ items }: { items: Item[] }) {
  return <div style={{ display: "grid", gap: "24px", minWidth: 0 }}>{items.map((item) => <EditorCard key={item.key} item={item} />)}</div>;
}
