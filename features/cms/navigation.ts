import type { Permission } from "@/lib/authz/permissions";
import type { RevisionEntity } from "@/lib/history/policy";
export const CMS_MODULES = [
  {
    id: "overview",
    label: "Overview",
    permissions: [
      "cms.content.manage",
      "stories.manage",
      "partners.manage",
      "events.manage",
      "audit.read",
      "users.manage",
      "roles.manage",
      "settings.manage",
    ],
  },
  { id: "content", label: "Website", permissions: ["cms.content.manage"] },
  { id: "events", label: "Runs", permissions: ["events.manage"] },
  { id: "stories", label: "Stories", permissions: ["cms.content.manage"] },
  { id: "gallery", label: "Gallery", permissions: ["cms.content.manage"] },
  { id: "media", label: "Media", permissions: ["cms.content.manage"] },
  { id: "members", label: "Members", permissions: ["users.manage"] },
  { id: "activity", label: "Audit history", permissions: ["audit.read"] },
  {
    id: "revisions",
    label: "Revision previews",
    permissions: [
      "cms.content.manage",
      "stories.manage",
      "partners.manage",
      "events.manage",
    ],
  },
  { id: "settings", label: "Settings", permissions: ["settings.manage"] },
] as const satisfies readonly {
  id: string;
  label: string;
  permissions: readonly Permission[];
}[];
export type CmsModule = (typeof CMS_MODULES)[number]["id"];
export function cmsModule(value: unknown): CmsModule {
  return CMS_MODULES.find((item) => item.id === value)?.id ?? "overview";
}
export const REVISION_PERMISSION: Record<RevisionEntity, Permission> = {
  site_content: "cms.content.manage",
  story: "stories.manage",
  partner: "partners.manage",
  event: "events.manage",
};
