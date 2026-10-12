import 'server-only';
import { getSql, query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { GalleryRecord, GalleryFilters, ItemRecord } from './gallery-types';
const roles = rolesForPermission('cms.content.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const utc = (c: string) => `to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const mediaProjection = `CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object('id',m.id,'storageKey',m.storage_key,'storageProvider',m.storage_provider,'publicUrl',m.public_url,'mimeType',m.mime_type,'sizeBytes',m.byte_size,'width',m.width,'height',m.height,'altText',m.alt_text,'caption',m.caption,'status',m.status,'visibility',m.visibility,'version',m.version,'createdAt',${utc('m.created_at')},'updatedAt',${utc('m.updated_at')}) END`;
const projection = `jsonb_build_object('id',g.id,'slug',g.slug,'title',g.title,'description',g.description,'visibility',g.visibility,'eventId',g.event_id,'coverMediaId',g.cover_media_id,'status',g.status,'version',g.version,'createdAt',${utc('g.created_at')},'updatedAt',${utc('g.updated_at')},'publishedAt',${utc('g.published_at')},'media',${mediaProjection})`;
const eligible = `g.status='published' AND g.visibility='public' AND g.published_at<=statement_timestamp() AND g.archived_at IS NULL
 AND (g.cover_media_id IS NULL OR (m.status='active' AND m.visibility='public' AND m.mime_type=ANY(ARRAY['image/jpeg','image/png','image/webp'])))
 AND (g.event_id IS NULL OR EXISTS(SELECT 1 FROM uss.events WHERE id=g.event_id AND visibility='public' AND status NOT IN ('draft','cancelled','archived')))
 AND EXISTS(SELECT 1 FROM uss.gallery_items WHERE gallery_id=g.id AND removed_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM uss.gallery_items i JOIN uss.media_assets a ON a.id=i.media_asset_id WHERE i.gallery_id=g.id AND i.removed_at IS NULL AND (a.status<>'active' OR a.visibility<>'public' OR a.mime_type NOT IN ('image/jpeg','image/png','image/webp')))`;
export async function readGallery(key: string, actor?: string) { return (await query<{
    authorized: boolean;
    data: GalleryRecord | null;
}>(`WITH authority AS (${authority}) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,(SELECT ${projection} FROM uss.galleries g LEFT JOIN uss.media_assets m ON m.id=g.cover_media_id WHERE ${actor ? 'g.id=$3::uuid AND EXISTS(SELECT 1 FROM authority)' : `g.slug=$3 AND ${eligible}`}) data`, [actor ?? null, roles, key]))[0]; }
export async function listGalleries(f: GalleryFilters, actor?: string) { const order = actor ? 'g.created_at' : 'g.published_at'; return (await query<{
    authorized: boolean;
    items: GalleryRecord[];
}>(`WITH authority AS (${authority}),page AS(SELECT ${projection} data,${order} date,g.id FROM uss.galleries g LEFT JOIN uss.media_assets m ON m.id=g.cover_media_id WHERE ${actor ? 'EXISTS(SELECT 1 FROM authority)' : eligible} AND ($3::text IS NULL OR g.status=$3) AND ($4::text IS NULL OR g.visibility=$4) AND ($5::timestamptz IS NULL OR (${order},g.id)<($5::timestamptz,$6::uuid)) ORDER BY ${order} DESC,g.id DESC LIMIT $7) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,COALESCE((SELECT jsonb_agg(data ORDER BY date DESC,id DESC) FROM page),'[]') items`, [actor ?? null, roles, f.status, f.visibility, f.cursor?.date ?? null, f.cursor?.id ?? null, f.limit + 1]))[0]; }
export async function readItems(key: string, actor: string | undefined, limit: number, afterOrder: number | null, afterId: string | null) { return (await query<{
    authorized: boolean;
    found: boolean;
    items: ItemRecord[];
}>(`WITH authority AS (${authority}),parent AS(SELECT g.id FROM uss.galleries g LEFT JOIN uss.media_assets m ON m.id=g.cover_media_id WHERE ${actor ? 'g.id=$3::uuid AND EXISTS(SELECT 1 FROM authority)' : `g.slug=$3 AND ${eligible}`}),page AS(SELECT jsonb_build_object('id',i.id,'caption',i.caption,'altTextOverride',i.alt_text_override,'sortOrder',i.sort_order,'media',${mediaProjection}) data,i.sort_order,i.id FROM uss.gallery_items i JOIN uss.media_assets m ON m.id=i.media_asset_id WHERE i.gallery_id=(SELECT id FROM parent) AND i.removed_at IS NULL AND ($4::int IS NULL OR (i.sort_order,i.id)>($4::int,$5::uuid)) ORDER BY i.sort_order,i.id LIMIT $6) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,EXISTS(SELECT 1 FROM parent) found,COALESCE((SELECT jsonb_agg(data ORDER BY sort_order,id) FROM page),'[]') items`, [actor ?? null, roles, key, afterOrder, afterId, limit + 1]))[0]; }
export async function writeGallery(actor: string, id: string, op: string, expected: number | null, payload: Record<string, unknown>, base: string | null) { const sql = getSql(); const r = await sql.transaction([sql.query('SELECT uss.mutate_gallery($1::uuid,$2::uuid,$3::text,$4::int,$5::jsonb,$6::text) code', [actor, id, op, expected, JSON.stringify(payload), base])], { isolationLevel: 'ReadCommitted' }); return (r[0] as {
    code: string;
}[])[0]; }
export async function readHistory(actor: string, id: string, limit: number, before: number | null) { return (await query<{
    authorized: boolean;
    found: boolean;
    items: {
        id: string;
        version: number;
        action: string;
        createdAt: string;
    }[];
}>(`WITH authority AS (${authority}),parent AS(SELECT id FROM uss.galleries WHERE id=$3 AND EXISTS(SELECT 1 FROM authority)),page AS(SELECT id,version,action,${utc('created_at')} AS "createdAt" FROM uss.gallery_revisions WHERE gallery_id=(SELECT id FROM parent) AND ($4::int IS NULL OR version<$4) ORDER BY version DESC LIMIT $5) SELECT EXISTS(SELECT 1 FROM authority) authorized,EXISTS(SELECT 1 FROM parent) found,COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY version DESC) FROM page),'[]') items`, [actor, roles, id, before, limit + 1]))[0]; }
