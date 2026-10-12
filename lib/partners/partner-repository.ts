import 'server-only';
import { getSql, query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { PartnerRecord, PartnerFilter, RelationRecord } from './partner-types';
const roles = rolesForPermission('partners.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const utc = (c: string) => `to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const mediaProjection = `CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object('id',m.id,'storageKey',m.storage_key,'storageProvider',m.storage_provider,'publicUrl',m.public_url,'mimeType',m.mime_type,'sizeBytes',m.byte_size,'width',m.width,'height',m.height,'altText',m.alt_text,'caption',m.caption,'status',m.status,'visibility',m.visibility,'version',m.version,'createdAt',${utc('m.created_at')},'updatedAt',${utc('m.updated_at')}) END`;
const projection = `jsonb_build_object('id',p.id,'slug',p.slug,'name',p.name,'description',p.description,'websiteUrl',p.website_url,'logoMediaId',p.logo_media_id,'type',p.partner_type,'tier',p.tier,'visibility',p.visibility,'isGlobal',p.is_global,'activeFrom',${utc('p.active_from')},'activeUntil',${utc('p.active_until')},'status',p.status,'version',p.version,'sortOrder',p.sort_order,'createdAt',${utc('p.created_at')},'updatedAt',${utc('p.updated_at')},'media',${mediaProjection})`;
const eligible = `p.status='active' AND p.visibility='public' AND p.archived_at IS NULL AND (p.active_from IS NULL OR p.active_from<=statement_timestamp()) AND (p.active_until IS NULL OR p.active_until>statement_timestamp()) AND m.status='active' AND m.visibility='public' AND m.mime_type=ANY(ARRAY['image/jpeg','image/png','image/webp'])`;
export async function readPartner(key: string, actor?: string) { return (await query<{
    authorized: boolean;
    data: PartnerRecord | null;
}>(`WITH authority AS (${authority}) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,(SELECT ${projection} FROM uss.partners p LEFT JOIN uss.media_assets m ON m.id=p.logo_media_id WHERE ${actor ? 'p.id=$3::uuid AND EXISTS(SELECT 1 FROM authority)' : `p.slug=$3 AND ${eligible}`}) data`, [actor ?? null, roles, key]))[0]; }
export async function listPartners(f: PartnerFilter, actor?: string) { const order = actor ? 'p.created_at DESC,p.id DESC' : 'p.sort_order,p.id', cursor = 'CASE WHEN $9::boolean THEN (p.created_at,p.id)<($5::timestamptz,$6::uuid) ELSE (p.sort_order,p.id)>($8::int,$6::uuid) END'; return (await query<{
    authorized: boolean;
    items: PartnerRecord[];
}>(`WITH authority AS (${authority}),page AS(SELECT ${projection} data,p.created_at,p.sort_order,p.id FROM uss.partners p LEFT JOIN uss.media_assets m ON m.id=p.logo_media_id WHERE ${actor ? 'EXISTS(SELECT 1 FROM authority)' : `p.is_global AND ${eligible}`} AND ($3::text IS NULL OR p.status=$3) AND ($4::text IS NULL OR p.partner_type=$4) AND ($6::uuid IS NULL OR ${cursor}) ORDER BY ${order} LIMIT $7) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,COALESCE((SELECT jsonb_agg(data ORDER BY ${actor ? 'created_at DESC,id DESC' : 'sort_order,id'}) FROM page),'[]') items`, [actor ?? null, roles, f.status, f.type, f.cursor?.date ?? null, f.cursor?.id ?? null, f.limit + 1, f.cursor?.order ?? null, Boolean(actor)]))[0]; }
const relationProjection = `jsonb_build_object('id',r.id,'eventId',r.event_id,'partnerId',r.partner_id,'status',r.status,'version',r.version,'sortOrder',r.position,'tier',r.tier,'placement',r.placement,'activeFrom',${utc('r.active_from')},'activeUntil',${utc('r.active_until')},'partner',${projection})`;
const eventPublic = `e.visibility='public' AND e.archived_at IS NULL AND e.status NOT IN ('draft','cancelled','archived')`;
export async function readRelations(eventId: string, actor: string | undefined, limit: number, after: {
    order: number;
    id: string;
} | null, status: string | null = null) { return (await query<{
    authorized: boolean;
    found: boolean;
    items: RelationRecord[];
}>(`WITH authority AS (${authority}),event AS(SELECT id FROM uss.events e WHERE e.id=$3 AND ${actor ? 'EXISTS(SELECT 1 FROM authority)' : eventPublic}),page AS(SELECT ${relationProjection} data,r.position,r.id FROM uss.event_partners r JOIN uss.partners p ON p.id=r.partner_id LEFT JOIN uss.media_assets m ON m.id=p.logo_media_id WHERE r.event_id=(SELECT id FROM event) AND ${actor ? 'true' : `r.status='active' AND (r.active_from IS NULL OR r.active_from<=statement_timestamp()) AND (r.active_until IS NULL OR r.active_until>statement_timestamp()) AND ${eligible}`} AND ($4::text IS NULL OR r.status=$4) AND ($5::int IS NULL OR (r.position,r.id)>($5::int,$6::uuid)) ORDER BY r.position,r.id LIMIT $7) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,EXISTS(SELECT 1 FROM event) found,COALESCE((SELECT jsonb_agg(data ORDER BY position,id) FROM page),'[]') items`, [actor ?? null, roles, eventId, status, after?.order ?? null, after?.id ?? null, limit + 1]))[0]; }
export async function readRelation(eventId: string, id: string, actor: string, byPartner = false) { return (await query<{
    authorized: boolean;
    data: RelationRecord | null;
}>(`WITH authority AS (${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,(SELECT ${relationProjection} FROM uss.event_partners r JOIN uss.partners p ON p.id=r.partner_id LEFT JOIN uss.media_assets m ON m.id=p.logo_media_id WHERE r.event_id=$3 AND r.${byPartner ? 'partner_id' : 'id'}=$4 AND EXISTS(SELECT 1 FROM authority)) data`, [actor, roles, eventId, id]))[0]; }
export async function writePartner(actor: string, id: string, op: string, expected: number | null, payload: Record<string, unknown>, base: string | null) { const sql = getSql(), r = await sql.transaction([sql.query('SELECT uss.mutate_partner($1::uuid,$2::uuid,$3::text,$4::int,$5::jsonb,$6::text) code', [actor, id, op, expected, JSON.stringify(payload), base])], { isolationLevel: 'ReadCommitted' }); return (r[0] as {
    code: string;
}[])[0]; }
export async function writeRelation(actor: string, eventId: string, op: string, payload: Record<string, unknown>) { const sql = getSql(), r = await sql.transaction([sql.query('SELECT uss.mutate_sponsorship($1::uuid,$2::uuid,$3::text,$4::jsonb) code', [actor, eventId, op, JSON.stringify(payload)])], { isolationLevel: 'ReadCommitted' }); return (r[0] as {
    code: string;
}[])[0]; }
