"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Checkbox, EmptyState, Field, Input, LinkButton, Modal } from "@/components/ui";
import type { StoryByline, StoryCategory, StoryTag, TaxonomyKind, TaxonomyLists, TaxonomyRecord } from "@/lib/stories/story-taxonomy-types";
import { TAXONOMY_LIMITS } from "@/lib/stories/story-taxonomy-types";
import { createEditorTaxonomy, deleteEditorTaxonomy, updateEditorTaxonomy } from "./api/actions";
import { storyHref, storyMessage } from "./model";

const backend = { createEditorTaxonomy, updateEditorTaxonomy, deleteEditorTaxonomy };
type Ops = typeof backend;
const COPY: Record<TaxonomyKind, { title: string; one: string; hint: string; list: keyof TaxonomyLists }> = {
  category: { title: "CATEGORIES.", one: "category", hint: "Shown on Stories and used by the public category filter. Deactivate to hide without deleting.", list: "categories" },
  tag: { title: "TAGS.", one: "tag", hint: "Lightweight labels shown at the end of a Story.", list: "tags" },
  byline: { title: "BYLINES.", one: "byline", hint: "Author names shown publicly. A byline is an editorial label, not an account.", list: "bylines" },
};
type Form = { id: string | null; version: number; name: string; slug: string; description: string; roleTitle: string; sortOrder: string; isActive: boolean };
const blank = (): Form => ({ id: null, version: 0, name: "", slug: "", description: "", roleTitle: "", sortOrder: "0", isActive: true });
function toForm(r: TaxonomyRecord): Form {
  return { id: r.id, version: r.version, name: r.name, slug: r.slug, description: (r as StoryCategory).description ?? "", roleTitle: (r as StoryByline).roleTitle ?? "", sortOrder: String((r as StoryCategory).sortOrder ?? 0), isActive: (r as StoryCategory).isActive ?? true };
}

