"use client";
import { useRef, useState } from "react";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import type { CreateEventInput, EventDTO } from "@/lib/events/event-types";
import type { MediaAsset } from "@/lib/media/media-types";
import { EventEditor } from "./EventEditor";
import { EventList } from "./EventList";
const id = "66666666-6666-4666-8666-666666666666";
const media: MediaAsset = { id: "77777777-7777-4777-8777-777777777777", url: "/uss-logo.png", deliveryAvailable: true, mimeType: "image/png", sizeBytes: 1000, width: 800, height: 600, altText: "Fictional USS Event cover", caption: null, status: "active", visibility: "public", version: 1, createdAt: "2026-10-13T00:00:00Z", updatedAt: "2026-10-13T00:00:00Z" };
const base: EventDTO = { id, slug: "fictional-city-run", title: "THE CITY TAKES THE START.", summary: "Fictional Event for development review only.", description: { paragraphs: ["A fictional meeting point for the crew.", "Plain text, never markup."] }, eventType: "community-run", startsAt: "2026-11-08T06:00:00+07:00", endsAt: "2026-11-08T08:00:00+07:00", registrationOpensAt: "2026-10-15T09:00:00+07:00", registrationClosesAt: "2026-11-07T18:00:00+07:00", timezone: "Asia/Jakarta", venueName: "Fictional city meeting point", locationText: "A long fictional meeting address for responsive review", mapUrl: null, capacity: 100, waitlistEnabled: true, visibility: "public", status: "draft", coverMediaId: media.id, version: "a".repeat(64) };
/** Fictional development-only data. No real sessions, registration/pass/check-in writes or media storage. */
export default function EventReference({ scenario, view }: { scenario: string; view?: string }) {
  const [event, setEvent] = useState<EventDTO>({ ...base, ...(scenario === "private" ? { visibility: "private" as const } : {}), ...(scenario === "members-only" ? { visibility: "members_only" as const } : {}), ...(["published", "registration_open", "registration_closed", "completed", "cancelled", "archived"].includes(scenario) ? { status: scenario as EventDTO["status"] } : {}) });
  const [requests, setRequests] = useState(0), current = useRef(event);
  if (process.env.NODE_ENV !== "development") return null;
  const snapshot = { displayName: "Fictional editor", roles: ["admin" as const], permissions: ROLE_PERMISSIONS.admin };
  const unavailable = { ...media, id: "88888888-8888-4888-8888-888888888888", altText: "Fictional image without delivery", url: null, deliveryAvailable: false };
  const settle = (next: EventDTO) => { current.current = next; setEvent(next); return { ok: true as const, data: next }; };
  const operations = {
    createEditorEvent: async (content: CreateEventInput) => { setRequests(n => n + 1); await new Promise(resolve => setTimeout(resolve, 400)); return scenario === "slug-conflict" ? { ok: false as const, code: "EVENT_SLUG_CONFLICT" as const } : settle({ ...base, ...content, status: "draft" }); },
    updateEditorEvent: async (input: { changes: Partial<EventDTO>; expectedVersion: string }) => scenario === "conflict" ? { ok: false as const, code: "EVENT_CONFLICT" as const } : scenario === "capacity-conflict" ? { ok: false as const, code: "EVENT_CAPACITY_CONFLICT" as const } : scenario === "server-error" ? { ok: false as const, code: "EVENT_UNAVAILABLE" as const } : settle({ ...current.current, ...input.changes, version: "b".repeat(64) }),
    transitionEditorEvent: async (input: { status: EventDTO["status"] }) => scenario === "invalid-transition" ? { ok: false as const, code: "EVENT_INVALID_TRANSITION" as const } : settle({ ...current.current, status: input.status, version: "b".repeat(64) }),
    readEditorEvent: async () => ({ ok: true as const, data: { ...current.current, title: "Latest fictional Event", version: "c".repeat(64) } }),
    readEventCover: async () => ({ ok: true as const, data: media }),
    listPickerMedia: async () => ({ ok: true as const, data: { items: [media, unavailable], nextCursor: null } }),
  };
  return <PermissionsProvider snapshot={snapshot}><CmsShell module="events" displayName={snapshot.displayName}><p className="uss-reference-disclosure">Development-only fictional Event. No backend publication or registration authority.</p><span data-testid="event-request-count">Fictional create requests: {requests}</span>{scenario === "forbidden" || scenario === "unauthenticated" || scenario === "suspended" || scenario === "unavailable" ? <ServiceFeedback code={scenario === "forbidden" ? "INSUFFICIENT_PERMISSION" : scenario === "unauthenticated" ? "UNAUTHENTICATED" : scenario === "suspended" ? "ACCOUNT_SUSPENDED" : "EVENT_UNAVAILABLE"} /> : view === "list" ? <EventList items={scenario === "empty" ? [] : [event]} nextCursor={scenario === "pagination" ? "fictional-cursor" : null} /> : <EventEditor initial={view === "create" ? null : event} initialCover={view === "create" ? null : scenario === "media-unavailable" ? unavailable : media} startPreview={view === "preview"} operations={operations} />}</CmsShell></PermissionsProvider>;
}
