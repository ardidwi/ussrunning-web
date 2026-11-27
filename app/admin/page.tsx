import { loadCmsPermissions } from "@/features/permissions/server";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { permissionView } from "@/features/permissions/model";
import { CmsShell } from "@/features/cms/CmsShell";
import { CmsModuleBoundary } from "@/features/cms/CmsModuleBoundary";
import { CmsStatusShell } from "@/features/cms/CmsStatusShell";
import { CMS_MODULES, cmsModule } from "@/features/cms/navigation";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { AuditHistory } from "@/features/history/AuditHistory";
import { RevisionHistory } from "@/features/history/RevisionHistory";
import {
  auditQuery,
  revisionQuery,
  text,
  type Query,
} from "@/features/history/query";
import { getAuditHistory } from "@/lib/audit/audit-actions";
import { StoriesWorkspace } from "@/features/stories-cms/StoriesWorkspace";
import { GalleryWorkspace } from "@/features/gallery-cms/GalleryWorkspace";
import { EventWorkspace } from "@/features/events-cms/EventWorkspace";
import { SiteContentWorkspace } from "@/features/site-content-cms/SiteContentWorkspace";
import { PartnersWorkspace } from "@/features/partners-cms/PartnersWorkspace";
import { MemberScanner } from "@/features/member-scanner/MemberScanner";
import { MembersWorkspace } from "@/features/members-cms/MembersWorkspace";
import { RolesWorkspace } from "@/features/members-cms/RolesWorkspace";
import { ModerationWorkspace } from "@/features/members-cms/ModerationWorkspace";
import { AdminOverview } from "@/features/cms/AdminOverview";
import { CheckInWorkspace } from "@/features/cms/CheckInWorkspace";
import { ADMIN_SLOTS, isAdminSlot } from "@/features/cms/admin-slots";
import {
  getRevisionHistory,
  getHistorySnapshot,
} from "@/lib/revisions/revision-actions";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "USS CMS — USS Running",
  robots: { index: false, follow: false },
};
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const [context, query] = await Promise.all([
    loadCmsPermissions(),
    searchParams,
  ]);
  if (!context.ok)
    return (
      <CmsStatusShell>
        <ServiceFeedback code={context.code} returnTo="/admin" />
      </CmsStatusShell>
    );
  const module = cmsModule(text(query, "module")),
    access = permissionView(context.data),
    item = CMS_MODULES.find((item) => item.id === module)!;
  let content;
  if (!access.canAny(item.permissions))
    content = (
      <ServiceFeedback code="INSUFFICIENT_PERMISSION" returnTo="/admin" />
    );
  else if (module === "overview") {
    content = <AdminOverview />;
  } else if (isAdminSlot(module)) {
    const Slot = ADMIN_SLOTS[module];
    content = Slot ? <Slot query={query} /> : <CmsModuleBoundary module={module} />;
  } else if (module === "content") {
    content = <SiteContentWorkspace />;
  } else if (module === "stories") {
    content = <StoriesWorkspace query={query} />;
  } else if (module === "gallery") {
    content = <GalleryWorkspace query={query} />;
  } else if (module === "events") {
    content = <EventWorkspace query={query} />;
  } else if (module === "partners") {
    content = <PartnersWorkspace query={query} />;
  } else if (module === "members") {
    content = (
      <MembersWorkspace
        query={query}
        canManageUsers={access.can("users.manage")}
        canManageRoles={access.can("roles.manage")}
      />
    );
  } else if (module === "roles") {
    content = <RolesWorkspace />;
  } else if (module === "moderation") {
    content = <ModerationWorkspace query={query} />;
  } else if (module === "check-in") {
    content = <CheckInWorkspace query={query} />;
  } else if (module === "member-scanner") {
    content = <MemberScanner />;
  } else if (module === "activity") {
    const input = auditQuery(query);
    content = (
      <AuditHistory
        result={input.ok ? await getAuditHistory(input.filters) : input}
        query={query}
        allCategories={access.can("audit.read.all")}
      />
    );
  } else if (module === "revisions") {
    const input = revisionQuery(query);
    const result = input
      ? await getRevisionHistory(input)
      : text(query, "entityId")
        ? { ok: false as const, code: "HISTORY_VALIDATION_ERROR" as const }
        : null;
    const detail =
      input && result?.ok && text(query, "revisionId")
        ? await getHistorySnapshot({
            entity: input.entity,
            entityId: input.entityId,
            revisionId: text(query, "revisionId"),
          })
        : undefined;
    content = <RevisionHistory result={result} detail={detail} query={query} />;
  } else content = <CmsModuleBoundary module={module} />;
  return (
    <PermissionsProvider snapshot={context.data}>
      <CmsShell module={module} displayName={context.data.displayName}>
        {content}
      </CmsShell>
    </PermissionsProvider>
  );
}
