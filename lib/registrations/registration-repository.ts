import "server-only";
import { query, getSql } from "@/lib/db";
import { rolesForPermission } from "@/lib/authz/permissions";
import { REGISTRATION_POLICY, CANCELLABLE_STATES, CANCELLABLE_EVENT_STATES } from './registration-policy';
import type { ManagedRegistrationDTO, RegistrationFilters } from './registration-types';
const roles = rolesForPermission('events.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL
 AND (NOT $2::boolean OR EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=a.id AND role.code=ANY($3::text[])))`;
const versionSql = "encode(sha256(convert_to((to_jsonb(r)||jsonb_build_object('registered_at',extract(epoch FROM r.registered_at),'cancelled_at',extract(epoch FROM r.cancelled_at),'created_at',extract(epoch FROM r.created_at),'updated_at',extract(epoch FROM r.updated_at)))::text,'UTF8')),'hex')";
const utc = (column: string) => `to_char(${column} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const dto = `jsonb_build_object('id',r.id,'accountId',r.account_id,'status',r.status,'registeredAt',${utc('r.registered_at')},'cancelledAt',${utc('r.cancelled_at')},'updatedAt',${utc('r.updated_at')},'version',${versionSql},
 'event',jsonb_build_object('id',e.id,'slug',e.slug,'title',e.title,'startsAt',${utc('e.starts_at')},'timezone',e.timezone,'status',e.status))`;
export async function mutateRegistration(actorId: string, eventId: string, registrationId: string | null, managed: boolean, mode: 'register' | 'cancel', expectedVersion: string | null = null) {
    const statement = `WITH authority AS MATERIALIZED (${authority}), event AS MATERIALIZED(SELECT * FROM uss.events WHERE id=$4),
 current AS MATERIALIZED(SELECT r.*,${versionSql} AS token FROM uss.event_registrations r WHERE r.event_id=$4 AND CASE WHEN $6='register' THEN r.account_id=$1 ELSE r.id=$5 END FOR UPDATE),
 occupancy AS MATERIALIZED(SELECT count(*)::bigint n FROM uss.event_registrations r WHERE r.event_id=$4 AND (r.status='confirmed' OR EXISTS(SELECT 1 FROM uss.check_ins c WHERE c.registration_id=r.id))),
 decision AS MATERIALIZED(SELECT CASE
 WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
 WHEN NOT EXISTS(SELECT 1 FROM event) THEN 'REGISTRATION_NOT_AVAILABLE'
 WHEN $6='cancel' AND (NOT EXISTS(SELECT 1 FROM current) OR (NOT $2 AND (SELECT account_id FROM current)<>$1)) THEN 'REGISTRATION_NOT_FOUND'
 WHEN $6='cancel' AND (SELECT status FROM current)='cancelled' THEN 'OK'
 WHEN $6='cancel' AND (SELECT token FROM current)<>$9 THEN 'REGISTRATION_CONFLICT'
 WHEN EXISTS(SELECT 1 FROM uss.check_ins c JOIN current r ON r.id=c.registration_id) THEN 'REGISTRATION_NOT_CANCELLABLE'
 WHEN $6='cancel' AND ((SELECT status FROM current)<>ALL($7::text[]) OR (SELECT status FROM event)<>ALL($8::text[]) OR (NOT $2 AND (SELECT status FROM event)<>'cancelled' AND clock_timestamp()>=(SELECT starts_at FROM event))) THEN 'REGISTRATION_NOT_CANCELLABLE'
 WHEN $6='register' AND ((SELECT visibility FROM event)='private' OR (SELECT status FROM event) IN ('draft','archived') OR (SELECT archived_at FROM event) IS NOT NULL) THEN 'REGISTRATION_NOT_AVAILABLE'
 WHEN $6='register' AND ((SELECT status FROM event)<>'registration_open' OR clock_timestamp()>=(SELECT starts_at FROM event) OR clock_timestamp()<(SELECT registration_opens_at FROM event) OR clock_timestamp()>=(SELECT registration_closes_at FROM event)) THEN 'REGISTRATION_CLOSED'
 WHEN $6='register' AND ((SELECT eligibility_config FROM event)<>'{}'::jsonb OR EXISTS(SELECT 1 FROM uss.event_custom_fields f WHERE f.event_id=$4 AND f.active AND f.required)) THEN 'REGISTRATION_CONFIGURATION_UNSUPPORTED'
 WHEN $6='register' AND (SELECT status FROM current)='pending' THEN 'REGISTRATION_PENDING'
 WHEN $6='register' AND (SELECT status FROM current)='rejected' THEN 'REGISTRATION_REJECTED'
 WHEN $6='register' AND (SELECT status FROM current) IN ('confirmed','waitlisted') THEN 'OK'
 WHEN $6='register' AND (SELECT capacity FROM event) IS NOT NULL AND (SELECT n FROM occupancy)>=(SELECT capacity FROM event) AND NOT (SELECT waitlist_enabled FROM event) THEN 'EVENT_CAPACITY_FULL'
 ELSE 'OK' END code),
 target AS MATERIALIZED(SELECT CASE WHEN $6='cancel' THEN 'cancelled' WHEN (SELECT capacity FROM event) IS NOT NULL AND (SELECT n FROM occupancy)>=(SELECT capacity FROM event) THEN 'waitlisted' ELSE 'confirmed' END status),
 inserted AS (INSERT INTO uss.event_registrations(event_id,account_id,status,source)
 SELECT $4,$1,target.status,'web' FROM decision,target WHERE decision.code='OK' AND $6='register' AND NOT EXISTS(SELECT 1 FROM current) RETURNING *),
 updated AS (UPDATE uss.event_registrations r SET status=target.status,cancelled_at=CASE WHEN $6='cancel' THEN clock_timestamp() ELSE NULL END
 FROM current,decision,target WHERE r.id=current.id AND decision.code='OK' AND (($6='register' AND current.status='cancelled') OR ($6='cancel' AND current.status<>'cancelled')) RETURNING r.*),
 changes AS MATERIALIZED(SELECT * FROM inserted UNION ALL SELECT * FROM updated),
 audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 SELECT $1,CASE WHEN $6='cancel' THEN 'registration.cancelled' WHEN EXISTS(SELECT 1 FROM current) THEN 'registration.updated' ELSE 'registration.created' END,
 'registration',r.id,jsonb_build_object('changedFields',ARRAY['status'],'eventId',$4,'fromStatus',(SELECT status FROM current),'toStatus',r.status,'initiator',CASE WHEN $2 THEN 'admin' ELSE 'owner' END)
 FROM changes r RETURNING id),
 resolved AS (SELECT * FROM changes UNION ALL SELECT id,event_id,account_id,status,registered_at,cancelled_at,source,admin_note,created_at,updated_at FROM current WHERE NOT EXISTS(SELECT 1 FROM changes))
 SELECT decision.code,(SELECT ${dto} FROM resolved r JOIN event e ON e.id=r.event_id WHERE decision.code='OK') AS data FROM decision`;
    const sql = getSql(), results = await sql.transaction([
        sql.query("SELECT set_config('lock_timeout',$1,true)", [REGISTRATION_POLICY.lockTimeout]),
        sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE', [actorId]),
        sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,role', [actorId]),
        // Separate statement: READ COMMITTED mutation/COUNT gets a fresh snapshot AFTER event lock wait.
        sql.query('SELECT id FROM uss.events WHERE id=$1 FOR UPDATE', [eventId]),
        sql.query(statement, [actorId, managed, roles, eventId, registrationId, mode, CANCELLABLE_STATES, CANCELLABLE_EVENT_STATES, expectedVersion]),
    ], { isolationLevel: 'ReadCommitted' });
    return (results[4] as {
        code: string;
        data: ManagedRegistrationDTO | null;
    }[])[0];
}
export async function readRegistration(actorId: string, managed: boolean, eventId: string, registrationId: string) {
    const rows = await query<{
        authorized: boolean;
        data: ManagedRegistrationDTO | null;
    }>(`WITH authority AS (${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,
 (SELECT ${dto} FROM uss.event_registrations r JOIN uss.events e ON e.id=r.event_id WHERE r.id=$5 AND r.event_id=$4 AND ($2 OR r.account_id=$1) AND EXISTS(SELECT 1 FROM authority)) data`, [actorId, managed, roles, eventId, registrationId]);
    return rows[0];
}
export async function listRegistrations(actorId: string, managed: boolean, f: RegistrationFilters) {
    const rows = await query<{
        authorized: boolean;
        items: ManagedRegistrationDTO[];
    }>(`WITH authority AS (${authority}),page AS (
 SELECT ${dto} data,r.registered_at at,r.id FROM uss.event_registrations r JOIN uss.events e ON e.id=r.event_id
 WHERE EXISTS(SELECT 1 FROM authority) AND ($2 OR r.account_id=$1) AND ($4::uuid IS NULL OR r.event_id=$4) AND ($5::text IS NULL OR r.status=$5)
 AND ($6::timestamptz IS NULL OR r.registered_at<$6 OR (r.registered_at=$6 AND r.id>$7::uuid))
 ORDER BY r.registered_at DESC,r.id ASC LIMIT $8)
 SELECT EXISTS(SELECT 1 FROM authority) authorized,COALESCE((SELECT jsonb_agg(data ORDER BY at DESC,id ASC) FROM page),'[]') items`, [actorId, managed, roles, f.eventId, f.status, f.cursor?.at ?? null, f.cursor?.id ?? null, f.limit + 1]);
    return rows[0];
}
