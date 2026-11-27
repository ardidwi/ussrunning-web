import type { Permission } from "@/lib/authz/permissions";
import type { RevisionEntity } from "@/lib/history/policy";

/**
 * Admin navigation. `permissions` is UX gating only (any-of); every workspace's
 * server service re-checks its own permission. `group` orders the sidebar.
 */
export const CMS_MODULES = [
  {
    id: "overview",
    label: "Overview",
    group: "start",
    permissions: [
      "cms.content.manage",
      "stories.manage",
      "partners.manage",
      "events.manage",
      "audit.read",
      "members.read",
      "members.lookup",
      "members.photo.review",
      "users.manage",
      "roles.manage",
      "settings.manage",
    ],
  },
  { id: "content", label: "Website", permissions: ["cms.content.manage"], group: "content" },
  { id: "stories", label: "Stories", permissions: ["cms.content.manage"], group: "content" },
  { id: "gallery", label: "Gallery", permissions: ["cms.content.manage"], group: "content" },
  { id: "partners", label: "Partners", permissions: ["partners.manage"], group: "content" },
  { id: "media", label: "Media", permissions: ["cms.content.manage"], group: "content" },
  { id: "events", label: "Events", permissions: ["events.manage"], group: "events" },
  { id: "participants", label: "Participants", permissions: ["events.manage"], group: "events" },
  { id: "check-in", label: "Event check-in", permissions: ["events.manage"], group: "events" },
  { id: "notifications", label: "Notifications", permissions: ["events.manage"], group: "events" },
  { id: "members", label: "Members", permissions: ["members.read", "users.manage"], group: "people" },
  { id: "moderation", label: "Photo review", permissions: ["members.photo.review"], group: "people" },
  { id: "member-scanner", label: "Scan member", permissions: ["members.lookup"], group: "people" },
  { id: "roles", label: "Roles", permissions: ["roles.manage"], group: "people" },
  { id: "data-rights", label: "Data requests", permissions: ["users.manage"], group: "people" },
  { id: "activity", label: "Audit history", permissions: ["audit.read"], group: "system" },
  {
    id: "revisions",
    label: "Revision previews",
    group: "system",
    permissions: [
      "cms.content.manage",
      "stories.manage",
      "partners.manage",
      "events.manage",
    ],
  },
  { id: "settings", label: "Settings", permissions: ["settings.manage"], group: "system" },
] as const satisfies readonly {
  id: string;
  label: string;
  group: "start" | "content" | "events" | "people" | "system";
  permissions: readonly Permission[];
}[];
export type CmsModule = (typeof CMS_MODULES)[number]["id"];
export function cmsModule(value: unknown): CmsModule {
  return CMS_MODULES.find((item) => item.id === value)?.id ?? "overview";
}
export function cmsModuleHref(module: CmsModule, params: Record<string, string> = {}) {
  const search = new URLSearchParams({ module, ...params });
  return `/admin?${search.toString()}`;
}
export const REVISION_PERMISSION: Record<RevisionEntity, Permission> = {
  site_content: "cms.content.manage",
  story: "stories.manage",
  partner: "partners.manage",
  event: "events.manage",
};
