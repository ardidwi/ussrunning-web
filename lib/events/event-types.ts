import type { EventStatus } from "@/lib/db/types";
import type { MediaAsset, MediaRecord } from "@/lib/media/media-types";
export type EventVisibility = "public" | "members_only" | "private";
export interface EventContent {
    slug: string;
    eventType: string | null;
    title: string;
    summary: string | null;
    description: {
        paragraphs: string[];
    } | null;
    startsAt: string;
    endsAt: string | null;
    timezone: string;
    venueName: string | null;
    locationText: string | null;
    mapUrl: string | null;
    registrationOpensAt: string | null;
    registrationClosesAt: string | null;
    capacity: number | null;
    waitlistEnabled: boolean;
    visibility: EventVisibility;
    coverMediaId: string | null;
}
export interface EventDTO extends EventContent {
    id: string;
    status: EventStatus;
    version: string;
    /** Repository-internal public cover record (public reads only); serialized to a MediaAsset, never sent raw. */
    cover?: MediaRecord | null;
}
/** Capacity is configuration, never a claim about remaining slots or registration eligibility. */
export type PublicEventDTO = Omit<EventDTO, "version" | "visibility" | "coverMediaId" | "cover"> & {
    /** Public CMS cover (purpose='cms', active, public) or null. Never a member avatar. */
    cover: Pick<MediaAsset, "url" | "altText" | "width" | "height"> | null;
};
export interface EventPage<T> {
    items: T[];
    nextCursor: string | null;
}
export interface EventFilters {
    limit: number;
    cursor: {
        startsAt: string;
        id: string;
    } | null;
    eventType: string | null;
    status: EventStatus | null;
    /** Only events still attendable that start after now (server clock). */
    upcoming: boolean;
}
export type CreateEventInput = Pick<EventContent, "slug" | "title" | "startsAt" | "timezone"> & Partial<Omit<EventContent, "slug" | "title" | "startsAt" | "timezone">>;
export interface UpdateEventInput {
    id: string;
    expectedVersion: string;
    changes: Partial<Omit<EventContent, "slug">>;
}
export interface TransitionEventInput {
    id: string;
    expectedVersion: string;
    status: EventStatus;
}
