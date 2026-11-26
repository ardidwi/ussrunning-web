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
 * Single public read path for "next events" teasers (home, login). It reads the
 * same BE-07 public listing as /runs, so every surface shows the same records.
 * BE-07 has no "starts after" filter yet, so this reads one bounded page
 * (EVENT_POLICY.maxLimit) ordered by start time and keeps upcoming entries.
 */
export async function loadUpcomingPublicEvents(
  limit: number,
  now: Date = new Date(),
): Promise<UpcomingEventsResult> {
  const result = await getPublicEventList({ limit: EVENT_POLICY.maxLimit });
  if (!result.ok) return { ok: false, code: result.code };
  return {
    ok: true,
    items: result.data.items
      .filter((event) => isUpcomingEvent(event, now))
      .slice(0, limit),
  };
}
