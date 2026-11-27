import "server-only";
import { getPublicEventList } from "@/lib/events/event-actions";
import { EVENT_POLICY } from "@/lib/events/event-policy";
import type { PublicEventDTO } from "@/lib/events/event-types";

export type UpcomingEventsResult =
  | { ok: true; items: PublicEventDTO[] }
  | { ok: false; code: string };

/** States that can still be attended; completed/cancelled events are history, not "next up". */
const UPCOMING_STATES = new Set<PublicEventDTO["status"]>([
  "published",
  "registration_open",
  "registration_closed",
]);

export function isUpcomingEvent(event: PublicEventDTO, now: Date) {
  if (!UPCOMING_STATES.has(event.status)) return false;
  const ends = new Date(event.endsAt ?? event.startsAt).getTime();
  return Number.isFinite(ends) && ends >= now.getTime();
}

/**
 * Single public read path for "next events" teasers (home, login). It reads the same BE-07 public listing as /runs,
 * filtered server-side (`upcoming: true`) to attendable events that start after the database clock. The comparison
 * runs on timestamptz, so it is independent of the event display timezone and of server/browser timezones, and the
 * page is exactly `limit` long instead of a client-side trim of one large page. The local check is defense in depth.
 */
export async function loadUpcomingPublicEvents(
  limit: number,
  now: Date = new Date(),
): Promise<UpcomingEventsResult> {
  const bounded = Math.max(1, Math.min(EVENT_POLICY.maxLimit, Math.trunc(limit) || 1));
  const result = await getPublicEventList({ limit: bounded, upcoming: true });
  if (!result.ok) return { ok: false, code: result.code };
  return {
    ok: true,
    items: result.data.items
      .filter((event) => isUpcomingEvent(event, now))
      .slice(0, bounded),
  };
}
