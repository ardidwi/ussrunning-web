import 'server-only';
import { createHash } from 'node:crypto';
import type { EmailContent } from '@/lib/email/types';
import { renderNotification } from './notification-templates';
import { recipient } from './notification-validation';
import type { NotificationRecord } from './notification-types';
export interface NotificationEnvelope { to: string; content: EmailContent; hash: string; passReady: boolean }
function build(r: NotificationRecord, from: string, baseUrl: string, passReady: boolean): NotificationEnvelope {
    const to = recipient(r.recipient), content = renderNotification(r.notification_type, r.payload, baseUrl, r.template_version, { eventId: r.event_id, passReady });
    return { to, content, passReady, hash: createHash('sha256').update(JSON.stringify({ to, from, ...content })).digest('hex') };
}
/**
 * Deterministic envelope shared by the scheduled worker and the managed resend action, so either path can retry the
 * other's attempt with the identical provider idempotency key + content. A retry replays whichever variant (with or
 * without the Event Pass link) the first attempt committed; a fresh intent uses the current pass state.
 */
export function selectEnvelope(r: NotificationRecord, from: string, baseUrl: string, passActive: boolean): NotificationEnvelope {
    const preferred = build(r, from, baseUrl, passActive && r.notification_type === 'registration_confirmed');
    if (!r.envelope_hash || preferred.hash === r.envelope_hash || r.notification_type !== 'registration_confirmed')
        return preferred;
    const other = build(r, from, baseUrl, !preferred.passReady);
    return other.hash === r.envelope_hash ? other : preferred;
}
