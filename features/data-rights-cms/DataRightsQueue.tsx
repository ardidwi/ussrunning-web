import { Badge, LinkButton } from "@/components/ui";
import { formatWhen, STATUS_PRESENTATION } from "@/lib/data-rights/data-rights-presentation";
import { DELETION_STATUSES, type DataRightsResult, type DeletionQueuePage, type DeletionStatus } from "@/lib/data-rights/data-rights-types";
import { DeletionRequestActions, type QueueAdapters } from "./DeletionRequestActions";

const SUMMARY_LABELS: Record<string, string> = {
  rolesRemoved: "Roles removed", passesRevoked: "Passes revoked", profilesErased: "Profile erased",
  avatarObjectsQueued: "Photo files", registrationsCancelled: "Upcoming registrations cancelled",
  registrationAnswersErased: "Registration answers erased", notificationsRedacted: "Notifications redacted",
};

/** Presentational queue; data loading lives in DataRightsWorkspace (or a fixture in development). */
export function DataRightsQueue({ result, status, cursor, adapters }: {
  result: DataRightsResult<DeletionQueuePage>;
  status: DeletionStatus | "";
  cursor: string;
  adapters?: QueueAdapters;
}) {
  const base = new URLSearchParams({ module: "data-rights" });
  if (status) base.set("status", status);
  return (
    <section className="uss-member-panel" aria-labelledby="data-rights-heading">
      <header className="uss-member-intro">
        <p className="uss-member-kicker">USS CMS / DATA RIGHTS</p>
        <h1 id="data-rights-heading">DELETION REQUESTS.</h1>
        <p>Members&apos; account deletion requests. Approve or decline with a reason, then execute approved requests.
          Every step is recorded in the audit log. You cannot review your own request.</p>
      </header>
      <form action="/admin" method="get" className="uss-data-rights-filter">
        <input type="hidden" name="module" value="data-rights" />
        <label style={{ display: "grid", gap: "0.35rem", minWidth: 0 }}>
          <span>Status</span>
          <select name="status" defaultValue={status} style={{ width: "100%", minWidth: 0, padding: "0.75rem" }}>
            <option value="">All requests</option>
            {DELETION_STATUSES.map(value => <option key={value} value={value}>{STATUS_PRESENTATION[value].label}</option>)}
          </select>
        </label>
        <button type="submit" className="uss-button">Apply filter</button>
      </form>
      {!result.ok ? (
        <div role="alert">
          <h2>Requests unavailable.</h2>
          <p>{result.code === "DATA_RIGHTS_INVALID_INPUT" ? "This filter is not supported." : "The deletion queue could not be loaded. No changes were made."}</p>
          <LinkButton href="/admin?module=data-rights" variant="secondary">Reset</LinkButton>
        </div>
      ) : !result.data.items.length ? (
        <p role="status">{status ? `No ${STATUS_PRESENTATION[status].label.toLowerCase()} requests.` : "No deletion requests yet."}</p>
      ) : (
        <ul className="uss-data-rights-queue">
          {result.data.items.map(item => {
            const p = STATUS_PRESENTATION[item.status];
            return (
              <li key={item.id} className="uss-data-rights-request">
                <div className="uss-data-rights-request-head">
                  <strong>{item.subject.displayName || "USS member"} · {item.subject.memberId}</strong>
                  <Badge tone={p.tone}>{p.label}</Badge>
                </div>
                <dl className="uss-data-rights-facts">
                  <div><dt>Account</dt><dd>{item.subject.email} ({item.subject.accountStatus.replaceAll("_", " ")})</dd></div>
                  <div><dt>Requested</dt><dd>{formatWhen(item.requestedAt)}</dd></div>
                  {item.reason && <div><dt>Member reason</dt><dd>{item.reason}</dd></div>}
                  {item.decidedAt && <div><dt>Reviewed</dt><dd>{formatWhen(item.decidedAt)} by {item.decidedBy?.displayName || "super admin"}</dd></div>}
                  {item.decisionReason && <div><dt>Review reason</dt><dd>{item.decisionReason}</dd></div>}
                  {item.cancelledAt && <div><dt>Cancelled</dt><dd>{formatWhen(item.cancelledAt)} by the member</dd></div>}
                  {item.executedAt && <div><dt>Executed</dt><dd>{formatWhen(item.executedAt)} by {item.executedBy?.displayName || "super admin"}</dd></div>}
                  {item.erasure && <div><dt>Erasure</dt><dd>
                    {Object.entries(item.erasure.summary).filter(([key]) => SUMMARY_LABELS[key]).map(([key, value]) => `${SUMMARY_LABELS[key]}: ${value}`).join(" · ")}
                    {` · Photo files deleted: ${item.erasure.deletedObjects}, pending: ${item.erasure.pendingObjects}`}
                  </dd></div>}
                </dl>
                <DeletionRequestActions request={item} adapters={adapters} />
              </li>
            );
          })}
        </ul>
      )}
      {result.ok && result.data.nextCursor && <LinkButton href={`/admin?${base.toString()}&cursor=${encodeURIComponent(result.data.nextCursor)}`} variant="secondary">Next page ↗</LinkButton>}
      {cursor && <LinkButton href={`/admin?${base.toString()}`} variant="text">First page ↗</LinkButton>}
    </section>
  );
}
