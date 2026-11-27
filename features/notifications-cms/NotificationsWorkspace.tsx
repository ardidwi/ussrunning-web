import { Badge, Button, EmptyState, Field, LinkButton, Select } from "@/components/ui";
import { listManagedNotifications } from "@/lib/notifications/notification-actions";
import { text, type Query } from "@/features/history/query";
import { NotificationControls } from "./NotificationControls";
import type { NotificationDto } from "@/lib/notifications/notification-types";
import { NOTIFICATIONS_MODULE, NOTIFICATION_STATUSES, NOTIFICATION_TYPES, TYPE_LABELS, canCancel, canResend, errorLabel, notificationMessage, notificationsHref, queueTime, statusLabel, statusTone } from "./model";

/**
 * D2.7 admin slot: notification delivery queue (events.manage). Shows delivery diagnostics only — never recipients,
 * email bodies, tokens or provider payloads (the existing NotificationDto contract). Resend/cancel use the existing
 * notification actions, which re-authorize and enforce attempt caps and idempotency.
 */
export async function NotificationsWorkspace({ query, module = NOTIFICATIONS_MODULE }: { query: Query; module?: string }) {
  const status = text(query, "status"), type = text(query, "type"), cursor = text(query, "cursor");
  const invalid = (status && !NOTIFICATION_STATUSES.some(s => s === status)) || (type && !NOTIFICATION_TYPES.some(t => t === type)) || cursor.length > 512;
  const result = invalid ? { ok: false as const, code: "NOTIFICATION_INVALID_TEMPLATE" } : await listManagedNotifications({ limit: 20, ...(status ? { status } : {}), ...(type ? { type } : {}), ...(cursor ? { cursor } : {}) });
  return <NotificationsView result={result} status={status} type={type} cursor={cursor} module={module} />;
}

/** Presentational queue (also used by the dev-only design-system reference with fictional data). */
export function NotificationsView({ result, status, type, cursor, module = NOTIFICATIONS_MODULE }: { result: { ok: true; data: { items: NotificationDto[]; nextCursor: string | null } } | { ok: false; code: string }; status: string; type: string; cursor: string; module?: string }) {
  const base = { ...(status ? { status } : {}), ...(type ? { type } : {}) };
  return <section className="uss-ops" aria-labelledby="notifications-heading">
    <header className="uss-event-heading"><div>
      <p className="uss-member-kicker">USS CMS / NOTIFICATIONS</p>
      <h1 id="notifications-heading">NOTIFICATIONS.</h1>
      <p>RSVP emails are sent automatically every 5 minutes. Failed sends retry up to 3 attempts, then stay here as a final failure.</p>
    </div></header>
    <form noValidate action="/admin" method="get" className="uss-event-filters">
      <input type="hidden" name="module" value={module} />
      <Field label="Delivery status"><Select name="status" defaultValue={status}><option value="">All statuses</option>{NOTIFICATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</Select></Field>
      <Field label="Email type"><Select name="type" defaultValue={type}><option value="">All types</option>{NOTIFICATION_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}</Select></Field>
      <Button type="submit" variant="secondary">Apply filters</Button>
      {(status || type) && <LinkButton href={notificationsHref({}, module)} variant="text">Clear</LinkButton>}
    </form>
    {!result.ok ? <div className="uss-member-panel" role="alert"><h2>NOTIFICATIONS UNAVAILABLE.</h2><p>{notificationMessage(result.code)}</p><LinkButton href={notificationsHref({}, module)} variant="secondary">Reset</LinkButton></div>
      : result.data.items.length === 0 ? <EmptyState title="No notifications in this view." description={status || type ? "Change or clear the filters." : "RSVP emails appear here as soon as a registration changes."} />
      : <ul className="uss-ops-list" aria-label="Notifications">
        {result.data.items.map(n => <li key={n.id}><article>
          <div>
            <div className="uss-event-status-line"><Badge tone={statusTone(n)}>{statusLabel(n)}</Badge><span>{n.channel}</span></div>
            <h2>{TYPE_LABELS[n.type]}</h2>
            <dl className="uss-ops-facts">
              <div><dt>Queued</dt><dd>{queueTime(n.queuedAt)}</dd></div>
              <div><dt>Attempts</dt><dd>{n.attemptCount} of 3</dd></div>
              {n.sentAt && <div><dt>Sent</dt><dd>{queueTime(n.sentAt)}</dd></div>}
              {n.status === "failed" && n.retryable && <div><dt>Next attempt</dt><dd>{queueTime(n.nextAttemptAt)}</dd></div>}
              {n.errorCode && <div><dt>Reason</dt><dd>{errorLabel(n.errorCode)}</dd></div>}
            </dl>
            <p><LinkButton variant="text" href={`/admin?${new URLSearchParams({ module: "participants", eventId: n.eventId })}`}>Event participants ↗</LinkButton></p>
          </div>
          <NotificationControls id={n.id} version={n.version} resend={canResend(n)} cancel={canCancel(n)} label={TYPE_LABELS[n.type]} />
        </article></li>)}
      </ul>}
    {result.ok && <nav className="uss-event-pagination" aria-label="Notification pages">
      <span>Newest first, 20 per page.</span>
      {cursor && <LinkButton variant="text" href={notificationsHref(base, module)}>First page</LinkButton>}
      {result.data.nextCursor && <LinkButton variant="secondary" href={notificationsHref({ ...base, cursor: result.data.nextCursor }, module)}>Next page ↗</LinkButton>}
    </nav>}
  </section>;
}
