import { EmptyState, LinkButton } from "@/components/ui";
import { PermissionGate } from "@/features/permissions/Permissions";
import { CMS_MODULES, type CmsModule } from "./navigation";
export function CmsModuleBoundary({ module }: { module: CmsModule }) {
  const current = CMS_MODULES.find((item) => item.id === module)!;
  if (module === "overview")
    return (
      <>
        <header className="uss-member-intro">
          <p className="uss-member-kicker">USS CMS / FOUNDATION</p>
          <h1>
            KEEP THE CREW
            <br />
            IN THE KNOW.
          </h1>
          <p>
            Your workspace for community content. Available modules follow your
            current account permissions.
          </p>
        </header>
        <div className="uss-member-panel">
          <EmptyState
            title="Editorial work starts with Stories."
            description="Managed Stories are available to permitted editors. Other content modules will appear as their protected services are connected."
          />
        </div>
        <div className="uss-member-quick">
          <PermissionGate permission="cms.content.manage">
            <LinkButton href="/admin?module=stories" variant="secondary">
              Open Stories ↗
            </LinkButton>
          </PermissionGate>
          <PermissionGate permission="audit.read">
            <LinkButton href="/admin?module=activity" variant="secondary">
              View audit history ↗
            </LinkButton>
          </PermissionGate>
          <PermissionGate
            anyOf={[
              "cms.content.manage",
              "stories.manage",
              "partners.manage",
              "events.manage",
            ]}
          >
            <LinkButton href="/admin?module=revisions" variant="secondary">
              View revision previews ↗
            </LinkButton>
          </PermissionGate>
        </div>
      </>
    );
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">
          USS CMS / {current.label.toUpperCase()}
        </p>
        <h1>{current.label.toUpperCase()}.</h1>
      </header>
      <div className="uss-member-panel">
        <EmptyState
          title={`${current.label} editing is not available yet.`}
          description="This module is waiting for its protected content service. Your existing records haven't been changed."
          action={
            <LinkButton href="/admin" variant="secondary">
              Back to overview ↗
            </LinkButton>
          }
        />
        {module === "members" && (
          <PermissionGate permission="roles.manage">
            <p>
              Role changes require an approved account-administration service.
              No role changes are available here.
            </p>
          </PermissionGate>
        )}
      </div>
    </>
  );
}
