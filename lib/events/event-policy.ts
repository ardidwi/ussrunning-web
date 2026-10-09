import type { EventStatus } from "@/lib/db/types";
export const EVENT_POLICY = { defaultLimit: 20, maxLimit: 50, maxPayloadBytes: 32768, maxParagraphs: 30 } as const;
export const EVENT_STATUSES: readonly EventStatus[] = ["draft", "published", "registration_open", "registration_closed", "completed", "cancelled", "archived"];
export const PUBLIC_EVENT_STATES: readonly EventStatus[] = ["published", "registration_open", "registration_closed", "completed", "cancelled"];
export const EVENT_TRANSITIONS: Readonly<Record<EventStatus, readonly EventStatus[]>> = {
    draft: ["published", "archived"], published: ["draft", "registration_open", "registration_closed", "cancelled", "archived"],
    registration_open: ["registration_closed", "cancelled"], registration_closed: ["registration_open", "completed", "cancelled"],
    completed: ["archived"], cancelled: ["archived"], archived: ["draft"],
};
