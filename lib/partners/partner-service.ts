import 'server-only';
import { randomUUID } from 'node:crypto';
import { requirePermission } from '@/lib/authz/guards';
import { resolveMediaAsset } from '@/lib/media/media-service';
import { PartnerError, partnerOperation } from './partner-errors';
import { object, uuid, version, plain, slug, slugBase, content, relation, filters, PARTNER_FIELDS, PARTNER_LIMITS } from './partner-validation';
import { readPartner, listPartners, writePartner, readRelations, readRelation, writeRelation } from './partner-repository';
import type { PartnerContent, PartnerRecord, ManagedPartner, PublicPartner, RelationRecord, ManagedSponsorship, PublicSponsorship, PartnerPage } from './partner-types';
function allowed(r: {
    authorized: boolean;
}) { if (!r.authorized)
    throw new PartnerError('PARTNER_FORBIDDEN'); }
function checked(r: {
    code: string;
}) { if (r.code !== 'OK')
    throw new PartnerError(r.code as PartnerError['code']); }
function fields(r: PartnerContent) { return Object.fromEntries(PARTNER_FIELDS.map(k => [k, r[k]])); }
async function managed(r: PartnerRecord): Promise<ManagedPartner> { const { media, ...dto } = r; return { ...dto, ...content(fields(r)), logo: media ? await resolveMediaAsset(media) : null }; }
async function publicDto(r: PartnerRecord): Promise<PublicPartner> { const c = content(fields(r)); return { slug: r.slug, name: c.name, description: c.description, websiteUrl: c.websiteUrl, type: c.type, tier: c.tier, sortOrder: r.sortOrder, logo: r.media ? await resolveMediaAsset(r.media) : null }; }
async function managedRelation(r: RelationRecord): Promise<ManagedSponsorship> { return { ...r, ...relation({ tier: null, placement: r.placement, activeFrom: r.activeFrom, activeUntil: r.activeUntil }), tier: r.tier == null ? null : plain(r.tier, 120, false), partner: await managed(r.partner) }; }
async function publicRelation(r: RelationRecord): Promise<PublicSponsorship> { const c = relation({ tier: r.tier, placement: r.placement, activeFrom: r.activeFrom, activeUntil: r.activeUntil }); return { tier: c.tier ?? r.partner.tier, placement: c.placement, sortOrder: r.sortOrder, partner: await publicDto(r.partner) }; }
export async function getManagedPartner(value: unknown): Promise<ManagedPartner> { return partnerOperation(async () => { const a = await requirePermission('partners.manage'), v = object(value, ['id']), r = await readPartner(uuid(v.id), a.account.id); allowed(r); if (!r.data)
    throw new PartnerError('PARTNER_NOT_FOUND'); return managed(r.data); }); }
export async function getPublicPartnerBySlug(v: unknown): Promise<PublicPartner> { return partnerOperation(async () => { const r = await readPartner(slug(v)); if (!r.data)
    throw new PartnerError('PARTNER_NOT_FOUND'); return publicDto(r.data); }); }
function list(v: unknown, managedRead: true): Promise<PartnerPage<ManagedPartner>>;
function list(v: unknown, managedRead: false): Promise<PartnerPage<PublicPartner>>;
async function list(v: unknown, managedRead: boolean) { const a = managedRead ? (await requirePermission('partners.manage')).account.id : undefined, f = filters(v, managedRead), r = await listPartners(f, a); allowed(r); const page = r.items.slice(0, f.limit), last = page.at(-1); return { items: await Promise.all(page.map(x => managedRead ? managed(x) : publicDto(x))), nextCursor: r.items.length > f.limit && last ? Buffer.from(JSON.stringify({ scope: f.scope, id: last.id, ...(managedRead ? { date: last.createdAt } : { order: last.sortOrder }) })).toString('base64url') : null }; }
export async function listManagedPartners(v: unknown = {}) { return partnerOperation(() => list(v, true)); }
export async function listPublicPartners(v: unknown = {}) { return partnerOperation(() => list(v, false)); }
async function mutate(id: string, op: string, expected: number | null, payload: Record<string, unknown>, base: string | null = null) { const a = await requirePermission('partners.manage'); checked(await writePartner(a.account.id, id, op, expected, payload, base)); return getManagedPartner({ id }); }
export async function createPartner(v: unknown) { return partnerOperation(async () => { await requirePermission('partners.manage'); const c = content(v); return mutate(randomUUID(), 'create', null, c, slugBase(c.name)); }); }
export async function updatePartner(v: unknown) { return partnerOperation(async () => { const x = object(v, ['id', 'expectedVersion', 'changes']), id = uuid(x.id), expected = version(x.expectedVersion), patch = object(x.changes, PARTNER_FIELDS); if (!Object.keys(patch).length)
    throw new PartnerError('PARTNER_INVALID_INPUT'); const row = await getManagedPartner({ id }); return mutate(id, 'update', expected, content({ ...fields(row), ...patch })); }); }
