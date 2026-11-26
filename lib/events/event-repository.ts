import "server-only";
import { getSql, query } from "@/lib/db";
import { rolesForPermission } from "@/lib/authz/permissions";
import { PUBLIC_EVENT_STATES, EVENT_TRANSITIONS } from "./event-policy";
import type { EventContent, EventDTO, EventFilters } from "./event-types";
import type { EventStatus } from "@/lib/db/types";
const roleCodes = rolesForPermission("events.manage");
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const columns = [['slug', 'slug', 'text'], ['eventType', 'event_type', 'text'], ['title', 'title', 'text'], ['summary', 'summary', 'text'], ['description', 'description', 'jsonb'],
    ['startsAt', 'starts_at', 'timestamptz'], ['endsAt', 'ends_at', 'timestamptz'], ['timezone', 'timezone', 'text'], ['venueName', 'venue_name', 'text'], ['locationText', 'location_text', 'text'],
    ['mapUrl', 'map_url', 'text'], ['registrationOpensAt', 'registration_opens_at', 'timestamptz'], ['registrationClosesAt', 'registration_closes_at', 'timestamptz'], ['capacity', 'capacity', 'integer'],
    ['waitlistEnabled', 'waitlist_enabled', 'boolean'], ['visibility', 'visibility', 'text'], ['coverMediaId', 'cover_media_id', 'uuid']] as const;
