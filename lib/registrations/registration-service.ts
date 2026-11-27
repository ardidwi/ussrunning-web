import "server-only";
import { requireActiveAccount } from "@/lib/auth/guards";
import { requirePermission } from "@/lib/authz/guards";
import { AuthorizationError } from "@/lib/authz/errors";
import { RegistrationError, registrationOperation } from './registration-errors';
import type { RegistrationCode } from './registration-errors';
import { booking, cancellation, detail, filters, cursor, managedCancellation, participantExport } from './registration-validation';
import { mutateRegistration, readRegistration, listRegistrations, readParticipantIdentities, exportParticipants } from './registration-repository';
import type { RegistrationDTO, ManagedRegistrationDTO, RegistrationPage, ParticipantDTO, ParticipantExport } from './registration-types';
import { REGISTRATION_POLICY } from './registration-policy';
import { csvDocument } from './participant-csv';
function own({ accountId: _owner, ...dto }: ManagedRegistrationDTO): RegistrationDTO { return dto; }
async function actor(managed: boolean) { return managed ? (await requirePermission('events.manage')).account : await requireActiveAccount(); }
function permission(value: {
    authorized: boolean;
}) { if (!value.authorized)
    throw new AuthorizationError('INSUFFICIENT_PERMISSION'); }
function mutation(value: {
    code: string;
    data: ManagedRegistrationDTO | null;
}) { if (value.code === 'INSUFFICIENT_PERMISSION')
    throw new AuthorizationError('INSUFFICIENT_PERMISSION'); if (value.code !== 'OK')
    throw new RegistrationError(value.code as RegistrationCode); if (!value.data)
    throw new RegistrationError('REGISTRATION_UNAVAILABLE'); return value.data; }
export async function registerOwnEvent(value: unknown): Promise<RegistrationDTO> { return registrationOperation(async () => { const a = await actor(false), v = booking(value); return own(mutation(await mutateRegistration(a.id, v.eventId, null, false, 'register'))); }); }
export async function cancelOwnRegistration(value: unknown): Promise<RegistrationDTO> { return registrationOperation(async () => { const a = await actor(false), v = cancellation(value); return own(mutation(await mutateRegistration(a.id, v.eventId, v.registrationId, false, 'cancel', v.expectedVersion))); }); }
export async function cancelManagedRegistration(value: unknown, requireReason = false): Promise<ManagedRegistrationDTO> { return registrationOperation(async () => { const a = await actor(true), v = managedCancellation(value, requireReason); return mutation(await mutateRegistration(a.id, v.eventId, v.registrationId, true, 'cancel', v.expectedVersion, v.reason)); }); }
/** D2.5 staff cancellation from the participants workspace: a reason is mandatory and stored in the audit record only. */
export async function cancelParticipantRegistration(value: unknown): Promise<ManagedRegistrationDTO> { return cancelManagedRegistration(value, true); }
async function read(value: unknown, managed: boolean) { const a = await actor(managed), v = detail(value), row = await readRegistration(a.id, managed, v.eventId, v.registrationId); permission(row); if (!row.data)
    throw new RegistrationError('REGISTRATION_NOT_FOUND'); return row.data; }
export async function getOwnRegistration(value: unknown): Promise<RegistrationDTO> { return registrationOperation(async () => own(await read(value, false))); }
export async function getManagedRegistration(value: unknown): Promise<ManagedRegistrationDTO> { return registrationOperation(() => read(value, true)); }
async function list(value: unknown, managed: boolean): Promise<RegistrationPage<ManagedRegistrationDTO>> {
    const a = await actor(managed), scope = managed ? 'managed:' + a.id : 'own:' + a.id, f = filters(value, scope, managed), row = await listRegistrations(a.id, managed, f);
    permission(row);
    const items = row.items.slice(0, f.limit), last = items.at(-1);
    return { items, nextCursor: row.items.length > f.limit && last ? cursor({ at: last.registeredAt, id: last.id, scope, eventId: f.eventId, status: f.status }) : null };
}
export async function listOwnRegistrations(value: unknown = {}): Promise<RegistrationPage<RegistrationDTO>> { return registrationOperation(async () => { const page = await list(value, false); return { ...page, items: page.items.map(own) }; }); }
export async function listManagedRegistrations(value: unknown): Promise<RegistrationPage<ManagedRegistrationDTO>> { return registrationOperation(() => list(value, true)); }

/** D2.5 participants page: the managed registration page (same filters/cursor as getEventRegistrations) plus staff identity. */
export async function listEventParticipants(value: unknown): Promise<RegistrationPage<ParticipantDTO>> {
    return registrationOperation(async () => {
        const page = await list(value, true);
        if (!page.items.length) return { items: [], nextCursor: page.nextCursor };
        const a = await actor(true), eventId = page.items[0].event.id, identities = await readParticipantIdentities(a.id, eventId, page.items.map(r => r.id));
        permission(identities);
        const byId = new Map(identities.items.map(i => [i.registration_id, i]));
        return { nextCursor: page.nextCursor, items: page.items.map(r => { const i = byId.get(r.id); return { ...r, participant: { displayName: i?.display_name ?? null, memberId: i?.member_id ?? null, email: i?.email ?? null, checkedInAt: i?.checked_in_at ?? null, passStatus: (i?.pass_status ?? null) as ParticipantDTO['participant']['passStatus'] } }; }) };
    });
}
export const PARTICIPANT_CSV_HEADER = ['member_id', 'name', 'email', 'registration_status', 'registered_at_utc', 'cancelled_at_utc', 'checked_in_at_utc', 'event_pass_status'] as const;
/** D2.5 bounded, permission-checked, audited CSV export. Cells are CSV-injection safe. */
export async function exportEventParticipants(value: unknown): Promise<ParticipantExport> {
    return registrationOperation(async () => {
        const a = await actor(true), v = participantExport(value), max = REGISTRATION_POLICY.maxExportRows, row = await exportParticipants(a.id, v.eventId, v.status, max);
        permission(row);
        if (!row.found) throw new RegistrationError('REGISTRATION_NOT_AVAILABLE');
        const items = row.items.slice(0, max);
        const csv = csvDocument(PARTICIPANT_CSV_HEADER, items.map(i => [i.member_id, i.display_name, i.email, i.status, i.registered_at, i.cancelled_at, i.checked_in_at, i.pass_status]));
        return { filename: `participants-${v.eventId.slice(0, 8)}${v.status ? '-' + v.status : ''}.csv`, csv, rowCount: items.length, truncated: row.items.length > max, maxRows: max };
    });
}
