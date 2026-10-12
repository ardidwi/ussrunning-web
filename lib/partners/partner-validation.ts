import 'server-only';
import { PartnerError } from './partner-errors';
import type { PartnerContent, PartnerFilter, PartnerType, PartnerStatus, RelationContent, Placement } from './partner-types';
export const PARTNER_FIELDS = ['name', 'description', 'websiteUrl', 'logoMediaId', 'type', 'tier', 'visibility', 'isGlobal', 'activeFrom', 'activeUntil'] as const;
export const PARTNER_LIMITS = { name: 240, description: 4000, url: 2048, tier: 40, page: 100, eventRelations: 100 } as const;
export const PLACEMENTS = ['event_page', 'event_pass', 'sponsor_section'] as const;
export function invalid(): never { throw new PartnerError('PARTNER_INVALID_INPUT'); }
export function object(value: unknown, keys: readonly string[]) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        invalid();
    const v = value as Record<string, unknown>;
    if (Object.keys(v).some(k => !keys.includes(k)))
        invalid();
    return v;
}
export function uuid(v: unknown): string {
    if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
        invalid();
    return v;
}
export function version(v: unknown) {
    if (!Number.isInteger(v) || Number(v) < 1 || Number(v) > 2147483647)
        invalid();
    return Number(v);
}
export function plain(v: unknown, max: number, optional = false): string | null {
    if (optional && (v === null || v === undefined || v === ''))
        return null;
    if (typeof v !== 'string' || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
        throw new PartnerError('PARTNER_INVALID_CONTENT');
    const t = v.trim();
    if (!t && !optional)
        throw new PartnerError('PARTNER_INVALID_CONTENT');
    return t || null;
}
export function slugBase(title: string) { return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '') || 'partner'; }
export function slug(v: unknown): string {
    if (typeof v !== 'string' || v.length > 140 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))
        invalid();
    return v;
}
export function publicationDate(v: unknown): string {
    if (typeof v !== 'string' || v.length > 40 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v)))
        invalid();
    const [year, month, day] = v.slice(0, 10).split('-').map(Number), calendar = new Date(v.slice(0, 10) + 'T00:00:00Z');
    if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() + 1 !== month || calendar.getUTCDate() !== day || Number(v.slice(11, 13)) > 23)
        invalid();
    return new Date(v).toISOString();
}
export function website(v: unknown): string | null { if (v == null || v === '')
    return null; if (typeof v !== 'string' || v.length > PARTNER_LIMITS.url || /[<>\x00-\x20]/.test(v))
    throw new PartnerError('PARTNER_URL_INVALID'); try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || u.username || u.password || !u.hostname)
        throw Error();
    return u.href;
}
catch {
    throw new PartnerError('PARTNER_URL_INVALID');
} }
export function tier(v: unknown) { if (v == null || v === '')
    return null; if (typeof v !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,39}$/.test(v))
    invalid(); return v; }
export function dates(v: Record<string, unknown>) { const activeFrom = v.activeFrom == null ? null : publicationDate(v.activeFrom), activeUntil = v.activeUntil == null ? null : publicationDate(v.activeUntil); if (activeFrom && activeUntil && Date.parse(activeUntil) < Date.parse(activeFrom))
    invalid(); return { activeFrom, activeUntil }; }
export function content(value: unknown): PartnerContent { const v = object(value, PARTNER_FIELDS), type = v.type ?? 'partner', visibility = v.visibility ?? 'private'; if (!['partner', 'sponsor', 'collaborator'].includes(type as string) || !['public', 'private'].includes(visibility as string) || (v.isGlobal !== undefined && typeof v.isGlobal !== 'boolean'))
    invalid(); return { name: plain(v.name, PARTNER_LIMITS.name)!, description: plain(v.description, PARTNER_LIMITS.description, true), websiteUrl: website(v.websiteUrl), logoMediaId: v.logoMediaId == null ? null : uuid(v.logoMediaId), type: type as PartnerType, tier: tier(v.tier), visibility: visibility as PartnerContent['visibility'], isGlobal: (v.isGlobal ?? false) as boolean, ...dates(v) }; }
export function relation(value: unknown): RelationContent { const v = object(value, ['tier', 'placement', 'activeFrom', 'activeUntil']), placement = v.placement ?? 'event_page'; if (!PLACEMENTS.includes(placement as Placement))
    invalid(); return { tier: tier(v.tier), placement: placement as Placement, ...dates(v) }; }
export function filters(value: unknown = {}, managed = false): PartnerFilter { const v = object(value, managed ? ['limit', 'cursor', 'status', 'type'] : ['limit', 'cursor', 'type']), limit = v.limit ?? 20, status = v.status ?? null, type = v.type ?? null; if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > PARTNER_LIMITS.page)
    invalid(); if (status !== null && !['draft', 'active', 'inactive', 'archived'].includes(status as string))
    invalid(); if (type !== null && !['partner', 'sponsor', 'collaborator'].includes(type as string))
    invalid(); const scope = JSON.stringify([managed, status, type]); let cursor: PartnerFilter['cursor'] = null; if (v.cursor != null) {
    try {
        if (typeof v.cursor !== 'string' || v.cursor.length > 1024)
            invalid();
        const c = JSON.parse(Buffer.from(v.cursor, 'base64url').toString());
        if (c.scope !== scope)
            invalid();
        const id = uuid(c.id);
        if (managed) {
            publicationDate(c.date);
            cursor = { date: c.date, id };
        }
        else {
            if (!Number.isInteger(c.order) || c.order < 0 || c.order > 2147483647)
                invalid();
            cursor = { order: c.order, id };
        }
    }
    catch {
        invalid();
    }
} return { limit: Number(limit), status: status as PartnerStatus | null, type: type as PartnerType | null, cursor, scope }; }
