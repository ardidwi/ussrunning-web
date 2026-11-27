import "server-only";
import { RegistrationError } from './registration-errors';
import { REGISTRATION_POLICY, REGISTRATION_STATES } from './registration-policy';
import type { RegistrationFilters } from './registration-types';
function bad(): never { throw new RegistrationError('REGISTRATION_VALIDATION_ERROR'); }
export function input(value: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
        bad();
    try {
        if (Buffer.byteLength(JSON.stringify(value)) > REGISTRATION_POLICY.maxInputBytes)
            bad();
    }
    catch {
        bad();
    }
    if (Object.keys(value).some(k => !keys.includes(k)))
        bad();
    return value as Record<string, unknown>;
}
export function uuid(value: unknown): string { if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    bad(); return value.toLowerCase(); }
export function booking(value: unknown) { const v = input(value, ['eventId']); return { eventId: uuid(v.eventId) }; }
export function cancellation(value: unknown) { const v = input(value, ['eventId', 'registrationId', 'expectedVersion']); if (typeof v.expectedVersion !== 'string' || !/^[0-9a-f]{64}$/.test(v.expectedVersion))
    bad(); return { eventId: uuid(v.eventId), registrationId: uuid(v.registrationId), expectedVersion: v.expectedVersion }; }
/** Optional for the generic managed action (backward compatible); the participants workspace requires it. */
export function reason(value: unknown, required: boolean): string | null {
    if (value === undefined || value === null || value === '') {
        if (required)
            bad();
        return null;
    }
    if (typeof value !== 'string')
        bad();
    const v = value.trim().replace(/\s+/g, ' ');
    if (v.length < 5 || v.length > REGISTRATION_POLICY.maxReasonLength || /[<>\x00-\x1f]/.test(v))
        bad();
    return v;
}
export function managedCancellation(value: unknown, requireReason: boolean) { const v = input(value, ['eventId', 'registrationId', 'expectedVersion', 'reason']); return { ...cancellation({ eventId: v.eventId, registrationId: v.registrationId, expectedVersion: v.expectedVersion }), reason: reason(v.reason, requireReason) }; }
export function participantExport(value: unknown) { const v = input(value, ['eventId', 'status']); if (v.status != null && !REGISTRATION_STATES.some(s => s === v.status))
    bad(); return { eventId: uuid(v.eventId), status: (v.status ?? null) as string | null }; }
export function detail(value: unknown) { const v = input(value, ['eventId', 'registrationId']); return { eventId: uuid(v.eventId), registrationId: uuid(v.registrationId) }; }
export function filters(value: unknown, scope: string, managed: boolean): RegistrationFilters {
    const v = input(value, ['eventId', 'limit', 'cursor', 'status']), limit = v.limit ?? REGISTRATION_POLICY.defaultLimit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > REGISTRATION_POLICY.maxLimit)
        bad();
    const eventId = v.eventId == null ? (managed ? bad() : null) : uuid(v.eventId);
    if (v.status != null && !REGISTRATION_STATES.some(s => s === v.status))
        bad();
    const status = (v.status ?? null) as RegistrationFilters['status'];
    let cursor: RegistrationFilters['cursor'] = null;
    if (v.cursor != null) {
        if (typeof v.cursor !== 'string' || v.cursor.length > REGISTRATION_POLICY.maxCursorBytes || !/^[A-Za-z0-9_-]+$/.test(v.cursor))
            bad();
        try {
            const bytes = Buffer.from(v.cursor, 'base64url');
            if (bytes.toString('base64url') !== v.cursor)
                bad();
            const c = input(JSON.parse(bytes.toString()), ['at', 'id', 'scope', 'eventId', 'status']);
            if (c.scope !== scope || c.eventId !== eventId || c.status !== status || typeof c.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(c.at) || !Number.isFinite(Date.parse(c.at)) || new Date(c.at).toISOString().slice(0, 19) !== c.at.slice(0, 19))
                bad();
            cursor = { at: c.at as string, id: uuid(c.id) };
        }
        catch {
            bad();
        }
    }
    return { limit: Number(limit), eventId, status, cursor };
}
export function cursor(value: Record<string, unknown>): string { return Buffer.from(JSON.stringify(value)).toString('base64url'); }
