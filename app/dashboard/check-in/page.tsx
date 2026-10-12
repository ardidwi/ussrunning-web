import { readScannerEvents } from "@/features/check-in/api/actions";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventDate } from "@/features/event-registration/model";
export default async function ScannerEvents({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams,
    result = await readScannerEvents(cursor ?? null);
  if (!result.ok)
    return (
      <ServiceFeedback code={result.code} returnTo="/dashboard/check-in" />
    );
  return (
    <section className="uss-scanner uss-member-panel">
      <p className="uss-member-kicker">CREW OPERATIONS</p>
      <h1>Event check-in.</h1>
      <p>
        Choose the event before scanning. Every check-in is verified against
        that event.
      </p>
      {!result.data.items.length ? (
        <EmptyState
          title="No events available."
          description="Contact the event lead if you expected an event here."
        />
      ) : (
        <ul className="uss-scanner-events">
          {result.data.items.map((event) => (
            <li key={event.id} className="uss-member-panel">
              <h2>{event.title}</h2>
              <p>
                {eventDate(event.startsAt, event.timezone)} ·{" "}
                {event.status.replaceAll("_", " ")}
              </p>
              <LinkButton
                href={`/dashboard/check-in/${encodeURIComponent(event.id)}`}
              >
                Open scanner ↗
              </LinkButton>
            </li>
          ))}
        </ul>
      )}
      {result.data.nextCursor && (
        <LinkButton
          variant="secondary"
          href={`/dashboard/check-in?cursor=${encodeURIComponent(result.data.nextCursor)}`}
        >
          Next events ↗
        </LinkButton>
      )}
      {cursor && (
        <LinkButton variant="text" href="/dashboard/check-in">
          First events ↗
        </LinkButton>
      )}
    </section>
  );
}
