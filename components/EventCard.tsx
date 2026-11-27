import Link from "next/link";
import type { PublicEventDTO } from "@/lib/events/event-types";
import { eventStatusLabel, eventCardDate } from "@/features/public-events/presentation";

/** Public teaser card for a BE-07 public event. Uses only the published DTO. */
export default function EventCard({ event }: { event: PublicEventDTO }) {
  const date = eventCardDate(event.startsAt, event.timezone);
  const place = event.venueName || event.locationText;
  return (
    <Link
      href={`/runs/${encodeURIComponent(event.slug)}`}
      className="event-card event-card-typographic"
    >
      {event.cover?.url ? (
        <div className="event-image-wrap">
          {/* Public CMS cover only (purpose='cms', active, public); member avatars never reach this DTO. */}
          <img className="event-image" src={event.cover.url} alt={event.cover.altText || ""} width={event.cover.width ?? undefined} height={event.cover.height ?? undefined} loading="lazy" decoding="async" />
        </div>
      ) : null}
      <div className="event-date-block">
        <span className="event-date-day">{date.day}</span>
        <span className="event-date-month">{date.month}</span>
        <div className="event-status">{eventStatusLabel(event.status)}</div>
      </div>
      <div className="event-card-topline">
        <span>{event.eventType ? event.eventType.replaceAll("-", " ").toUpperCase() : "USS RUN"}</span>
        <span>{date.full}</span>
      </div>
      <h3>{event.title}</h3>
      <div className="event-meta">
        <span>{date.time}</span>
        {place ? <span>{place.toUpperCase()}</span> : null}
      </div>
    </Link>
  );
}
