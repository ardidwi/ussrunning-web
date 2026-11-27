import "server-only";
import { requirePermission } from "@/lib/authz/guards";
import { AuthorizationError } from "@/lib/authz/errors";
import { EventError, eventOperation } from "./event-errors";
import { EVENT_STATUSES } from "./event-policy";
import { CONTENT_KEYS, validateContent, filters, object, uuid, slug, version, invalid } from "./event-validation";
import { readPublic, readAdmin, listEvents, writeEvent } from "./event-repository";
import { resolveMediaAsset } from "@/lib/media/media-service";
import type { EventDTO, PublicEventDTO, EventPage, EventContent } from "./event-types";
async function publicDTO(dto: EventDTO): Promise<PublicEventDTO> {
    const { visibility: _visibility, coverMediaId: _cover, ...content } = validateContent(contentFrom(dto));
    let cover: PublicEventDTO["cover"] = null;
    // Defense in depth on top of the SQL filter: only public CMS media is ever serialized for public pages.
    if (dto.cover && dto.cover.purpose === 'cms' && dto.cover.visibility === 'public' && dto.cover.status === 'active') {
        const asset = await resolveMediaAsset(dto.cover);
        cover = asset.url ? { url: asset.url, altText: asset.altText, width: asset.width, height: asset.height } : null;
    }
    return { ...content, id: dto.id, status: dto.status, cover };
}
function authorized(value: {
    authorized: boolean;
}) { if (!value.authorized)
    throw new AuthorizationError('INSUFFICIENT_PERMISSION'); }
function contentFrom(dto: EventDTO): EventContent { return Object.fromEntries(CONTENT_KEYS.map(k => [k, dto[k]])) as unknown as EventContent; }
export async function getPublicEvent(value: unknown): Promise<PublicEventDTO> { return eventOperation(async () => { const row = await readPublic(slug(value)); if (!row)
    throw new EventError('EVENT_NOT_FOUND'); return await publicDTO(row); }); }
export async function getManagedEvent(value: unknown): Promise<EventDTO> { return eventOperation(async () => { const { account } = await requirePermission('events.manage'); const row = await readAdmin(account.id, uuid(value)); authorized(row); if (!row.data)
    throw new EventError('EVENT_NOT_FOUND'); return row.data; }); }
async function list(value: unknown, managed: boolean): Promise<EventPage<EventDTO>> {
    const actor = managed ? (await requirePermission('events.manage')).account.id : undefined;
    const f = filters(value, !managed), row = await listEvents(f, actor);
    authorized(row);
    const more = row.items.length > f.limit, items = row.items.slice(0, f.limit), last = items.at(-1);
    return { items, nextCursor: more && last ? Buffer.from(JSON.stringify({ startsAt: last.startsAt, id: last.id, eventType: f.eventType, status: f.status, upcoming: f.upcoming })).toString('base64url') : null };
}
export async function listPublicEvents(value: unknown = {}): Promise<EventPage<PublicEventDTO>> { return eventOperation(async () => { const page = await list(value, false); return { ...page, items: await Promise.all(page.items.map(publicDTO)) }; }); }
export async function listManagedEvents(value: unknown = {}): Promise<EventPage<EventDTO>> { return eventOperation(() => list(value, true)); }
function result(value: {
    code: string;
    id: string | null;
}) { if (value.code === 'INSUFFICIENT_PERMISSION')
    throw new AuthorizationError('INSUFFICIENT_PERMISSION'); if (value.code !== 'OK')
    throw new EventError(value.code as EventError['code']); return value.id!; }
export async function createEvent(value: unknown): Promise<EventDTO> { return eventOperation(async () => { const { account } = await requirePermission('events.manage'); const data = validateContent(value); return getManagedEvent(result(await writeEvent(account.id, data, null, null, null))); }); }
export async function updateEvent(value: unknown): Promise<EventDTO> {
    return eventOperation(async () => {
        const { account } = await requirePermission('events.manage'), v = object(value);
        if (Object.keys(v).sort().join(',') !== 'changes,expectedVersion,id')
            invalid();
        const id = uuid(v.id), token = version(v.expectedVersion), changes = object(v.changes);
        if (!Object.keys(changes).length || Object.keys(changes).some(k => !(CONTENT_KEYS as readonly string[]).includes(k) || k === 'slug'))
            invalid();
        const row = await readAdmin(account.id, id);
        authorized(row);
        if (!row.data)
            throw new EventError('EVENT_NOT_FOUND');
        if (row.data.version !== token)
            throw new EventError('EVENT_CONFLICT');
        const data = validateContent({ ...contentFrom(row.data), ...changes });
        return getManagedEvent(result(await writeEvent(account.id, data, id, token, null, Object.keys(changes))));
    });
}
export async function transitionEvent(value: unknown): Promise<EventDTO> {
    return eventOperation(async () => {
        const { account } = await requirePermission('events.manage'), v = object(value);
        if (Object.keys(v).sort().join(',') !== 'expectedVersion,id,status')
            invalid();
        if (!EVENT_STATUSES.includes(v.status as never))
            invalid();
        const existing = await readAdmin(account.id, uuid(v.id));
        authorized(existing);
        if (!existing.data)
            throw new EventError('EVENT_NOT_FOUND');
        if (v.status === 'published' || v.status === 'registration_open')
            validateContent(contentFrom(existing.data));
        const id = result(await writeEvent(account.id, null, uuid(v.id), version(v.expectedVersion), v.status as EventDTO['status']));
        return getManagedEvent(id);
    });
}
