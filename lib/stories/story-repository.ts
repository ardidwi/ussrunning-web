import 'server-only';
import { getSql, query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { StoryContent, StoryRecord, StoryFilters } from './story-types';
const roles = rolesForPermission('cms.content.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const utc = (c: string) => `to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const mediaProjection = `CASE WHEN m.id IS NULL THEN NULL ELSE jsonb_build_object('id',m.id,'storageKey',m.storage_key,'storageProvider',m.storage_provider,'publicUrl',m.public_url,'mimeType',m.mime_type,'sizeBytes',m.byte_size,'width',m.width,'height',m.height,'altText',m.alt_text,'caption',m.caption,'status',m.status,'visibility',m.visibility,'purpose',m.purpose,'version',m.version,'createdAt',${utc('m.created_at')},'updatedAt',${utc('m.updated_at')}) END`;
const projection = `jsonb_build_object('id',s.id,'slug',s.slug,'title',s.title,'excerpt',s.excerpt,'body',s.body,'contentType',s.content_type,'categoryId',s.category_id,'coverMediaId',s.cover_media_id,'visibility',s.visibility,'featured',s.featured,'status',s.status,'version',s.version,'authorAccountId',s.author_account_id,'authorName',a.display_name,'publishedAt',${utc('s.published_at')},'publishAt',${utc('s.publish_at')},'createdAt',${utc('s.created_at')},'updatedAt',${utc('s.updated_at')},'media',${mediaProjection})`;
const joins = `LEFT JOIN uss.accounts a ON a.id=s.author_account_id LEFT JOIN uss.media_assets m ON m.id=s.cover_media_id AND m.purpose='cms'`;
const publishable = `s.visibility='public' AND s.status IN ('published','scheduled') AND COALESCE(s.published_at,s.publish_at)<=statement_timestamp() AND (s.publish_at IS NULL OR s.publish_at<=statement_timestamp()) AND s.archived_at IS NULL AND m.status='active' AND m.visibility='public' AND m.mime_type=ANY(ARRAY['image/jpeg','image/png','image/webp'])`;
export async function readStory(key: string, actor?: string) { const rows = await query<{
    authorized: boolean;
    data: StoryRecord | null;
}>(`WITH authority AS (${authority}) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,(SELECT ${projection} FROM uss.stories s ${joins} WHERE ${actor ? 's.id=$3::uuid AND EXISTS(SELECT 1 FROM authority)' : `s.slug=$3 AND ${publishable}`}) data`, [actor ?? null, roles, key]); return rows[0]; }
export async function listStories(f: StoryFilters, actor?: string) { const order = actor ? 's.created_at' : 'COALESCE(s.published_at,s.publish_at)'; const rows = await query<{
    authorized: boolean;
    items: StoryRecord[];
}>(`WITH authority AS (${authority}),page AS(SELECT ${projection.replace("\'body\',s.body", "\'body\',\'[]\'::jsonb")} data,${order} date,s.id FROM uss.stories s ${joins} WHERE ${actor ? 'EXISTS(SELECT 1 FROM authority)' : publishable} AND ($3::text IS NULL OR s.status=$3) AND ($4::text IS NULL OR s.visibility=$4) AND ($5::timestamptz IS NULL OR (${order},s.id)<($5::timestamptz,$6::uuid)) ORDER BY ${order} DESC,s.id DESC LIMIT $7) SELECT ${actor ? 'EXISTS(SELECT 1 FROM authority)' : 'true'} authorized,COALESCE((SELECT jsonb_agg(data ORDER BY date DESC,id DESC) FROM page),'[]') items`, [actor ?? null, roles, f.status, f.visibility, f.cursor?.date ?? null, f.cursor?.id ?? null, f.limit + 1]); return rows[0]; }
export type StoryOperation = 'create' | 'update' | 'publish' | 'schedule' | 'unpublish' | 'archive';
const columns = [['title', 'title', 'text'], ['excerpt', 'excerpt', 'text'], ['body', 'body', 'jsonb'], ['contentType', 'content_type', 'text'], ['categoryId', 'category_id', 'uuid'], ['coverMediaId', 'cover_media_id', 'uuid'], ['visibility', 'visibility', 'text'], ['featured', 'featured', 'boolean']] as const;
export async function writeStory(actor: string, id: string, op: StoryOperation, data: StoryContent | null, expected: number | null, publishAt: string | null, base: string | null, changedFields: string[]) {
    const create = op === 'create';
    const action = `story.${{ create: 'created', update: 'updated', publish: 'published', schedule: 'scheduled', unpublish: 'unpublished', archive: 'archived' }[op]}`;
    const value = (key: string, type: string) => type === 'jsonb' ? `patch->'${key}'` : `(patch->>'${key}')::${type}`;
    const mutation = create ? `INSERT INTO uss.stories(id,slug,${columns.map(([, col]) => col).join(',')},author_account_id) SELECT $4,CASE WHEN EXISTS(SELECT 1 FROM uss.stories WHERE slug=$9) THEN $10 ELSE $9 END,${columns.map(([key, , t]) => value(key, t)).join(',')},$1 FROM input,decision WHERE code='OK' RETURNING *` :
        `UPDATE uss.stories s SET ${op === 'update' ? columns.map(([key, col, t]) => `${col}=${value(key, t)}`).join(',') : `status='${{ publish: 'published', schedule: 'scheduled', unpublish: 'draft', archive: 'archived' }[op as Exclude<StoryOperation, 'create' | 'update'>]}',published_at=${op === 'publish' ? 'clock_timestamp()' : op === 'archive' ? 's.published_at' : 'NULL'},publish_at=${op === 'schedule' ? '$7::timestamptz' : op === 'archive' ? 's.publish_at' : 'NULL'},archived_at=${op === 'archive' ? 'clock_timestamp()' : 'NULL'}`},version=s.version+1 FROM input,decision WHERE s.id=$4 AND code='OK' RETURNING s.*`;
    const statement = `WITH input AS MATERIALIZED(SELECT $3::jsonb patch,$5::int expected,$6::text op,$7::timestamptz scheduled,$8::text[] fields,$9::text base,$10::text fallback),authority AS MATERIALIZED(${authority}),current AS MATERIALIZED(SELECT * FROM uss.stories WHERE id=$4),target AS MATERIALIZED(SELECT COALESCE(input.patch,jsonb_build_object('title',c.title,'body',c.body,'contentType',c.content_type,'categoryId',c.category_id,'coverMediaId',c.cover_media_id,'visibility',c.visibility)) p FROM input LEFT JOIN current c ON true),media AS MATERIALIZED(SELECT m.* FROM uss.media_assets m,target WHERE m.id=(p->>'coverMediaId')::uuid AND m.purpose='cms' FOR SHARE OF m),type AS MATERIALIZED(SELECT t.code FROM uss.story_content_types t,target WHERE t.code=p->>'contentType' AND is_active FOR SHARE OF t),category AS MATERIALIZED(SELECT c.id FROM uss.categories c,target WHERE c.id=(p->>'categoryId')::uuid AND is_active FOR SHARE OF c),decision AS MATERIALIZED(SELECT CASE
 WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'STORY_FORBIDDEN'
 ${create ? '' : "WHEN NOT EXISTS(SELECT 1 FROM current) THEN 'STORY_NOT_FOUND' WHEN (SELECT version FROM current)<>$5 THEN 'STORY_CONFLICT'"}
 ${op === 'update' ? "WHEN (SELECT status FROM current) NOT IN ('draft','scheduled') OR ((SELECT status FROM current)='scheduled' AND (SELECT publish_at FROM current)<=clock_timestamp()) THEN 'STORY_INVALID_STATE'" : ''}
 ${['publish', 'schedule'].includes(op) ? "WHEN (SELECT status FROM current) NOT IN ('draft','scheduled') THEN 'STORY_INVALID_STATE'" : ''}
 ${op === 'unpublish' ? "WHEN (SELECT status FROM current) NOT IN ('published','scheduled') THEN 'STORY_INVALID_STATE'" : ''}
 ${op === 'archive' ? "WHEN (SELECT status FROM current)='archived' THEN 'STORY_INVALID_STATE'" : ''}
 ${op === 'archive' || op === 'unpublish' ? '' : "WHEN NOT EXISTS(SELECT 1 FROM type) OR ((p->>'categoryId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM category)) THEN 'STORY_INVALID_REFERENCE' WHEN (p->>'coverMediaId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM media WHERE status='active' AND mime_type=ANY(ARRAY['image/jpeg','image/png','image/webp'])) THEN 'STORY_MEDIA_INVALID'"}
 ${['publish', 'schedule'].includes(op) ? "WHEN length(btrim(p->>'title'))=0 OR jsonb_typeof(p->'body')<>'array' OR jsonb_array_length(p->'body')=0 OR (p->>'coverMediaId') IS NULL OR (SELECT author_account_id FROM current) IS NULL THEN 'STORY_NOT_PUBLISHABLE' WHEN (p->>'visibility')='public' AND NOT EXISTS(SELECT 1 FROM media WHERE visibility='public') THEN 'STORY_MEDIA_INVALID'" : ''}
 ${op === 'schedule' ? "WHEN $7::timestamptz IS NULL OR $7<=clock_timestamp() THEN 'STORY_INVALID_STATE'" : ''}
 ELSE 'OK' END code FROM target),changed AS(${mutation}),revision AS(INSERT INTO uss.story_revisions(story_id,version,snapshot,created_by,action) SELECT id,version,jsonb_build_object(${columns.map(([, col]) => `'${col}',s.${col}`).join(',')},'slug',slug,'status',status,'published_at',published_at,'publish_at',publish_at),$1,$11 FROM changed s RETURNING id,story_id),audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary) SELECT $1,$11,'story',story_id,id,jsonb_build_object('changedFields',$8::text[]) FROM revision RETURNING id) SELECT code,(SELECT id FROM changed) id FROM decision`;
    const sql = getSql();
    const result = await sql.transaction([sql.query("SELECT set_config('lock_timeout','15s',true)"), sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE', [actor]), sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,r', [actor]), create ? sql.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', ['story-slug:' + base]) : sql.query('SELECT id FROM uss.stories WHERE id=$1 FOR UPDATE', [id]), sql.query(statement, [actor, roles, data ? JSON.stringify(data) : null, id, expected, op, publishAt, changedFields, base, base ? `${base}-${id.replaceAll('-', '')}` : null, action])], { isolationLevel: 'ReadCommitted' });
    return (result[4] as {
        code: string;
        id: string | null;
    }[])[0];
}
/** Bounded DB-owned selector records, not a hardcoded editorial taxonomy. */
export async function readStoryReferences(actor: string) { return (await query<{
    authorized: boolean;
    contentTypes: {
        code: string;
        name: string;
    }[];
    categories: {
        id: string;
        name: string;
        slug: string;
    }[];
}>(`WITH authority AS (${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM (SELECT code,name FROM uss.story_content_types WHERE is_active AND EXISTS(SELECT 1 FROM authority) ORDER BY code LIMIT 101) t),'[]') "contentTypes",COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM (SELECT id,name,slug FROM uss.categories WHERE is_active AND EXISTS(SELECT 1 FROM authority) ORDER BY sort_order,id LIMIT 101) c),'[]') categories`, [actor, roles]))[0]; }
