"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Checkbox, Field, FormActions, FormSection, Input, LinkButton, Modal, Select, Textarea } from "@/components/ui";
import { useMemberDirty, useMemberLeave } from "@/components/dashboard/MemberNavigationGuard";
import { MediaAssetPicker } from "@/features/media/components/MediaAssetPicker";
import { listPickerMedia } from "@/features/media/api/actions";
import type { MediaAsset } from "@/lib/media/media-types";
import { checkInHref } from "@/features/check-in/model";
import type { EventDTO } from "@/lib/events/event-types";
import { createEditorEvent, readEditorEvent, readEventCover, transitionEditorEvent, updateEditorEvent } from "./api/actions";
import { allowedTransitions, eventChanges, eventContent, eventDraft, eventHref, eventMessage, eventTime, publicEventLink, transitionLabels, validateEvent, type EventDraft } from "./model";
const actions = { createEditorEvent, readEditorEvent, readEventCover, transitionEditorEvent, updateEditorEvent, listPickerMedia };
type Phase = "idle" | "submitting" | "success" | "error" | "conflict";
export function EventEditor({ initial, initialCover, coverUnavailable = false, startPreview = false, operations }: { initial: EventDTO | null; initialCover: MediaAsset | null; coverUnavailable?: boolean; startPreview?: boolean; operations?: Partial<typeof actions> }) {
  const router = useRouter(), setDirty = useMemberDirty(), leave = useMemberLeave(), lock = useRef(false);
  const api = { ...actions, ...operations };
  const [event, setEvent] = useState(initial), [draft, setDraft] = useState(() => eventDraft(initial)), [baseline, setBaseline] = useState(() => eventDraft(initial));
  const [cover, setCover] = useState(initialCover), [coverError, setCoverError] = useState(coverUnavailable);
  const [phase, setPhase] = useState<Phase>("idle"), [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({}), [picker, setPicker] = useState(false), [preview, setPreview] = useState(startPreview);
  const [transition, setTransition] = useState<EventDTO["status"] | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline), busy = phase === "submitting";
  useEffect(() => { setDirty(dirty); return () => setDirty(false); }, [dirty, setDirty]);
  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) { setDraft(old => ({ ...old, [key]: value })); setErrors(old => ({ ...old, [key]: "" })); setNotice(""); setPhase("idle"); }
  function failed(code: string) { setNotice(eventMessage(code)); setPhase(code === "EVENT_CONFLICT" ? "conflict" : "error"); if (code === "EVENT_SLUG_CONFLICT") setErrors({ slug: eventMessage(code) }); if (code === "EVENT_CAPACITY_CONFLICT") setErrors({ capacity: eventMessage(code) }); }
  function adopt(next: EventDTO) { setEvent(next); setDraft(eventDraft(next)); setBaseline(eventDraft(next)); setDirty(false); router.refresh(); }
  async function save(e: FormEvent) {
    e.preventDefault(); if (lock.current) return;
    const validation = validateEvent(draft, !event); setErrors(validation);
    if (Object.keys(validation).length) { const form = e.currentTarget; setPhase("error"); setNotice("Review the highlighted Event details."); requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()); return; }
    lock.current = true; setPhase("submitting"); setNotice("");
    try {
      const result = event ? await api.updateEditorEvent({ id: event.id, expectedVersion: event.version, changes: eventChanges(baseline, draft) }) : await api.createEditorEvent(eventContent(draft));
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); setNotice(event ? "Event changes saved." : "Draft Event created."); setPhase("success");
      if (!event) router.replace(eventHref({ view: "edit", id: result.data.id }));
    } catch { failed("EVENT_UNAVAILABLE"); } finally { lock.current = false; }
  }
  async function reload() {
    if (!event || lock.current) return;
    lock.current = true; setPhase("submitting");
    try { const result = await api.readEditorEvent(event.id); if (!result.ok) { failed(result.code); return; }
      const media = result.data.coverMediaId ? await api.readEventCover(result.data.coverMediaId) : null;
      setCover(media?.ok ? media.data : null); setCoverError(Boolean(media && !media.ok)); adopt(result.data); setNotice("Latest Event loaded. Review before saving again."); setPhase("success");
    } catch { failed("EVENT_UNAVAILABLE"); } finally { lock.current = false; }
  }
  async function changeLifecycle() {
    if (!event || !transition || lock.current || dirty) return;
    lock.current = true; setPhase("submitting"); setNotice("");
    try { const result = await api.transitionEditorEvent({ id: event.id, expectedVersion: event.version, status: transition });
      if (!result.ok) { failed(result.code); return; }
      adopt(result.data); setTransition(null); setNotice(`Event is now ${result.data.status.replaceAll("_", " ")}.`); setPhase("success");
    } catch { failed("EVENT_UNAVAILABLE"); } finally { lock.current = false; }
  }
  const field = (key: keyof EventDraft, label: string, hint: string, required = false, maxLength?: number) => <Field key={key} label={label} hint={hint} required={required} error={errors[key]}><Input value={String(draft[key] ?? "")} disabled={busy} maxLength={maxLength} placeholder={key.endsWith("At") ? "2026-11-08T06:00:00+07:00" : undefined} onChange={e => set(key, (e.target.value || (required ? "" : null)) as EventDraft[typeof key])} /></Field>;
  const timeSummary = <dl className="uss-event-times">{([ ["startsAt", "Start"], ["endsAt", "End"], ["registrationOpensAt", "Registration opens"], ["registrationClosesAt", "Registration closes"] ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{eventTime(draft[key], draft.timezone)}</dd></div>)}</dl>;
  const coverPreview = cover?.deliveryAvailable && cover.url ? <img src={cover.url} alt={cover.altText || "Event cover"} /> : <div className="uss-event-media-empty">{draft.coverMediaId ? "Cover delivery unavailable" : "No cover selected"}</div>;
  if (preview) return <section className="uss-event-preview" aria-label="Private Event preview"><div className="uss-event-actions"><p className="uss-member-kicker">PREVIEW / PRIVATE WORKSPACE</p><Button variant="secondary" onClick={() => setPreview(false)}>Back to editor</Button></div><div className="uss-event-cover">{coverPreview}</div><p>{draft.visibility} · {event?.status ?? "unsaved draft"}</p><h1>{draft.title || "Untitled Event"}</h1><p>{draft.summary}</p>{timeSummary}<p>{draft.venueName} {draft.locationText}</p>{eventContent(draft).description?.paragraphs.map((p, index) => <p key={index}>{p}</p>)}<p className="uss-event-muted">This managed preview does not publish the Event or grant registration eligibility.</p></section>;
  return <div className="uss-event-editor">
    <div className="uss-event-heading"><div><p className="uss-member-kicker">USS CMS / EVENTS / {event ? "MANAGE" : "NEW DRAFT"}</p><h1>{event ? "MANAGE EVENT." : "NEW EVENT."}</h1><p>Set the route, timing and publication state before the crew takes the start.</p></div><LinkButton href={eventHref()} variant="secondary">All Events ↗</LinkButton></div>
    {event && <div className="uss-event-status-line"><Badge tone={event.status === "cancelled" ? "error" : event.status === "draft" ? "info" : "success"}>{event.status.replaceAll("_", " ")}</Badge><span>{event.visibility}</span><span>/runs/{event.slug}</span></div>}
    <div className="uss-event-feedback" role={phase === "error" || phase === "conflict" ? "alert" : "status"}>{busy ? "Saving…" : notice}{phase === "conflict" && <Button variant="secondary" onClick={() => leave(() => void reload())}>Reload latest Event</Button>}</div>
    <div className="uss-event-editor-grid"><form onSubmit={save} noValidate>
      <FormSection title="EVENT IDENTITY" description="Public editorial information. Saving does not change the lifecycle.">
        {field("title", "Event title", "Public name of this run or Event.", true, 201)}
        {event ? <Field label="Public URL slug" hint="Server-owned and stable. Ordinary edits cannot change this URL."><Input value={event.slug} readOnly /></Field> : field("slug", "Public URL slug", "Choose once, such as city-morning-run. The server normalizes and checks uniqueness; title edits do not generate it.", true, 121)}
        {field("eventType", "Event type code", "Optional managed code, such as community-run. No fixed type taxonomy exists.", false, 81)}
        {field("summary", "Summary", "Short description shown with the Event.", false, 1001)}
        <Field label="Event description" hint="Plain-text paragraphs separated by a blank line. HTML is never interpreted." error={errors.body}><Textarea className="resize-none" rows={8} value={draft.body} onChange={e => set("body", e.target.value)} disabled={busy} /></Field>
        <Field label="Visibility" hint="Public can appear on /runs. Members-only and private Events stay outside public reads."><Select value={draft.visibility} onChange={e => set("visibility", e.target.value as EventDraft["visibility"])} disabled={busy}><option value="public">Public</option><option value="members_only">Members only</option><option value="private">Private</option></Select></Field>
      </FormSection>
      <FormSection title="EVENT TIMING" description="Enter absolute timestamps with explicit offsets. The summary below shows the same instants in the Event timezone.">
        {field("timezone", "Event timezone", "IANA timezone used for display, for example Asia/Jakarta. Changing it never changes an entered instant.", true, 80)}
        <div className="uss-event-field-grid">{field("startsAt", "Start date and time", "Include seconds and an explicit offset: YYYY-MM-DDTHH:mm:ss+07:00.", true)}{field("endsAt", "End date and time", "Optional absolute timestamp; must be at or after the start.")}</div>
        {timeSummary}
      </FormSection>
      <FormSection title="REGISTRATION CONFIGURATION" description="Configure registration limits and timing. These settings do not show available places.">
        <div className="uss-event-field-grid">{field("registrationOpensAt", "Registration open", "Members cannot register before this configured instant.")}{field("registrationClosesAt", "Registration close", "Members cannot register after this configured instant.")}</div>
        <Field label="Capacity" hint="Maximum confirmed participants. Leave blank for no configured cap; remaining places are not calculated here." error={errors.capacity}><Input inputMode="numeric" value={draft.capacity} onChange={e => set("capacity", e.target.value)} disabled={busy} /></Field>
        <Checkbox label="Enable waitlist" hint="Eligible runners may join the waitlist when confirmed places are filled." checked={draft.waitlistEnabled} onChange={e => set("waitlistEnabled", e.target.checked)} disabled={busy} />
      </FormSection>
      <FormSection title="LOCATION" description="Public meeting details for runners.">{field("venueName", "Venue name", "Name of the meeting point.", false, 201)}{field("locationText", "Location details", "Address, city or directions to the meeting point.", false, 501)}{field("mapUrl", "Map link", "Optional secure HTTPS link to the meeting point on a map.", false, 2048)}</FormSection>
      <FormSection title="COVER MEDIA" description="Choose an existing media asset; this workspace does not upload files."><div className="uss-event-cover">{coverPreview}</div>{coverError && <p role="status">Cover metadata could not be loaded. The existing reference is preserved.</p>}<div className="uss-event-actions"><Button variant="secondary" disabled={busy} onClick={() => setPicker(true)}>Select cover</Button>{draft.coverMediaId && <Button variant="text" disabled={busy} onClick={() => { set("coverMediaId", null); setCover(null); setCoverError(false); }}>Remove cover</Button>}</div></FormSection>
      <FormActions cancel={<Button variant="text" onClick={() => setPreview(true)}>Preview Event ↗</Button>}><Button type="submit" loading={busy} loadingLabel={event ? "Saving…" : "Creating draft…"} disabled={!!event && !dirty}>{event ? "Save changes" : "Create draft"}</Button></FormActions>
    </form><aside className="uss-event-rail"><h2>LIFECYCLE.</h2><p>Save changes before changing status. Each transition is checked when you confirm.</p>{event ? <><h3>{event.status.replaceAll("_", " ")}</h3><div className="uss-event-lifecycle">{allowedTransitions(event).map(status => <Button key={status} variant={status === "cancelled" || status === "archived" ? "danger" : "secondary"} disabled={busy || dirty} onClick={() => { setNotice(""); setPhase("idle"); setTransition(status); }}>{transitionLabels[status]}</Button>)}</div>{publicEventLink(event) && <LinkButton href={publicEventLink(event)!} variant="text">View public Event ↗</LinkButton>}<LinkButton href={checkInHref(event.id)} variant="text">Open scanner workspace ↗</LinkButton><p className="uss-event-muted">Scanner access and the check-in window are validated separately. Member registration and passes remain in MY USS.</p></> : <p>Create a draft to enable lifecycle actions.</p>}<h3>TIMING SUMMARY.</h3>{timeSummary}<p className="uss-event-muted">No attendee data, remaining-capacity estimate or pass issuance is part of this workspace.</p></aside></div>
    <MediaAssetPicker open={picker} onClose={() => setPicker(false)} selectedId={draft.coverMediaId} loadMedia={api.listPickerMedia} onSelect={asset => { set("coverMediaId", asset.id); setCover(asset); setCoverError(false); }} />
    <Modal open={transition !== null} onClose={() => { if (!busy) setTransition(null); }} title={transition ? `${transitionLabels[transition]}?` : "Change lifecycle?"} description={transition === "cancelled" ? "Mark this Event cancelled. It is no longer eligible for new registrations. Existing registrations and pass rules remain backend-owned." : transition === "archived" ? "Remove this Event from public discovery. Its records remain retained." : transition === "completed" ? "Mark the Event completed. This does not create attendance or check-in records." : `Change Event status to ${transition?.replaceAll("_", " ")}. Timing and eligibility remain backend-owned.`} actions={<><Button variant="secondary" disabled={busy} onClick={() => setTransition(null)}>Cancel</Button><Button loading={busy} variant={transition === "cancelled" || transition === "archived" ? "danger" : "primary"} onClick={() => void changeLifecycle()}>{transition ? transitionLabels[transition] : "Confirm"}</Button></>}>{transition !== null && (phase === "error" || phase === "conflict") && <p role="alert">{notice}</p>}{timeSummary}</Modal>
  </div>;
}
