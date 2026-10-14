import type { EventContent, EventDTO } from "@/lib/events/event-types";
import { EVENT_TRANSITIONS, PUBLIC_EVENT_STATES } from "@/lib/events/event-policy";
export { EVENT_STATUSES, EVENT_POLICY } from "@/lib/events/event-policy";
export type EventDraft = Omit<EventContent, "description" | "capacity"> & { body: string; capacity: string };
export const transitionLabels = { draft: "Return to draft", published: "Publish", registration_open: "Open registration", registration_closed: "Close registration", completed: "Complete Event", cancelled: "Cancel Event", archived: "Archive Event" } as const;
export function eventHref(values: Record<string, string> = {}) { return `/admin?${new URLSearchParams({ module: "events", ...values })}`; }
export function eventDraft(event: EventDTO | null): EventDraft {
  return { slug: event?.slug ?? "", title: event?.title ?? "", summary: event?.summary ?? null, body: event?.description?.paragraphs.join("\n\n") ?? "", eventType: event?.eventType ?? null, startsAt: event?.startsAt ?? "", endsAt: event?.endsAt ?? null, timezone: event?.timezone ?? "Asia/Jakarta", venueName: event?.venueName ?? null, locationText: event?.locationText ?? null, mapUrl: event?.mapUrl ?? null, registrationOpensAt: event?.registrationOpensAt ?? null, registrationClosesAt: event?.registrationClosesAt ?? null, capacity: event?.capacity?.toString() ?? "", waitlistEnabled: event?.waitlistEnabled ?? false, visibility: event?.visibility ?? "private", coverMediaId: event?.coverMediaId ?? null };
}
export function eventContent(draft: EventDraft): EventContent {
  const { body, capacity, ...value } = draft;
  return { ...value, title: value.title.trim(), summary: value.summary?.trim() || null, description: body.trim() ? { paragraphs: body.trim().split(/\n\s*\n/).map(p => p.trim()) } : null, capacity: capacity.trim() ? Number(capacity) : null };
}
export function eventChanges(before: EventDraft, after: EventDraft): Partial<Omit<EventContent, "slug">> {
  const old = eventContent(before), next = eventContent(after), changes: Partial<Omit<EventContent, "slug">> = {};
  for (const key of Object.keys(next) as (keyof EventContent)[]) if (key !== "slug" && JSON.stringify(old[key]) !== JSON.stringify(next[key])) (changes as Record<string, unknown>)[key] = next[key];
  return changes;
}
export function validInstant(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return year >= 1900 && new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === value.slice(0, 10);
}
export function validateEvent(draft: EventDraft, creating: boolean) {
  const errors: Record<string, string> = {};
  const plain = (key: keyof EventDraft, max: number, required = false) => { const value = String(draft[key] ?? "").trim(); if ((required && !value) || value.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) errors[key] = `Use ${required ? "required " : ""}plain text, up to ${max} characters.`; };
  plain("title", 200, true); plain("summary", 1000); plain("venueName", 200); plain("locationText", 500);
  if (creating && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) || draft.slug.length > 120)) errors.slug = "Choose a URL slug using lowercase letters, numbers and hyphens. The server checks uniqueness.";
  if (draft.eventType && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.eventType) || draft.eventType.length > 80)) errors.eventType = "Use an event type code with lowercase letters, numbers and hyphens.";
  try { new Intl.DateTimeFormat("en", { timeZone: draft.timezone }).format(); } catch { errors.timezone = "Use a valid IANA timezone, such as Asia/Jakarta."; }
  for (const key of ["startsAt", "endsAt", "registrationOpensAt", "registrationClosesAt"] as const) if ((key === "startsAt" || draft[key]) && !validInstant(draft[key] || "")) errors[key] = "Use a full date and time with seconds and Z or an explicit offset, such as +07:00.";
  if (!errors.startsAt && !errors.endsAt && draft.endsAt && Date.parse(draft.endsAt) < Date.parse(draft.startsAt)) errors.endsAt = "End must be at or after the start.";
  if (!errors.registrationOpensAt && !errors.registrationClosesAt && draft.registrationOpensAt && draft.registrationClosesAt && Date.parse(draft.registrationClosesAt) < Date.parse(draft.registrationOpensAt)) errors.registrationClosesAt = "Registration close must be at or after registration open.";
  if (draft.capacity && (!/^\d+$/.test(draft.capacity) || Number(draft.capacity) < 1 || Number(draft.capacity) > 2147483647)) errors.capacity = "Use a whole number from 1 to 2147483647, or leave blank.";
  if (draft.mapUrl) { try { const url = new URL(draft.mapUrl); if (url.protocol !== "https:" || url.username || url.password) throw new Error(); } catch { errors.mapUrl = "Use a secure HTTPS link without embedded credentials."; } }
  const paragraphs = eventContent(draft).description?.paragraphs ?? [];
  if (paragraphs.length > 30 || paragraphs.some(p => p.length > 2000 || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(p))) errors.body = "Use up to 30 plain-text paragraphs, each no longer than 2000 characters.";
  if (new TextEncoder().encode(JSON.stringify(eventContent(draft))).length > 32768) errors.body = "Event content exceeds the 32 KiB request limit. Shorten the description.";
  return errors;
}
export function eventTime(value: string | null, timezone: string) { if (!value || !validInstant(value)) return "Not configured"; try { return `${new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value))} · ${timezone}`; } catch { return "Check timezone"; } }
export function publicEventLink(event: EventDTO) { return event.visibility === "public" && PUBLIC_EVENT_STATES.includes(event.status) ? `/runs/${encodeURIComponent(event.slug)}` : null; }
export function allowedTransitions(event: EventDTO) { return EVENT_TRANSITIONS[event.status]; }
export function eventMessage(code: string) {
  const messages: Record<string, string> = { EVENT_NOT_FOUND: "This Event could not be found.", EVENT_CONFLICT: "This Event changed since you opened it. Reload the latest version and review before saving again.", EVENT_SLUG_CONFLICT: "That URL slug is already in use. Choose another slug.", EVENT_INVALID_TRANSITION: "This lifecycle change is no longer allowed. Reload the latest Event.", EVENT_VALIDATION_ERROR: "The Event details were rejected. Review the dates, capacity and content before saving.", EVENT_MEDIA_NOT_FOUND: "The selected cover is unavailable or inactive. Choose another media asset.", EVENT_CAPACITY_CONFLICT: "Capacity cannot be reduced below confirmed registrations or attendance. Keep the current capacity or choose a larger value.", INSUFFICIENT_PERMISSION: "You do not have permission to manage Events.", UNAUTHENTICATED: "Sign in with an authorized staff account to manage Events.", ACCOUNT_SUSPENDED: "Your account is suspended. Event management is unavailable.", ACCOUNT_DEACTIVATED: "This account is no longer active.", EMAIL_NOT_VERIFIED: "Verify your email before accessing Event management.", ACCOUNT_NOT_PROVISIONED: "Your account is not ready for Event management.", EVENT_UNAVAILABLE: "We couldn't reach the Event service. Your unsaved work is still here. Try again." };
  return messages[code] ?? "Event management is unavailable. Your unsaved work is still here.";
}
