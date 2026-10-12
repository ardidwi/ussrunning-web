import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import type { PublicEventDTO } from "@/lib/events/event-types";
import type { HistoryResult } from "../model";
import { eventDate } from "../model";
import { EventRegistration } from "./EventRegistration";
export function PublicEventDetail({
  event,
  registration,
  registrationPanel,
}: {
  event: PublicEventDTO;
  registration: HistoryResult;
  registrationPanel?: ReactNode;
}) {
  return (
    <div className="uss-event-detail">
      <header>
        <p className="kicker">USS RUNNING / {event.eventType || "COMMUNITY"}</p>
        <h1>{event.title}</h1>
        <Badge>{event.status.replaceAll("_", " ")}</Badge>
        <p>Public event</p>
        {event.summary && <p>{event.summary}</p>}
      </header>
      <div className="uss-event-detail-grid">
        <section aria-label="Event information">
          <h2>The run</h2>
          {event.description?.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <dl>
            <div>
              <dt>Starts</dt>
              <dd>
                <time dateTime={event.startsAt}>
                  {eventDate(event.startsAt, event.timezone)}
                </time>
              </dd>
            </div>
            {event.endsAt && (
              <div>
                <dt>Ends</dt>
                <dd>{eventDate(event.endsAt, event.timezone)}</dd>
              </div>
            )}
            <div>
              <dt>Location</dt>
              <dd>
                {[event.venueName, event.locationText]
                  .filter(Boolean)
                  .join(" · ") || "To be announced"}
              </dd>
            </div>
            <div>
              <dt>Registration opens</dt>
              <dd>
                {event.registrationOpensAt
                  ? eventDate(event.registrationOpensAt, event.timezone)
                  : "No scheduled opening time"}
              </dd>
            </div>
            <div>
              <dt>Registration closes</dt>
              <dd>
                {event.registrationClosesAt
                  ? eventDate(event.registrationClosesAt, event.timezone)
                  : "No scheduled closing time"}
              </dd>
            </div>
            <div>
              <dt>Configured capacity</dt>
              <dd>
                {event.capacity === null
                  ? "No configured limit"
                  : `${event.capacity} confirmed places`}
              </dd>
            </div>
            <div>
              <dt>Waitlist</dt>
              <dd>
                {event.waitlistEnabled
                  ? "Enabled — a waitlist place is not confirmation"
                  : "Not available"}
              </dd>
            </div>
          </dl>
          <p>
            Capacity is enforced by USS Running. Remaining places are not shown
            here.
          </p>
          {event.mapUrl && /^https?:\/\//.test(event.mapUrl) && (
            <a href={event.mapUrl} target="_blank" rel="noopener noreferrer">
              Open location map ↗
            </a>
          )}
        </section>
        {registrationPanel ?? (
          <EventRegistration key={JSON.stringify(registration)} event={event} initial={registration} />
        )}
      </div>
    </div>
  );
}
