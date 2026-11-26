import 'server-only';
import { getSql, query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { SiteRecord, SiteKey } from './site-types';
// MediaRecord is intentionally repository-internal; public serializers strip storage authority.
import type { MediaRecord as InternalMediaRecord } from '@/lib/media/media-types';
import { recordMutationCode, nonCmsReferenceGuard, isPurposeViolation } from '@/lib/media/media-reference';
const roles = rolesForPermission('cms.content.manage');
const siteGuard = nonCmsReferenceGuard(`ARRAY(SELECT j.value::uuid FROM uss.site_content c,jsonb_each_text(c.content) j WHERE c.key=$1::text AND j.key IN ('desktopMediaId','mobileMediaId','imageMediaId','backgroundMediaId') AND j.value IS NOT NULL)`, `$2::text IN ('create','update','publish')`);
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const utc = (c: string) => `to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const projection = `jsonb_build_object('id',c.id,'key',c.key,'content',c.content,'status',c.status,'version',c.version,'publishedContent',r.content,'publishedVersion',r.version,'publishedAt',${utc('r.created_at')},'createdAt',${utc('c.created_at')},'updatedAt',${utc('c.updated_at')})`;
const mediaProjection = `jsonb_build_object('id',m.id,'storageKey',m.storage_key,'storageProvider',m.storage_provider,'publicUrl',m.public_url,'mimeType',m.mime_type,'sizeBytes',m.byte_size,'width',m.width,'height',m.height,'altText',m.alt_text,'caption',m.caption,'status',m.status,'visibility',m.visibility,'purpose',m.purpose,'version',m.version,'createdAt',${utc('m.created_at')},'updatedAt',${utc('m.updated_at')})`;
export type ReadSlot = SiteRecord & {
    referencesValid: boolean;
    media: InternalMediaRecord[];
};
export async function readSlots(keys: readonly SiteKey[], actor?: string, status: string | null = null, after: string | null = null, limit = 50) { const pp = actor ? 'c.content' : 'r.content'; return (await query<{
    authorized: boolean;
    items: ReadSlot[];
}>(`WITH authority AS (${authority}),page AS(SELECT ${projection} || jsonb_build_object('referencesValid',(uss.site_content_references_valid(${pp},$7::boolean) AND NOT EXISTS(SELECT 1 FROM uss.media_assets x WHERE x.purpose<>'cms' AND x.id IN(SELECT j.value::uuid FROM jsonb_each_text(${pp}) j WHERE j.key IN ('desktopMediaId','mobileMediaId','imageMediaId','backgroundMediaId') AND j.value IS NOT NULL))),'media',COALESCE((SELECT jsonb_agg(${mediaProjection}) FROM uss.media_assets m WHERE m.purpose='cms' AND m.id IN(SELECT j.value::uuid FROM jsonb_each_text(${pp}) j WHERE j.key IN ('desktopMediaId','mobileMediaId','imageMediaId','backgroundMediaId') AND j.value IS NOT NULL)),'[]')) data,c.key FROM uss.site_content c LEFT JOIN uss.site_content_revisions r ON r.id=c.published_revision_id AND r.site_content_id=c.id WHERE c.key=ANY($3::text[]) AND c.schema_version=1 AND ${actor ? 'EXISTS(SELECT 1 FROM authority)' : "c.status='published' AND r.status='published' AND r.created_at<=statement_timestamp()"} AND ($4::text IS NULL OR c.status=$4) AND ($5::text IS NULL OR c.key>$5) ORDER BY c.key LIMIT $6) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,COALESCE((SELECT jsonb_agg(data ORDER BY key) FROM page),'[]') items`, [actor ?? null, roles, keys, status, after, limit, !actor]))[0]; }
export async function mutate(actor: string, key: SiteKey, operation: string, expected: number | null, payload: unknown) { const sql = getSql(); try { const r = await sql.transaction([sql.query(recordMutationCode('uss.mutate_site_content($1::uuid,$2::text,$3::text,$4::int,$5::jsonb)'), [actor, key, operation, expected, JSON.stringify(payload)]), sql.query(siteGuard, [key, operation])], { isolationLevel: 'ReadCommitted' }); return (r[0] as {
    code: string;
}[])[0]; } catch (e) { if (isPurposeViolation(e)) return { code: 'SITE_CONTENT_INVALID_REFERENCE' }; throw e; } }
