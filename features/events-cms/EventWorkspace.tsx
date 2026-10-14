import { LinkButton } from "@/components/ui";
import { getManagedEventDetail, getManagedEventList } from "@/lib/events/event-actions";
import { text, type Query } from "@/features/history/query";
import { readEventCover } from "./api/actions";
import { EventEditor } from "./EventEditor";
import { EventList } from "./EventList";
import { EVENT_STATUSES, eventHref, eventMessage } from "./model";
export function EventFailure({ code }: { code: string }) { return <section className="uss-member-panel" role="alert"><h2>EVENTS UNAVAILABLE.</h2><p>{eventMessage(code)}</p><LinkButton href={eventHref()} variant="secondary">Back to Events</LinkButton></section>; }
export async function EventWorkspace({ query }: { query: Query }) {
  const view = text(query, "view");
  if (view === "create") return <EventEditor initial={null} initialCover={null} />;
  if (view === "edit" || view === "detail" || view === "preview") {
    const result = await getManagedEventDetail(text(query, "id"));
    if (!result.ok) return <EventFailure code={result.code} />;
    const cover = result.data.coverMediaId ? await readEventCover(result.data.coverMediaId) : null;
    return <EventEditor key={result.data.id} initial={result.data} initialCover={cover?.ok ? cover.data : null} coverUnavailable={Boolean(cover && !cover.ok)} startPreview={view === "preview"} />;
  }
  const status = text(query, "status"), eventType = text(query, "eventType"), cursor = text(query, "cursor");
  if (view || (status && !EVENT_STATUSES.includes(status as typeof EVENT_STATUSES[number])) || cursor.length > 400 || (eventType && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventType) || eventType.length > 80))) return <EventFailure code="EVENT_VALIDATION_ERROR" />;
  const result = await getManagedEventList({ limit: 20, ...(status ? { status } : {}), ...(eventType ? { eventType } : {}), ...(cursor ? { cursor } : {}) });
  return result.ok ? <EventList items={result.data.items} nextCursor={result.data.nextCursor} status={status} eventType={eventType} /> : <EventFailure code={result.code} />;
}
