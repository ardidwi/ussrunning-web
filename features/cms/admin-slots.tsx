import type { ReactNode } from "react";
import type { Query } from "@/features/history/query";
import type { CmsModule } from "./navigation";
import { MediaLibraryWorkspace } from "@/features/media/MediaLibraryWorkspace";
import { ParticipantsWorkspace } from "@/features/events-cms/ParticipantsWorkspace";
import { NotificationsWorkspace } from "@/features/notifications-cms/NotificationsWorkspace";
import { DataRightsWorkspace } from "@/features/data-rights-cms/DataRightsWorkspace";

/**
 * Admin workspace slots for modules owned by other lanes.
 *
 * Contract (keep stable; the orchestrator wires a lane with ONE import + ONE registry line):
 *   - A slot component receives `{ query }`: the raw `/admin` search params (strings only).
 *     It must validate every value itself and use `/admin?module=<slot id>` for its own links.
 *   - It may be an async server component or a client component.
 *   - `/admin` renders it only after the navigation permission check for that module
 *     (see CMS_MODULES in ./navigation.ts). The workspace's server services MUST still
 *     enforce their own permission; navigation gating is UX only.
 *   - Until a component is registered, `/admin` renders the neutral "module not yet connected" state.
 *
 * Wiring example:
 *   import { MediaLibraryWorkspace } from "@/features/media/MediaLibraryWorkspace";
 *   export const ADMIN_SLOTS: AdminSlotRegistry = {
  media: MediaLibraryWorkspace, // cms.content.manage
  participants: ParticipantsWorkspace, // events.manage
  notifications: NotificationsWorkspace, // events.manage
  "data-rights": DataRightsWorkspace, // users.manage (super_admin)
};
 */
export type AdminSlotProps = { query: Query };
export type AdminSlotComponent = (props: AdminSlotProps) => ReactNode | Promise<ReactNode>;
export const ADMIN_SLOT_IDS = ["media", "participants", "notifications", "data-rights"] as const satisfies readonly CmsModule[];
export type AdminSlotId = (typeof ADMIN_SLOT_IDS)[number];
export type AdminSlotRegistry = Partial<Record<AdminSlotId, AdminSlotComponent>>;

export const ADMIN_SLOTS: AdminSlotRegistry = {
  // media: MediaLibraryWorkspace,          (permission: cms.content.manage)
  // participants: ParticipantsWorkspace,   (permission: events.manage)
  // notifications: NotificationsWorkspace, (permission: events.manage)
  // "data-rights": DataRightsWorkspace,    (permission: users.manage)
};

export function isAdminSlot(module: CmsModule): module is AdminSlotId {
  return (ADMIN_SLOT_IDS as readonly string[]).includes(module);
}

export const ADMIN_SLOT_COPY: Record<AdminSlotId, { title: string; description: string }> = {
  media: {
    title: "Media library",
    description: "Uploads, alt text and usage for CMS images.",
  },
  participants: {
    title: "Event participants",
    description: "Registrations per event, status filters, cancellations and exports.",
  },
  notifications: {
    title: "Notification queue",
    description: "Queued, sent and failed member emails, with resend and cancel.",
  },
  "data-rights": {
    title: "Data requests",
    description: "Member data exports and account deletion requests.",
  },
};
