import { EmptyState, LinkButton } from "@/components/ui";
import { ADMIN_SLOT_COPY, isAdminSlot } from "./admin-slots";
import { CMS_MODULES, type CmsModule } from "./navigation";

/** Neutral state for a permitted module whose workspace has not been wired into /admin yet. */
export function CmsModuleBoundary({ module }: { module: CmsModule }) {
  const current = CMS_MODULES.find((item) => item.id === module)!;
  const copy = isAdminSlot(module) ? ADMIN_SLOT_COPY[module] : null;
  return (
    <section aria-labelledby="cms-module-heading" data-admin-slot={module}>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / {current.label.toUpperCase()}</p>
        <h1 id="cms-module-heading">{current.label.toUpperCase()}.</h1>
        {copy && <p>{copy.description}</p>}
      </header>
      <div className="uss-member-panel" role="status">
        <EmptyState
          title="Module not yet connected."
          description="This workspace has no connected service in this environment. No records were read or changed."
          action={
            <LinkButton href="/admin" variant="secondary">
              Back to overview ↗
            </LinkButton>
          }
        />
      </div>
    </section>
  );
}
