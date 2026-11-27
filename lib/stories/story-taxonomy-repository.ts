import 'server-only';
import { getSql, query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { TaxonomyKind, TaxonomyLists } from './story-taxonomy-types';

const roles = rolesForPermission('cms.content.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const utc = (c: string) => `to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

/** Table, editable columns and the live references that make a record "in use". Server-owned constants only. */
const KINDS = {
  category: { table: 'uss.categories', entity: 'story_category', fields: [['name', 'name', 'text'], ['slug', 'slug', 'text'], ['description', 'description', 'text'], ['sortOrder', 'sort_order', 'int'], ['isActive', 'is_active', 'boolean']], usage: (id: string) => `(SELECT count(*) FROM uss.stories WHERE category_id=${id})` },
  tag: { table: 'uss.tags', entity: 'story_tag', fields: [['name', 'name', 'text'], ['slug', 'slug', 'text']], usage: (id: string) => `(SELECT count(*) FROM uss.story_tags WHERE tag_id=${id})` },
  byline: { table: 'uss.story_bylines', entity: 'story_byline', fields: [['name', 'name', 'text'], ['slug', 'slug', 'text'], ['roleTitle', 'role_title', 'text'], ['isActive', 'is_active', 'boolean']], usage: (id: string) => `(SELECT count(*) FROM uss.stories WHERE byline_id=${id})` },
} as const satisfies Record<TaxonomyKind, { table: string; entity: string; fields: readonly (readonly [string, string, string])[]; usage: (id: string) => string }>;

const project = (kind: TaxonomyKind, alias: string) => `jsonb_build_object('id',${alias}.id,'version',${alias}.version,'usageCount',${KINDS[kind].usage(alias + '.id')},'updatedAt',${utc(alias + '.updated_at')},${KINDS[kind].fields.map(([key, col]) => `'${key}',${alias}.${col}`).join(',')})`;

export async function listTaxonomy(actor: string) {
  return (await query<{ authorized: boolean } & TaxonomyLists>(`WITH authority AS MATERIALIZED(${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,
    COALESCE((SELECT jsonb_agg(${project('category', 'x')} ORDER BY x.sort_order,x.name,x.id) FROM (SELECT * FROM uss.categories WHERE EXISTS(SELECT 1 FROM authority) ORDER BY sort_order,name,id LIMIT 201) x),'[]') categories,
    COALESCE((SELECT jsonb_agg(${project('tag', 'x')} ORDER BY x.name,x.id) FROM (SELECT * FROM uss.tags WHERE EXISTS(SELECT 1 FROM authority) ORDER BY name,id LIMIT 201) x),'[]') tags,
    COALESCE((SELECT jsonb_agg(${project('byline', 'x')} ORDER BY x.name,x.id) FROM (SELECT * FROM uss.story_bylines WHERE EXISTS(SELECT 1 FROM authority) ORDER BY name,id LIMIT 201) x),'[]') bylines`, [actor, roles]))[0];
}

export type TaxonomyOp = 'create' | 'update' | 'delete';
/** One audited statement per mutation. Delete is refused while any Story references the record; the FK is the backstop. */
export async function mutateTaxonomy(actor: string, kind: TaxonomyKind, op: TaxonomyOp, id: string, expected: number | null, patch: Record<string, unknown> | null) {
  const k = KINDS[kind], fields = k.fields.filter(([key]) => patch && key in patch);
  const value = (key: string, type: string) => type === 'text' ? `($3::jsonb->>'${key}')` : `($3::jsonb->>'${key}')::${type}`;
  const mutation = op === 'create'
    ? `INSERT INTO ${k.table}(id,${fields.map(([, col]) => col).join(',')}) SELECT $4,${fields.map(([key, , t]) => value(key, t)).join(',')} FROM decision WHERE code='OK' RETURNING *`
    : op === 'update'
      ? `UPDATE ${k.table} x SET ${[...fields.map(([key, col, t]) => `${col}=${value(key, t)}`), 'version=x.version+1', 'updated_at=clock_timestamp()'].join(',')} FROM decision WHERE x.id=$4 AND code='OK' RETURNING x.*`
      : `DELETE FROM ${k.table} x USING decision WHERE x.id=$4 AND code='OK' RETURNING x.*`;
  const slugTaken = patch && 'slug' in patch ? `WHEN EXISTS(SELECT 1 FROM ${k.table} o WHERE o.slug=$3::jsonb->>'slug' AND o.id<>$4) THEN 'STORY_SLUG_TAKEN'` : '';
  const statement = `WITH input AS MATERIALIZED(SELECT $3::jsonb p,$5::int expected),authority AS MATERIALIZED(${authority}),current AS MATERIALIZED(SELECT * FROM ${k.table} WHERE id=$4),decision AS MATERIALIZED(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'STORY_FORBIDDEN'
    ${op === 'create' ? '' : "WHEN NOT EXISTS(SELECT 1 FROM current) THEN 'STORY_NOT_FOUND' WHEN (SELECT version FROM current)<>$5::int THEN 'STORY_CONFLICT'"}
    ${op === 'delete' ? `WHEN ${k.usage('$4')}>0 THEN 'STORY_TAXONOMY_IN_USE'` : slugTaken}
    ELSE 'OK' END code),changed AS(${mutation}),audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) SELECT $1,$6,'${k.entity}',id,jsonb_build_object('changedFields',$7::text[]) FROM changed RETURNING id)
    SELECT code,(SELECT ${project(kind, 'c')} FROM changed c) data FROM decision`;
  const sql = getSql();
  const result = await sql.transaction([
    sql.query("SELECT set_config('lock_timeout','15s',true)"),
    sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE', [actor]),
    sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,r', [actor]),
    sql.query(`SELECT id FROM ${k.table} WHERE id=$1 FOR UPDATE`, [id]),
    sql.query(statement, [actor, roles, JSON.stringify(patch ?? {}), id, expected, `${k.entity}.${{ create: 'created', update: 'updated', delete: 'deleted' }[op]}`, op === 'delete' ? ['deleted'] : fields.map(([key]) => key)]),
  ], { isolationLevel: 'ReadCommitted' });
  return (result[4] as { code: string; data: Record<string, unknown> | null }[])[0];
}