async function transition(v: unknown, op: string) { return partnerOperation(async () => { const x = object(v, ['id', 'expectedVersion']), id = uuid(x.id); if (op === 'activate') {
    const r = await getManagedPartner({ id });
    content(fields(r));
} return mutate(id, op, version(x.expectedVersion), {}); }); }
export async function activatePartner(v: unknown) { return transition(v, 'activate'); }
export async function deactivatePartner(v: unknown) { return transition(v, 'deactivate'); }
export async function archivePartner(v: unknown) { return transition(v, 'archive'); }
export async function getManagedEventPartner(v: unknown) { return partnerOperation(async () => { const a = await requirePermission('partners.manage'), x = object(v, ['eventId', 'relationId']), r = await readRelation(uuid(x.eventId), uuid(x.relationId), a.account.id); allowed(r); if (!r.data)
    throw new PartnerError('PARTNER_RELATION_CONFLICT'); return managedRelation(r.data); }); }
async function relationMutation(v: unknown, op: 'attach' | 'update' | 'detach') {
    return partnerOperation(async () => {
        const a = await requirePermission('partners.manage'), x = object(v, op === 'attach' ? ['eventId', 'partnerId', 'tier', 'placement', 'activeFrom', 'activeUntil'] : op === 'update' ? ['eventId', 'relationId', 'expectedVersion', 'changes'] : ['eventId', 'relationId', 'expectedVersion']), eventId = uuid(x.eventId);
        let payload: Record<string, unknown>;
        if (op === 'attach')
            payload = { partnerId: uuid(x.partnerId), ...relation({ tier: x.tier, placement: x.placement, activeFrom: x.activeFrom, activeUntil: x.activeUntil }) };
        else {
            const id = uuid(x.relationId), expected = version(x.expectedVersion);
            payload = { relationId: id, expectedVersion: expected };
            if (op === 'update') {
                const patch = object(x.changes, ['tier', 'placement', 'activeFrom', 'activeUntil']);
                if (!Object.keys(patch).length)
                    throw new PartnerError('PARTNER_INVALID_INPUT');
                const r = await readRelation(eventId, id, a.account.id);
                allowed(r);
                if (!r.data)
                    throw new PartnerError('PARTNER_RELATION_CONFLICT');
                payload = { ...payload, ...relation({ tier: r.data.tier, placement: r.data.placement, activeFrom: r.data.activeFrom, activeUntil: r.data.activeUntil, ...patch }) };
            }
        }
        checked(await writeRelation(a.account.id, eventId, op, payload));
        const r = await readRelation(eventId, op === 'attach' ? String(payload.partnerId) : String(payload.relationId), a.account.id, op === 'attach');
        allowed(r);
        if (!r.data)
            throw new PartnerError('PARTNER_RELATION_CONFLICT');
        return managedRelation(r.data);
    });
}
export async function attachPartnerToEvent(v: unknown) { return relationMutation(v, 'attach'); }
export async function updateEventPartner(v: unknown) { return relationMutation(v, 'update'); }
export async function detachPartnerFromEvent(v: unknown) { return relationMutation(v, 'detach'); }
export async function reorderEventPartners(v: unknown) { return partnerOperation(async () => { const a = await requirePermission('partners.manage'), x = object(v, ['eventId', 'relations']), eventId = uuid(x.eventId); if (!Array.isArray(x.relations) || x.relations.length > PARTNER_LIMITS.eventRelations)
    throw new PartnerError('PARTNER_INVALID_INPUT'); const relations = x.relations.map(v => { const r = object(v, ['id', 'expectedVersion']); return { id: uuid(r.id), expectedVersion: version(r.expectedVersion) }; }); checked(await writeRelation(a.account.id, eventId, 'reorder', { relations })); return { eventId, code: 'PARTNER_REORDERED' as const }; }); }
function eventList(v: unknown, managedRead: true): Promise<PartnerPage<ManagedSponsorship>>;
function eventList(v: unknown, managedRead: false): Promise<PartnerPage<PublicSponsorship>>;
async function eventList(v: unknown, managedRead: boolean) { const a = managedRead ? (await requirePermission('partners.manage')).account.id : undefined, x = object(v, managedRead ? ['eventId', 'limit', 'cursor', 'status'] : ['eventId', 'limit', 'cursor']), eventId = uuid(x.eventId), limit = x.limit ?? 20, status = x.status ?? null; if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > PARTNER_LIMITS.page || (status !== null && !['active', 'inactive'].includes(status as string)))
    throw new PartnerError('PARTNER_INVALID_INPUT'); const scope = JSON.stringify([managedRead, eventId, status]); let after: {
    order: number;
    id: string;
} | null = null; if (x.cursor != null) {
    try {
        if (typeof x.cursor !== 'string' || x.cursor.length > 1024)
            throw Error();
        const c = JSON.parse(Buffer.from(x.cursor, 'base64url').toString());
        if (c.scope !== scope || !Number.isInteger(c.order) || c.order < 0 || c.order > 2147483647)
            throw Error();
        after = { order: c.order, id: uuid(c.id) };
    }
    catch {
        throw new PartnerError('PARTNER_INVALID_INPUT');
    }
} const r = await readRelations(eventId, a, Number(limit), after, status as string | null); allowed(r); if (!r.found)
    throw new PartnerError('PARTNER_EVENT_NOT_FOUND'); const page = r.items.slice(0, Number(limit)), last = page.at(-1); return { items: await Promise.all(page.map(x => managedRead ? managedRelation(x) : publicRelation(x))), nextCursor: r.items.length > Number(limit) && last ? Buffer.from(JSON.stringify({ scope, order: last.sortOrder, id: last.id })).toString('base64url') : null }; }
export async function listManagedEventPartners(v: unknown) { return partnerOperation(() => eventList(v, true)); }
export async function listEventPartners(v: unknown) { return partnerOperation(() => eventList(v, false)); }
