"use client";
import type { SystemRole } from "@/lib/authz/permissions";
import { ROLE_PERMISSIONS } from "@/lib/authz/permissions";
import { PermissionsProvider } from "@/features/permissions/Permissions";
import { permissionView } from "@/features/permissions/model";
import { CmsShell } from "./CmsShell";
import { CmsModuleBoundary } from "./CmsModuleBoundary";
import { CMS_MODULES, type CmsModule } from "./navigation";
import { AuditHistory } from "@/features/history/AuditHistory";
import { RevisionHistory } from "@/features/history/RevisionHistory";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import type { AuditPage } from "@/lib/audit/audit-types";
import type {
  RevisionDetail,
  RevisionPage,
} from "@/lib/revisions/revision-types";
// Isolated fictional permission-response fixture; never grants real backend access.
export default function CmsReference({
  role,
  module,
  scenario,
}: {
  role: SystemRole;
  module: CmsModule;
  scenario: string;
}) {
  if (process.env.NODE_ENV !== "development") return null;
  const snapshot = {
      roles: [role],
      permissions: ROLE_PERMISSIONS[role],
      displayName: "Fictional CMS reviewer",
    },
    access = permissionView(snapshot);
  const actor = {
    accountId: "11111111-1111-4111-8111-111111111111",
    displayName: "Fictional editor",
  };
  const id = "22222222-2222-4222-8222-222222222222";
  const audit: AuditPage = {
    items:
      scenario === "empty"
        ? []
        : [
            {
              id,
              actor,
              action: "story.published",
              entityType: "story",
              entityId: id,
              revisionId: id,
              occurredAt: "2026-10-09T00:00:00.123456Z",
              metadata: { changedFields: ["title", "excerpt", "status"] },
            },
          ],
    nextCursor: scenario === "pagination" ? "fictional-cursor" : null,
    window: {
      from: "2026-09-09T00:00:00.123456Z",
      until: "2026-10-09T00:00:00.123456Z",
    },
  };
  const metadata = {
    id,
    entityId: id,
    version: 2,
    action: "updated",
    actor,
    occurredAt: "2026-10-09T00:00:00Z",
  };
  const revisions: RevisionPage = {
    entity: "story",
    items: scenario === "empty" ? [] : [metadata],
    nextCursor: null,
  };
  const detail: RevisionDetail = {
    entity: "story",
    metadata,
    snapshotScope: "safe_preview",
    snapshot:
      scenario === "empty-preview"
        ? {}
        : {
            title:
              "A fictional editorial headline with intentionally long text for narrow screen preview wrapping",
            excerpt: "A safe partial preview only. ".repeat(12),
            featured: true,
          },
  };
  const permitted = access.canAny(
    CMS_MODULES.find((item) => item.id === module)!.permissions,
  );
  const failure =
    scenario === "revoked"
      ? { ok: false as const, code: "INSUFFICIENT_PERMISSION" as const }
      : scenario === "server"
        ? { ok: false as const, code: "HISTORY_UNAVAILABLE" as const }
        : scenario === "invalid"
          ? { ok: false as const, code: "HISTORY_VALIDATION_ERROR" as const }
          : null;
  return (
    <PermissionsProvider snapshot={snapshot}>
      <CmsShell module={module} displayName={snapshot.displayName}>
        <p className="uss-reference-disclosure">
          Development reference. Fictional permissions/history; no production
          authority or changes.
        </p>
        {!permitted ? (
          <ServiceFeedback code="INSUFFICIENT_PERMISSION" />
        ) : module === "activity" ? (
          <AuditHistory
            result={failure ?? { ok: true, data: audit }}
            query={{}}
            allCategories={access.can("audit.read.all")}
          />
        ) : module === "revisions" ? (
          <RevisionHistory
            result={failure ?? { ok: true, data: revisions }}
            detail={{ ok: true, data: detail }}
            query={{ entity: "story", entityId: id }}
          />
        ) : (
          <CmsModuleBoundary module={module} />
        )}
      </CmsShell>
    </PermissionsProvider>
  );
}