const hash = `encode(sha256(convert_to((to_jsonb(e)||jsonb_build_object('created_at',extract(epoch FROM e.created_at),'updated_at',extract(epoch FROM e.updated_at),'starts_at',extract(epoch FROM e.starts_at),'ends_at',extract(epoch FROM e.ends_at),'registration_opens_at',extract(epoch FROM e.registration_opens_at),'registration_closes_at',extract(epoch FROM e.registration_closes_at),'checkin_opens_at',extract(epoch FROM e.checkin_opens_at),'checkin_closes_at',extract(epoch FROM e.checkin_closes_at),'archived_at',extract(epoch FROM e.archived_at)))::text,'UTF8')),'hex')`;
const projection = `jsonb_build_object(${columns.map(([key, col]) => `'${key}',e.${col}`).join(',')},'id',e.id,'status',e.status,'version',${hash}) AS data`;
export async function readPublic(slug: string) { return (await query<{
    data: EventDTO;
}>(`SELECT ${projection} FROM uss.events e WHERE e.slug=$1 AND e.visibility='public' AND e.status=ANY($2::text[]) AND e.archived_at IS NULL`, [slug, PUBLIC_EVENT_STATES]))[0]?.data; }
export async function readAdmin(actorId: string, id: string) {
    const rows = await query<{
        authorized: boolean;
        data: EventDTO | null;
    }>(`WITH authority AS (${authority}) SELECT EXISTS(SELECT 1 FROM authority) AS authorized,
 (SELECT data FROM (SELECT ${projection} FROM uss.events e WHERE e.id=$3 AND EXISTS(SELECT 1 FROM authority)) x) AS data`, [actorId, roleCodes, id]);
    return rows[0];
}
export async function listEvents(input: EventFilters, actorId?: string) {
    const params = [actorId ?? null, roleCodes, input.eventType, input.status, input.cursor?.startsAt ?? null, input.cursor?.id ?? null, input.limit + 1, PUBLIC_EVENT_STATES];
    const rows = await query<{
        authorized: boolean;
        items: EventDTO[];
    }>(`WITH authority AS (${authority}), page AS (SELECT ${projection} FROM uss.events e
 WHERE ($3::text IS NULL OR e.event_type=$3) AND ($4::text IS NULL OR e.status=$4)
 AND ($5::timestamptz IS NULL OR (e.starts_at,e.id)>($5::timestamptz,$6::uuid))
 AND ${actorId ? '$8::text[] IS NOT NULL AND EXISTS(SELECT 1 FROM authority)' : "e.visibility='public' AND e.status=ANY($8::text[]) AND e.archived_at IS NULL"}
 ORDER BY e.starts_at,e.id LIMIT $7)
 SELECT ${actorId ? '$8::text[] IS NOT NULL AND EXISTS(SELECT 1 FROM authority)' : 'true'} AS authorized,COALESCE((SELECT jsonb_agg(data ORDER BY (data->>'startsAt')::timestamptz,(data->>'id')::uuid) FROM page),'[]') AS items`, params);
    return rows[0];
}
export async function writeEvent(actorId: string, content: EventContent | null, id: string | null, expected: string | null, nextStatus: EventStatus | null, changedFields?: readonly string[]) {
    const action = id ? (nextStatus === 'published' ? 'event.published' : nextStatus === 'archived' ? 'event.archived' : 'event.updated') : 'event.created';
    const values = columns.map(([key, , type]) => type === 'jsonb' ? `NULLIF(input.patch->'${key}','null'::jsonb)` : `(input.patch->>'${key}')::${type}`);
    const changes = changedFields ?? (content ? columns.map(([key]) => key) : ['status']);
    const mutation = id ? `UPDATE uss.events e SET ${content ? columns.map(([, col], i) => `${col}=${values[i]}`).join(',') : "status=$6,archived_at=CASE WHEN $6='archived' THEN clock_timestamp() ELSE NULL END"}
 FROM input,decision WHERE e.id=$4 AND decision.code='OK' RETURNING e.*` :
        `INSERT INTO uss.events(${columns.map(([, col]) => col).join(',')},created_by) SELECT ${values.join(',')},$1 FROM input,decision WHERE decision.code='OK' RETURNING *`;
    const statement = `WITH input AS (SELECT $3::jsonb AS patch), authority AS MATERIALIZED (${authority}), current AS MATERIALIZED(SELECT e.*,${hash} AS token FROM uss.events e WHERE e.id=$4),
 media AS MATERIALIZED(SELECT id FROM uss.media_assets WHERE id=($3::jsonb->>'coverMediaId')::uuid AND status='active' AND purpose='cms' FOR SHARE),
 decision AS MATERIALIZED(SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
 WHEN $4::uuid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM current) THEN 'EVENT_NOT_FOUND'
 WHEN $4::uuid IS NOT NULL AND (SELECT token FROM current)<>$5 THEN 'EVENT_CONFLICT'
 WHEN $6::text IS NOT NULL AND NOT ((SELECT status FROM current)=ANY($7::text[])) THEN 'EVENT_INVALID_TRANSITION'
 WHEN $3::jsonb IS NOT NULL AND (input.patch->>'capacity') IS NOT NULL AND (input.patch->>'capacity')::integer < (SELECT count(*) FROM uss.event_registrations r WHERE r.event_id=$4 AND (r.status='confirmed' OR EXISTS(SELECT 1 FROM uss.check_ins c WHERE c.registration_id=r.id))) THEN 'EVENT_CAPACITY_CONFLICT'
 WHEN $3::jsonb IS NOT NULL AND (input.patch->>'coverMediaId') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM media) THEN 'EVENT_MEDIA_NOT_FOUND'
 ELSE 'OK' END AS code FROM input), changed AS (${mutation}),
 revision AS (INSERT INTO uss.event_revisions(event_id,version,snapshot,created_by,action)
 SELECT e.id,COALESCE((SELECT max(version) FROM uss.event_revisions WHERE event_id=e.id),0)+1,
 jsonb_build_object(${columns.map(([, col]) => `'${col}',e.${col}`).join(',')},'status',e.status),$1,$8 FROM changed e RETURNING id,event_id),
 audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary)
 SELECT $1,$8,'event',event_id,id,jsonb_build_object('changedFields',$9::text[]) FROM revision RETURNING id)
 SELECT decision.code,(SELECT id FROM changed) AS id FROM decision`;
    const sql = getSql();
    const results = await sql.transaction([
        sql.query("SELECT set_config('lock_timeout','15s',true)"),
        sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE', [actorId]),
        sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,r', [actorId]),
        sql.query('SELECT id FROM uss.events WHERE id=$1 FOR UPDATE', [id]),
        sql.query(statement, [actorId, roleCodes, content ? JSON.stringify(content) : null, id, expected, nextStatus, nextStatus ? Object.entries(EVENT_TRANSITIONS).filter(([, targets]) => targets.includes(nextStatus)).map(([s]) => s) : [], action, changes]),
    ], { isolationLevel: 'ReadCommitted' });
    return (results[4] as {
        code: string;
        id: string | null;
    }[])[0];
}
