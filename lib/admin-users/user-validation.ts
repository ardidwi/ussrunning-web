import 'server-only';
import { createHash } from 'node:crypto';
import { isSystemRole } from '@/lib/authz/permissions';
import { USER_POLICY } from './user-types';
import type { UserFilters } from './user-types';
import { UserError } from './user-errors';
const statuses = ['pending_verification', 'active', 'suspended', 'deactivated'] as const;
const bad = () => { throw new UserError('USER_SEARCH_INVALID'); };
function object(value: unknown, keys: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return bad();
    try {
        if (Buffer.byteLength(JSON.stringify(value)) > USER_POLICY.maxInputBytes)
            return bad();
    }
    catch {
        return bad();
    }
    if (Object.keys(value).some(k => !keys.includes(k)))
        return bad();
    return value as Record<string, unknown>;
}
export function uuid(v: unknown): string { if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
    return bad(); return v.toLowerCase(); }
function date(v: unknown): string | null { if (v === undefined)
    return null; if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(v) || !Number.isFinite(Date.parse(v)))
    return bad(); if (new Date(v.slice(0, 10) + 'T00:00:00Z').toISOString().slice(0, 10) !== v.slice(0, 10))
    return bad(); return new Date(v).toISOString(); }
function text(v: unknown, max: number): string | null { if (v === undefined)
    return null; if (typeof v !== 'string' || !v.trim() || v.length > max || /[<>\u0000-\u001f\u007f]/.test(v))
    return bad(); return v.trim(); }
export function userFilters(value: unknown): UserFilters {
    const v = object(value, ['limit', 'status', 'verified', 'role', 'search', 'memberId', 'createdFrom', 'createdTo', 'cursor']);
    const limit = v.limit ?? USER_POLICY.defaultLimit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > USER_POLICY.maxLimit)
        return bad();
    if (v.status !== undefined && !statuses.includes(v.status as typeof statuses[number]))
        return bad();
    if (v.verified !== undefined && typeof v.verified !== 'boolean')
        return bad();
    if (v.role !== undefined && !isSystemRole(v.role))
        return bad();
    const f: UserFilters = { limit: Number(limit), status: v.status as UserFilters['status'] ?? null, verified: v.verified as boolean ?? null, role: v.role as UserFilters['role'] ?? null,
        search: text(v.search, USER_POLICY.maxSearch), memberId: text(v.memberId, 40), createdFrom: date(v.createdFrom), createdTo: date(v.createdTo), cursor: null, fingerprint: '' };
    if (f.memberId && !/^USS-[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(f.memberId))
        return bad();
    f.memberId = f.memberId?.toUpperCase() ?? null;
    if (f.search && f.search.length < 3)
        return bad();
    if ((f.createdFrom === null) !== (f.createdTo === null))
        return bad();
    if (f.createdFrom && f.createdTo && (f.createdFrom > f.createdTo || Date.parse(f.createdTo) - Date.parse(f.createdFrom) > USER_POLICY.maxDays * 86400000))
        return bad();
    f.fingerprint = createHash('sha256').update(JSON.stringify([f.status, f.verified, f.role, f.search, f.memberId, f.createdFrom, f.createdTo])).digest('hex');
    if (v.cursor !== undefined) {
        if (typeof v.cursor !== 'string' || v.cursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(v.cursor))
            return bad();
        try {
            const c = object(JSON.parse(Buffer.from(v.cursor, 'base64url').toString('utf8')), ['at', 'id', 'fingerprint']);
            if (c.fingerprint !== f.fingerprint)
                return bad();
            const at = date(c.at);
            if (!at)
                return bad();
            f.cursor = { at: c.at as string, id: uuid(c.id) };
        }
        catch {
            return bad();
        }
    }
    return f;
}
export function userRef(value: unknown) { const v = object(value, ['id']); return { id: uuid(v.id) }; }
export function userMutation(value: unknown) {
    try {
        const v = object(value, ['id', 'expectedVersion', 'reason']);
        if (!Number.isSafeInteger(v.expectedVersion) || Number(v.expectedVersion) < 1 || Number(v.expectedVersion) > 2147483646)
            throw new Error();
        const reason = text(v.reason, 500);
        if (!reason || reason.length < 5)
            throw new Error();
        return { id: uuid(v.id), expectedVersion: Number(v.expectedVersion), reason };
    }
    catch {
        throw new UserError('USER_INVALID_INPUT');
    }
}
