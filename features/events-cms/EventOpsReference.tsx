import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { CmsShell } from "@/features/cms/CmsShell";
import type { EventDTO } from "@/lib/events/event-types";
import type { ParticipantDTO } from "@/lib/registrations/registration-types";
import type { NotificationDto } from "@/lib/notifications/notification-types";
import { EventPickerView, ParticipantsFailure, ParticipantsView } from "./ParticipantsWorkspace";
import { NotificationsView } from "@/features/notifications-cms/NotificationsWorkspace";

const eventId = "99999999-9999-4999-8999-999999999999";
const event: EventDTO = { id: eventId, slug: "fictional-dawn-run", title: "FICTIONAL DAWN RUN WITH A LONG NAME THAT MUST WRAP", summary: null, description: null, eventType: "community-run", startsAt: "2026-12-06T22:30:00Z", endsAt: null, registrationOpensAt: null, registrationClosesAt: null, timezone: "Asia/Jakarta", venueName: "Fictional park", locationText: null, mapUrl: null, capacity: 40, waitlistEnabled: true, visibility: "public", status: "registration_open", coverMediaId: null, version: "a".repeat(64) };
const person = (i: number, status: ParticipantDTO["status"], extra: Partial<ParticipantDTO["participant"]> = {}): ParticipantDTO => ({ id: `0000000${i}-0000-4000-8000-00000000000${i}`, accountId: `1000000${i}-0000-4000-8000-00000000000${i}`, status, version: String(i).repeat(64), registeredAt: `2026-11-2${i}T01:00:00Z`, cancelledAt: status === "cancelled" ? "2026-11-26T03:00:00Z" : null, updatedAt: "2026-11-26T03:00:00Z", event: { id: eventId, slug: event.slug, title: event.title, startsAt: event.startsAt, timezone: event.timezone, status: event.status }, participant: { displayName: `Fictional Runner ${i}`, memberId: `USS-00012${i}`, email: `fictional.runner.with.a.long.address.${i}@example.test`, checkedInAt: null, passStatus: status === "confirmed" ? "active" : null, ...extra } });
const note = (i: number, o: Partial<NotificationDto>): NotificationDto => ({ id: `2000000${i}-0000-4000-8000-00000000000${i}`, type: "registration_confirmed", channel: "email", status: "pending", eventId, registrationId: person(i, "confirmed").id, passId: null, attemptCount: 0, retryable: false, nextAttemptAt: null, queuedAt: "2026-11-27T01:00:00Z", sentAt: null, failedAt: null, version: 1, errorCode: null, provider: null, ...o });

/** Fictional development-only data for browser QA of the event-ops admin slots. Buttons call real (auth-guarded) actions. */
export default function EventOpsReference({ view, scenario }: { view?: string; scenario: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  const snapshot = { displayName: "Fictional editor", roles: ["admin" as const], permissions: ROLE_PERMISSIONS.admin };
  const empty = scenario === "empty";
  const content = view === "notifications"
    ? <NotificationsView module="notifications" status="" type="" cursor="" result={scenario === "error" ? { ok: false, code: "NOTIFICATION_FORBIDDEN" } : { ok: true, data: { nextCursor: empty ? null : "fictional", items: empty ? [] : [note(1, {}), note(2, { type: "registration_waitlisted", status: "failed", retryable: true, attemptCount: 1, nextAttemptAt: "2026-11-27T01:05:00Z", failedAt: "2026-11-27T01:01:00Z", errorCode: "EMAIL_PROVIDER_TIMEOUT" }), note(3, { type: "registration_cancelled", status: "failed", retryable: false, attemptCount: 3, errorCode: "EMAIL_DELIVERY_FAILED" }), note(4, { status: "sent", attemptCount: 1, sentAt: "2026-11-27T01:02:00Z", provider: "resend" }), note(5, { type: "event_pass_available", status: "cancelled", errorCode: "NOTIFICATION_MERGED" })] } }} />
    : view === "picker" ? <EventPickerView module="participants" events={empty ? [] : [event, { ...event, id: "99999999-9999-4999-8999-999999999998", title: "Fictional track night", status: "draft", visibility: "private" }]} nextCursor={null} />
    : scenario === "error" ? <ParticipantsFailure code="INSUFFICIENT_PERMISSION" module="participants" />
    : <ParticipantsView module="participants" event={event} status="" cursor="" page={{ nextCursor: empty ? null : "fictional", items: empty ? [] : [person(1, "confirmed"), person(2, "waitlisted"), person(3, "confirmed", { checkedInAt: "2026-11-27T00:00:00Z" }), person(4, "cancelled", { displayName: null })] }} />;
  return <PermissionsProvider snapshot={snapshot}><CmsShell module="events" displayName={snapshot.displayName}><p className="uss-reference-disclosure">Development-only fictional participants and notifications.</p>{content}</CmsShell></PermissionsProvider>;
}
