import { Badge, Button, EmptyState, Field, LinkButton, Select } from "@/components/ui";
import { getManagedEventDetail, getManagedEventList } from "@/lib/events/event-actions";
import { getEventParticipants } from "@/lib/registrations/registration-actions";
import { text, type Query } from "@/features/history/query";
import { eventTime } from "./model";
import type { EventDTO } from "@/lib/events/event-types";
import type { ParticipantDTO, RegistrationPage } from "@/lib/registrations/registration-types";
import { CancelParticipantButton, ExportParticipantsButton } from "./ParticipantControls";
import { PARTICIPANTS_MODULE, PARTICIPANT_STATUSES, STAFF_CANCELLABLE, participantMessage, participantTime, participantsHref, statusTone } from "./participants-model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ParticipantsFailure({ code, module }: { code: string; module: string }) {
  return <section className="uss-member-panel" role="alert"><h2>PARTICIPANTS UNAVAILABLE.</h2><p>{participantMessage(code)}</p><LinkButton href={participantsHref({}, module)} variant="secondary">Back to events</LinkButton></section>;
}

/**
 * D2.5 admin slot: participants per event (events.manage). Server-rendered; every read and write is re-authorized in
 * lib/registrations. `module` is the /admin module id the Admin UI lane wires this workspace under.
 */
export async function ParticipantsWorkspace({ query, module = PARTICIPANTS_MODULE }: { query: Query; module?: string }) {
  const eventId = text(query, "eventId"), status = text(query, "status"), cursor = text(query, "cursor");
  if ((eventId && !UUID.test(eventId)) || (status && !PARTICIPANT_STATUSES.some(s => s === status)) || cursor.length > 512) return <ParticipantsFailure code="REGISTRATION_VALIDATION_ERROR" module={module} />;
  if (!eventId) return <EventPicker module={module} cursor={cursor} />;

  const [event, page] = await Promise.all([
    getManagedEventDetail(eventId),
    getEventParticipants({ eventId, limit: 20, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) }),
  ]);
  if (!event.ok) return <ParticipantsFailure code={event.code === "EVENT_NOT_FOUND" ? "REGISTRATION_NOT_AVAILABLE" : event.code} module={module} />;
  if (!page.ok) return <ParticipantsFailure code={page.code} module={module} />;
  return <ParticipantsView event={event.data} page={page.data} status={status} cursor={cursor} module={module} />;
}

/** Presentational participants page (also used by the dev-only design-system reference with fictional data). */
export function ParticipantsView({ event: e, page, status, cursor, module = PARTICIPANTS_MODULE }: { event: EventDTO; page: RegistrationPage<ParticipantDTO>; status: string; cursor: string; module?: string }) {
  const eventId = e.id, base = { eventId, ...(status ? { status } : {}) };
  return <section className="uss-ops" aria-labelledby="participants-heading">
    <header className="uss-event-heading">
      <div>
        <p className="uss-member-kicker">USS CMS / PARTICIPANTS</p>
        <h1 id="participants-heading">{e.title}</h1>
        <p>{eventTime(e.startsAt, e.timezone)} · {e.status.replaceAll("_", " ")} · Capacity {e.capacity ?? "not capped"}</p>
      </div>
      <LinkButton href={participantsHref({}, module)} variant="text">All events</LinkButton>
    </header>
    <div className="uss-ops-toolbar">
      <form noValidate action="/admin" method="get" className="uss-event-filters">
        <input type="hidden" name="module" value={module} />
        <input type="hidden" name="eventId" value={eventId} />
        <Field label="Registration status" hint="Filter the list and the CSV export.">
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            {PARTICIPANT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Button type="submit" variant="secondary">Apply filter</Button>
      </form>
      <ExportParticipantsButton eventId={eventId} status={status} />
    </div>
    {page.items.length ? <ul className="uss-ops-list" aria-label="Participants">
      {page.items.map(r => {
        const name = r.participant.displayName || "USS member";
        const cancellable = STAFF_CANCELLABLE.includes(r.status) && !r.participant.checkedInAt;
        return <li key={r.id}><article>
          <div>
            <div className="uss-event-status-line"><Badge tone={statusTone(r.status)}>{r.status}</Badge>{r.participant.checkedInAt && <Badge tone="success">checked in</Badge>}{r.participant.passStatus && <span>Pass: {r.participant.passStatus}</span>}</div>
            <h2>{name}</h2>
            <p className="uss-ops-muted">{r.participant.memberId ?? "No member ID"} · <span className="uss-ops-email">{r.participant.email ?? "No email"}</span></p>
            <p>Registered {participantTime(r.registeredAt, e.timezone)}{r.cancelledAt ? ` · Cancelled ${participantTime(r.cancelledAt, e.timezone)}` : ""}{r.participant.checkedInAt ? ` · Checked in ${participantTime(r.participant.checkedInAt, e.timezone)}` : ""}</p>
          </div>
          {cancellable ? <CancelParticipantButton eventId={eventId} registrationId={r.id} expectedVersion={r.version} name={name} /> : null}
        </article></li>;
      })}
    </ul> : <EmptyState title="No participants in this view." description={status ? "No registrations have this status. Clear the filter to see everyone." : "Nobody has registered for this event yet."} />}
    <nav className="uss-event-pagination" aria-label="Participant pages">
      <span>Newest registrations first, 20 per page.</span>
      {cursor && <LinkButton variant="text" href={participantsHref(base, module)}>First page</LinkButton>}
      {page.nextCursor && <LinkButton variant="secondary" href={participantsHref({ ...base, cursor: page.nextCursor }, module)}>Next page ↗</LinkButton>}
    </nav>
  </section>;
}

async function EventPicker({ module, cursor }: { module: string; cursor: string }) {
  const result = await getManagedEventList({ limit: 20, ...(cursor ? { cursor } : {}) });
  if (!result.ok) return <ParticipantsFailure code={result.code === "EVENT_VALIDATION_ERROR" ? "REGISTRATION_VALIDATION_ERROR" : result.code} module={module} />;
  return <EventPickerView events={result.data.items} nextCursor={result.data.nextCursor} module={module} />;
}

export function EventPickerView({ events, nextCursor, module = PARTICIPANTS_MODULE }: { events: EventDTO[]; nextCursor: string | null; module?: string }) {
  return <section className="uss-ops" aria-labelledby="participants-heading">
    <header className="uss-event-heading"><div><p className="uss-member-kicker">USS CMS / PARTICIPANTS</p><h1 id="participants-heading">PARTICIPANTS.</h1><p>Choose an event to review registrations, cancel a place with a reason, or export a CSV.</p></div></header>
    {events.length ? <ul className="uss-ops-list" aria-label="Events">
      {events.map(e => <li key={e.id}><article><div><div className="uss-event-status-line"><Badge tone={e.status === "cancelled" ? "error" : "info"}>{e.status.replaceAll("_", " ")}</Badge><span>{e.visibility}</span></div><h2>{e.title}</h2><p>{eventTime(e.startsAt, e.timezone)}</p></div><LinkButton href={participantsHref({ eventId: e.id }, module)} variant="secondary">View participants ↗</LinkButton></article></li>)}
    </ul> : <EmptyState title="No events yet." description="Create an event in the Events module first." />}
    {nextCursor && <div className="uss-event-pagination"><LinkButton variant="secondary" href={participantsHref({ cursor: nextCursor }, module)}>Next page ↗</LinkButton></div>}
  </section>;
}