function Section({ kind, items, ops, onChanged }: { kind: TaxonomyKind; items: TaxonomyRecord[]; ops: Ops; onChanged: (kind: TaxonomyKind, next: TaxonomyRecord[]) => void }) {
  const copy = COPY[kind];
  const [form, setForm] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<TaxonomyRecord | null>(null);
  const [message, setMessage] = useState<{ tone: "status" | "alert"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const max = kind === "byline" ? TAXONOMY_LIMITS.bylineName : TAXONOMY_LIMITS.name;
  const nameError = form && (!form.name.trim() ? `Add a ${copy.one} name.` : form.name.length > max || /[<>]/.test(form.name) ? `Use up to ${max} plain-text characters.` : "");
  const slugError = form && form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) ? "Use lowercase letters, numbers and single hyphens." : "";
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || lock.current || nameError || slugError) return;
    lock.current = true; setBusy(true); setMessage(null);
    const fields: Record<string, unknown> = { name: form.name, ...(form.slug ? { slug: form.slug } : {}) };
    if (kind === "category") Object.assign(fields, { description: form.description || null, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive });
    if (kind === "byline") Object.assign(fields, { roleTitle: form.roleTitle || null, isActive: form.isActive });
    try {
      const r = form.id ? await ops.updateEditorTaxonomy({ kind, id: form.id, expectedVersion: form.version, changes: fields }) : await ops.createEditorTaxonomy({ kind, fields });
      if (!r.ok) { setMessage({ tone: "alert", text: storyMessage(r.code) }); return; }
      onChanged(kind, form.id ? items.map((i) => (i.id === r.data.id ? r.data : i)) : [...items, r.data]);
      setMessage({ tone: "status", text: `${copy.one[0].toUpperCase() + copy.one.slice(1)} “${r.data.name}” ${form.id ? "saved" : "created"}.` });
      setForm(null);
    } catch { setMessage({ tone: "alert", text: storyMessage("STORY_UNAVAILABLE") }); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!confirm || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const r = await ops.deleteEditorTaxonomy({ kind, id: confirm.id, expectedVersion: confirm.version });
      if (!r.ok) { setMessage({ tone: "alert", text: storyMessage(r.code) }); setConfirm(null); return; }
      onChanged(kind, items.filter((i) => i.id !== confirm.id)); setMessage({ tone: "status", text: `“${confirm.name}” deleted.` }); setConfirm(null);
    } catch { setMessage({ tone: "alert", text: storyMessage("STORY_UNAVAILABLE") }); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section className="uss-taxonomy-section" aria-labelledby={`tax-${kind}`}>
    <div className="uss-taxonomy-head"><div><h2 id={`tax-${kind}`}>{copy.title}</h2><p className="uss-field-hint">{copy.hint}</p></div><Button variant="secondary" onClick={() => { setForm(blank()); setMessage(null); }} disabled={busy}>New {copy.one}</Button></div>
    {message && <p className="uss-story-notice" role={message.tone}>{message.text}</p>}
    {form && <form className="uss-taxonomy-form" onSubmit={submit} noValidate aria-label={`${form.id ? "Edit" : "New"} ${copy.one}`}>
      <div className="uss-story-fields-two">
        <Field label="Name" required error={nameError || undefined}><Input value={form.name} maxLength={max + 1} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={busy} /></Field>
        <Field label="URL slug" hint={form.id ? "Changing it changes public filter links." : "Leave blank to derive from the name."} error={slugError || undefined}><Input value={form.slug} maxLength={TAXONOMY_LIMITS.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })} disabled={busy} /></Field>
      </div>
      {kind === "category" && <><Field label="Description" hint="Optional internal/editorial note."><Input value={form.description} maxLength={TAXONOMY_LIMITS.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={busy} /></Field>
        <div className="uss-story-fields-two"><Field label="Sort order" hint="Lower numbers appear first."><Input type="number" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} disabled={busy} /></Field><Checkbox label="Active" hint="Inactive categories are hidden publicly and cannot be newly assigned." checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} disabled={busy} /></div></>}
      {kind === "byline" && <div className="uss-story-fields-two"><Field label="Role or title" hint="Optional, e.g. Editor, Contributor."><Input value={form.roleTitle} maxLength={TAXONOMY_LIMITS.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} disabled={busy} /></Field><Checkbox label="Active" hint="Inactive bylines cannot be newly assigned." checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} disabled={busy} /></div>}
      <div className="uss-story-actions"><Button type="submit" loading={busy} loadingLabel="Saving…">{form.id ? "Save" : `Create ${copy.one}`}</Button><Button variant="text" onClick={() => setForm(null)} disabled={busy}>Cancel</Button></div>
    </form>}
    {items.length === 0 ? <EmptyState title={`No ${copy.list} yet.`} description={`Create the first ${copy.one} to use it on Stories.`} /> : <ul className="uss-taxonomy-list">
      {items.map((item) => <li key={item.id} className="uss-taxonomy-row">
        <div className="uss-taxonomy-copy"><strong>{item.name}</strong><span className="uss-story-slug">/{item.slug}</span>{(item as StoryByline).roleTitle && <span className="uss-story-slug">{(item as StoryByline).roleTitle}</span>}</div>
        <div className="uss-taxonomy-meta">{"isActive" in item && !item.isActive && <Badge>inactive</Badge>}<span>{item.usageCount} {item.usageCount === 1 ? "Story" : "Stories"}</span></div>
        <div className="uss-story-actions"><Button variant="secondary" onClick={() => { setForm(toForm(item)); setMessage(null); }} disabled={busy} aria-label={`Edit ${copy.one} ${item.name}`}>Edit</Button>
          <Button variant="text" onClick={() => setConfirm(item)} disabled={busy || item.usageCount > 0} aria-label={`Delete ${copy.one} ${item.name}`} title={item.usageCount > 0 ? "Still used by Stories" : undefined}>Delete</Button></div>
        {item.usageCount > 0 && <p className="uss-field-hint uss-taxonomy-inuse">In use — reassign those Stories{"isActive" in item ? " or deactivate it" : ""} before deleting.</p>}
      </li>)}
    </ul>}
    <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={`Delete this ${copy.one}?`} description={`“${confirm?.name ?? ""}” will be removed permanently. This is recorded in the audit history.`} actions={<><Button variant="secondary" onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={() => void remove()}>Delete {copy.one}</Button></>} />
  </section>;
}

export function TaxonomyManager({ initial, operations }: { initial: TaxonomyLists & { truncated: boolean }; operations?: Partial<Ops> }) {
  const router = useRouter();
  const ops = { ...backend, ...operations };
  const [lists, setLists] = useState<TaxonomyLists>(initial);
  const changed = (kind: TaxonomyKind, next: TaxonomyRecord[]) => { setLists((l) => ({ ...l, [COPY[kind].list]: next as StoryCategory[] & StoryTag[] & StoryByline[] })); router.refresh(); };
  return <div className="uss-taxonomy">
    <div className="uss-story-editor-header"><div><p className="uss-member-kicker">USS CMS / STORIES / TAXONOMY</p><h1>CATEGORIES &amp; TAGS.</h1><p>Organise Stories. Every change is audited; anything still used by a Story cannot be deleted.</p></div><LinkButton href={storyHref()} variant="secondary">All Stories ↗</LinkButton></div>
    {initial.truncated && <p className="uss-story-notice">Lists are bounded to {TAXONOMY_LIMITS.list} items each.</p>}
    {(["category", "tag", "byline"] as const).map((kind) => <Section key={kind} kind={kind} items={lists[COPY[kind].list] as TaxonomyRecord[]} ops={ops} onChanged={changed} />)}
  </div>;
}
