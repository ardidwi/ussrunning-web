import type { PublicEventDTO } from "@/lib/events/event-types";

const STATUS_LABELS = {
  draft: "COMING SOON",
  published: "COMING SOON",
  registration_open: "RSVP OPEN",
  registration_closed: "RSVP CLOSED",
  completed: "COMPLETED",
  cancelled: "CANCELLED",
  archived: "ARCHIVED",
} as const satisfies Record<PublicEventDTO["status"], string>;

export function eventStatusLabel(status: PublicEventDTO["status"]): string {
  return STATUS_LABELS[status];
}

function part(value: Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, ...options }).format(value);
}

export function eventCardDate(startsAt: string, timezone: string) {
  const value = new Date(startsAt);
  if (Number.isNaN(value.getTime()))
    return { day: "TBA", month: "", full: "DATE TBA", time: "TIME TBA" };
  let zone = timezone;
  try {
    part(value, zone, { day: "2-digit" });
  } catch {
    zone = "Asia/Jakarta";
  }
  return {
    day: part(value, zone, { day: "2-digit" }),
    month: part(value, zone, { month: "short" }).toUpperCase(),
    full: part(value, zone, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
    time: part(value, zone, { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
