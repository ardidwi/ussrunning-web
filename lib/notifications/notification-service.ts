import 'server-only';
import { createHash } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { getTransactionalEmailConfig } from '@/lib/email/config';
import { createResendProvider } from '@/lib/email/providers/resend';
import type { EmailProvider, ProviderResult } from '@/lib/email/types';
import { NotificationError, notificationOperation } from './notification-errors';
import { filters, notificationRef, recipient } from './notification-validation';
import { renderNotification } from './notification-templates';
import * as repo from './notification-repository';
import type { NotificationRecord, NotificationDto } from './notification-types';
function dto(r: NotificationRecord): NotificationDto { return { id: r.id, type: r.notification_type, channel: 'email', status: r.cancelled_at ? 'cancelled' : r.status === 'queued' ? 'pending' : r.status as NotificationDto['status'], eventId: r.event_id, registrationId: r.registration_id, passId: r.pass_id, attemptCount: r.attempt_count, retryable: r.retryable, nextAttemptAt: r.next_attempt_at, queuedAt: r.queued_at, sentAt: r.sent_at, failedAt: r.failed_at, version: r.version, errorCode: r.last_error_code, provider: r.provider }; }
export async function getManagedNotification(input: unknown) { return notificationOperation(async () => { const { account } = await requirePermission('events.manage'); const ref = notificationRef(input); return dto(await repo.readNotification(account.id, ref.id)); }); }
export async function listManagedNotifications(input: unknown = {}) { return notificationOperation(async () => { const { account } = await requirePermission('events.manage'), f = filters(input), rows = await repo.listNotifications(account.id, f), more = rows.length > f.limit, items = rows.slice(0, f.limit), last = items.at(-1); return { items: items.map(dto), nextCursor: more && last ? Buffer.from(JSON.stringify({ at: last.queued_at, id: last.id, type: f.type, status: f.status })).toString('base64url') : null }; }); }
export async function cancelManagedNotification(input: unknown) { return notificationOperation(async () => { const { account } = await requirePermission('events.manage'), ref = notificationRef(input); return dto(await repo.cancelNotification(account.id, ref.id, ref.expectedVersion)); }); }
/** Server-only dependency injection for tests/alternative provider; never exposed in client action inputs. */
export async function dispatchManagedNotification(input: unknown, adapter?: {
    provider: EmailProvider;
    from: string;
    baseUrl: string;
}) {
    return notificationOperation(async () => {
        const { account } = await requirePermission('events.manage'), ref = notificationRef(input), before = await repo.readNotification(account.id, ref.id);
        if (before.status === 'sent')
            throw new NotificationError('NOTIFICATION_ALREADY_SENT');
        if (before.version !== ref.expectedVersion)
            throw new NotificationError('NOTIFICATION_CONFLICT');
        let delivery = adapter;
        try {
            if (!delivery) {
                const config = getTransactionalEmailConfig();
                delivery = { provider: createResendProvider(config.apiKey, config.timeoutMs), from: config.from, baseUrl: config.baseUrl };
            }
        }
        catch {
            throw new NotificationError('NOTIFICATION_PROVIDER_UNAVAILABLE');
        }
        if (before.attempt_count > 0 && (delivery.provider.idempotencyRetentionSeconds ?? 0) < 72000)
            throw new NotificationError('NOTIFICATION_NOT_RETRYABLE');
        const to = recipient(before.recipient), content = renderNotification(before.notification_type, before.payload, delivery.baseUrl, before.template_version), hash = createHash('sha256').update(JSON.stringify({ to, from: delivery.from, ...content })).digest('hex');
        const claimed = await repo.claimNotification(account.id, ref.id, hash, delivery.provider.name, ref.expectedVersion);
        let result: ProviderResult;
        try {
            result = await delivery.provider.send({ ...content, to, from: delivery.from, idempotencyKey: claimed.idempotency_key });
        }
        catch {
            result = { ok: false, code: 'EMAIL_DELIVERY_FAILED', retryable: true } as const;
        }
        if (result.ok && !/^[A-Za-z0-9_-]{1,200}$/.test(result.messageId))
            result = { ok: false, code: 'EMAIL_DELIVERY_FAILED', retryable: false };
        await repo.finishNotification(ref.id, claimed.claim_id!, result.ok, result.ok ? result.messageId : null, result.ok ? null : result.code, result.ok ? false : result.retryable === true);
        return { code: result.ok ? 'NOTIFICATION_SENT' as const : 'NOTIFICATION_SEND_FAILED' as const, notification: dto(await repo.readNotification(account.id, ref.id)) };
    });
}
