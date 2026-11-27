import { LinkButton } from "@/components/ui";
import { PermissionGate } from "@/features/permissions/Permissions";
import type { ReactNode } from "react";
import type { AdminOverview as Overview, OverviewMetric } from "@/lib/admin-users/admin-overview";
import { STATUS_LABELS, MEMBER_STATUSES } from "@/features/members-cms/model";
import { cmsModuleHref, type CmsModule } from "./navigation";

function Metric<T>({ title, metric, render, href, linkLabel }: {
  title: string; metric: OverviewMetric<T>; render: (value: T) => ReactNode; href: string; linkLabel: string;
}) {
  if (metric.state === "hidden") return null;
  return (
    <article className="uss-member-panel uss-admin-metric" aria-labelledby={`metric-${title}`}>
      <h2 id={`metric-${title}`}>{title}</h2>
      {metric.state === "ok" ? render(metric.value) : (
        <p className="uss-admin-unavailable" role="status">Unavailable. This data source isn't ready in this environment (pending migration or service outage).</p>
      )}
      <LinkButton href={href} variant="text">{linkLabel} ↗</LinkButton>
    </article>
  );
}
const big = (value: number, unit: string) => <p className="uss-admin-figure"><strong>{value.toLocaleString("en-US")}</strong> <span>{unit}</span></p>;

export function OverviewView({ overview }: { overview: Overview | null }) {
  const links: [CmsModule, string, Parameters<typeof PermissionGate>[0]["permission"]][] = [
    ["stories", "Open Stories", "cms.content.manage"],
    ["events", "Manage events", "events.manage"],
    ["check-in", "Event check-in", "events.manage"],
    ["member-scanner", "Scan member", "members.lookup"],
    ["activity", "Audit history", "audit.read"],
  ];
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / OVERVIEW</p>
        <h1>KEEP THE CREW<br />IN THE KNOW.</h1>
        <p>Live numbers from the protected services. Each card only appears when your account has access to it.</p>
      </header>
      {!overview ? (
        <p className="uss-member-panel uss-admin-unavailable" role="status">Overview numbers are unavailable right now. Modules in the menu still work.</p>
      ) : (
        <div className="uss-admin-metrics">
          <Metric title="Members" metric={overview.membersByStatus} href={cmsModuleHref("members")} linkLabel="Open members"
            render={counts => (
              <dl className="uss-admin-status-counts">
                {MEMBER_STATUSES.map(status => (
                  <div key={status}><dt>{STATUS_LABELS[status]}</dt><dd>{counts[status].toLocaleString("en-US")}</dd></div>
                ))}
              </dl>
            )} />
          <Metric title="Upcoming events" metric={overview.upcomingEvents} href={cmsModuleHref("events")} linkLabel="Open events"
            render={value => big(value, value === 1 ? "published event ahead" : "published events ahead")} />
          <Metric title="Photo review" metric={overview.avatarQueue} href={cmsModuleHref("moderation")} linkLabel="Review photos"
            render={value => big(value, value === 1 ? "photo waiting" : "photos waiting")} />
          <Metric title="Failed notifications" metric={overview.failedNotifications} href={cmsModuleHref("notifications")} linkLabel="Open notifications"
            render={value => big(value, value === 1 ? "email failed" : "emails failed")} />
        </div>
      )}
      <div className="uss-member-quick">
        {links.map(([module, label, permission]) => (
          <PermissionGate key={module} permission={permission}>
            <LinkButton href={cmsModuleHref(module)} variant="secondary">{label} ↗</LinkButton>
          </PermissionGate>
        ))}
      </div>
    </>
  );
}
