import ScannerScreen from "@/features/check-in/components/ScannerScreen";
import { readScannerContext, readScannerEvents } from "@/features/check-in/api/actions";
import { checkInHref } from "@/features/check-in/model";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { EmptyState, LinkButton } from "@/components/ui";
import { eventDate } from "@/features/event-registration/model";
import { text, type Query } from "@/features/history/query";

/** D2.10: event check-in inside /admin. Authority stays events.manage, enforced by the event and check-in services. */
export async function CheckInWorkspace({ query }: { query: Query }) {
  const eventId = text(query, "event");
  if (eventId) return <ScannerScreen key={eventId} eventId={eventId} initial={await readScannerContext(eventId)} />;
  const cursor = text(query, "cursor");
  const result = await readScannerEvents(cursor || null);
  if (!result.ok) return <ServiceFeedback code={result.code} returnTo={checkInHref()} />;
  return (
    <section className="uss-scanner uss-member-panel" aria-labelledby="check-in-heading">
      <p className="uss-member-kicker">USS CMS / EVENT CHECK-IN</p>
      <h1 id="check-in-heading">Event check-in.</h1>
      <p>Choose the event before scanning. Every check-in is verified against that event.</p>
      {!result.data.items.length ? (
        <EmptyState title="No events available." description="Create or publish an event first, or contact the event lead." />
      ) : (
        <ul className="uss-scanner-events">
          {result.data.items.map(event => (
            <li key={event.id} className="uss-member-panel">
              <h2>{event.title}</h2>
              <p>{eventDate(event.startsAt, event.timezone)} · {event.status.replaceAll("_", " ")}</p>
              <LinkButton href={checkInHref(event.id)}>Open scanner ↗</LinkButton>
            </li>
          ))}
        </ul>
      )}
      {result.data.nextCursor && <LinkButton variant="secondary" href={`${checkInHref()}&cursor=${encodeURIComponent(result.data.nextCursor)}`}>Next events ↗</LinkButton>}
      {cursor && <LinkButton variant="text" href={checkInHref()}>First events ↗</LinkButton>}
    </section>
  );
}
