import { NotificationError } from './notification-errors';
import { NOTIFICATION_TYPES } from './notification-types';
import type { NotificationFilters, NotificationStatus, NotificationType, OperationalPayload } from './notification-types';
export const NOTIFICATION_LIST_POLICY = { maxLimit: 50, defaultLimit: 20 } as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function uuid(v: unknown): string { if (typeof v !== 'string' || !uuidPattern.test(v))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); return v.toLowerCase(); }
export function object(v: unknown, keys: string[]): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v) || JSON.stringify(v).length > 4096 || Object.keys(v).some(k => !keys.includes(k)))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); return v as Record<string, unknown>; }
export function notificationRef(v: unknown) { const o = object(v, ['id', 'expectedVersion']); const id = uuid(o.id); if (!Number.isSafeInteger(o.expectedVersion) || Number(o.expectedVersion) < 1 || Number(o.expectedVersion) > 2147483647)
    throw new NotificationError('NOTIFICATION_CONFLICT'); return { id, expectedVersion: Number(o.expectedVersion) }; }
export function validatePayload(v: unknown): OperationalPayload { const o = object(v, ['eventName', 'eventSlug', 'displayName', 'venue', 'instructions', 'startsAt', 'timezone', 'registrationId', 'registrationStatus']); if (typeof o.eventName !== 'string' || !o.eventName.trim() || o.eventName.length > 400 || /[<>\x00-\x1f]/.test(o.eventName) || typeof o.startsAt !== 'string' || !Number.isFinite(Date.parse(o.startsAt)) || typeof o.timezone !== 'string' || o.timezone.length > 80 || !['confirmed', 'waitlisted', 'cancelled'].includes(String(o.registrationStatus)))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); if (o.eventSlug !== null && (typeof o.eventSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(o.eventSlug) || o.eventSlug.length > 160))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); for (const [k, max] of [['displayName', 160], ['venue', 500], ['instructions', 1200]] as const) {
    if (o[k] !== null && (typeof o[k] !== 'string' || (o[k] as string).length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(o[k] as string)))
        throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
} try {
    new Intl.DateTimeFormat('en', { timeZone: o.timezone });
}
catch {
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
} return { eventName: o.eventName, eventSlug: o.eventSlug as string | null, displayName: o.displayName as string | null, venue: o.venue as string | null, instructions: o.instructions as string | null, startsAt: o.startsAt, timezone: o.timezone, registrationId: uuid(o.registrationId), registrationStatus: o.registrationStatus as OperationalPayload['registrationStatus'] }; }
export function validateType(v: unknown): NotificationType { if (!(NOTIFICATION_TYPES as readonly unknown[]).includes(v))
    throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE'); return v as NotificationType; }
export function recipient(v: unknown): string { if (typeof v !== 'string' || v.length > 254 || !/^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(v))
    throw new NotificationError('NOTIFICATION_INVALID_RECIPIENT'); return v; }
export function filters(v: unknown = {}): NotificationFilters {
    const o = object(v, ['type', 'status', 'limit', 'cursor']);
    const limit = o.limit ?? NOTIFICATION_LIST_POLICY.defaultLimit;
    if (!Number.isSafeInteger(limit) || Number(limit) < 1 || Number(limit) > NOTIFICATION_LIST_POLICY.maxLimit)
        throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
    let cursor: null | {
        at: string;
        id: string;
    } = null;
    if (o.cursor !== undefined && o.cursor !== null) {
        if (typeof o.cursor !== 'string' || o.cursor.length > 512)
            throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
        try {
            const c = object(JSON.parse(Buffer.from(o.cursor, 'base64url').toString('utf8')), ['at', 'id', 'status', 'type']);
            if (c.status !== (o.status ?? null) || c.type !== (o.type ?? null) || typeof c.at !== 'string' || !Number.isFinite(Date.parse(c.at)))
                throw Error();
            cursor = { at: c.at, id: uuid(c.id) };
        }
        catch {
            throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
        }
    }
    const status = o.status ?? null;
    if (status !== null && !['pending', 'sending', 'sent', 'failed', 'cancelled'].includes(String(status)))
        throw new NotificationError('NOTIFICATION_INVALID_TEMPLATE');
    return { limit: Number(limit), type: o.type === undefined ? null : validateType(o.type), status: status as NotificationStatus | null, cursor };
}
