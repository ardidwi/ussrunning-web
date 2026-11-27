import 'server-only';
import { query, getSql } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { NotificationRecord, NotificationFilters } from './notification-types';
import { NotificationError } from './notification-errors';
const roles = rolesForPermission('events.manage');
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
export async function readNotification(actorId: string, id: string) { const rows = await query<{
    authorized: boolean;
    data: NotificationRecord | null;
}>(`WITH authority AS (${authority}) SELECT EXISTS(SELECT 1 FROM authority) authorized,(SELECT to_jsonb(d) FROM uss.notification_deliveries d WHERE id=$3 AND schema_version=1 AND EXISTS(SELECT 1 FROM authority)) data`, [actorId, roles, id]); if (!rows[0]?.authorized)
    throw new NotificationError('NOTIFICATION_FORBIDDEN'); if (!rows[0].data)
    throw new NotificationError('NOTIFICATION_NOT_FOUND'); return rows[0].data; }
export async function listNotifications(actorId: string, f: NotificationFilters) { const rows = await query<{
    authorized: boolean;
    items: NotificationRecord[];
}>(`WITH authority AS (${authority}),page AS(SELECT d.* FROM uss.notification_deliveries d WHERE schema_version=1 AND EXISTS(SELECT 1 FROM authority) AND ($3::text IS NULL OR notification_type=$3) AND ($4::text IS NULL OR CASE WHEN cancelled_at IS NOT NULL THEN 'cancelled' WHEN status='queued' THEN 'pending' ELSE status END=$4) AND ($5::timestamptz IS NULL OR queued_at<$5 OR (queued_at=$5 AND id>$6::uuid)) ORDER BY queued_at DESC,id LIMIT $7) SELECT EXISTS(SELECT 1 FROM authority) authorized,COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY queued_at DESC,id) FROM page),'[]') items`, [actorId, roles, f.type, f.status, f.cursor?.at ?? null, f.cursor?.id ?? null, f.limit + 1]); if (!rows[0]?.authorized)
    throw new NotificationError('NOTIFICATION_FORBIDDEN'); return rows[0].items; }
export async function claimNotification(actorId: string, id: string, hash: string, provider: string, version: number) { const row = (await query<{
    code: string;
    record: NotificationRecord | null;
}>('SELECT * FROM uss.claim_application_notification($1,$2,$3,$4,$5)', [actorId, id, hash, provider, version]))[0]; if (row?.code !== 'OK' || !row.record)
    throw new NotificationError((row?.code ?? 'NOTIFICATION_UNAVAILABLE') as NotificationError['code']); return row.record; }
export async function finishNotification(id: string, claimId: string, ok: boolean, messageId: string | null, errorCode: string | null, retryable: boolean) { const rows = await query(`UPDATE uss.notification_deliveries SET status=CASE WHEN $3 THEN 'sent' ELSE 'failed' END,provider_message_id=CASE WHEN $3 THEN $4 ELSE NULL END,sent_at=CASE WHEN $3 THEN clock_timestamp() END,failed_at=CASE WHEN NOT $3 THEN clock_timestamp() END,last_error_code=$5,last_error_summary=CASE WHEN NOT $3 THEN 'Operational notification send did not complete.' END,retryable=NOT $3 AND $6 AND attempt_count<3,next_attempt_at=CASE WHEN NOT $3 AND $6 AND attempt_count<3 THEN clock_timestamp()+make_interval(secs=>CASE WHEN attempt_count=1 THEN 60 ELSE 300 END) END WHERE id=$1 AND claim_id=$2 AND status='sending' AND schema_version=1 RETURNING id`, [id, claimId, ok, messageId, errorCode, retryable]); if (!rows[0])
    throw new NotificationError('NOTIFICATION_CONFLICT'); }
export async function cancelNotification(actorId: string, id: string, version: number) { const sql = getSql(), result = await sql.transaction([sql.query('SELECT id FROM uss.accounts WHERE id=$1 FOR SHARE', [actorId]), sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,r', [actorId]), sql.query(`WITH authority AS (${authority}),changed AS(UPDATE uss.notification_deliveries d SET cancelled_at=clock_timestamp(),retryable=false,next_attempt_at=NULL,last_error_code='NOTIFICATION_CANCELLED' WHERE id=$3 AND schema_version=1 AND status IN ('queued','failed') AND cancelled_at IS NULL AND version=$4 AND EXISTS(SELECT 1 FROM authority) RETURNING *),audit AS(INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) SELECT $1,'notification.cancelled','notification',id,jsonb_build_object('changedFields',ARRAY['status']) FROM changed RETURNING id) SELECT EXISTS(SELECT 1 FROM authority) authorized,(SELECT to_jsonb(changed) FROM changed) data`, [actorId, roles, id, version])], { isolationLevel: 'ReadCommitted' }); const row = (result[2] as {
    authorized: boolean;
    data: NotificationRecord | null;
}[])[0]; if (!row.authorized)
    throw new NotificationError('NOTIFICATION_FORBIDDEN'); if (!row.data)
    throw new NotificationError('NOTIFICATION_CONFLICT'); return row.data; }
/** Pass state only (never the token/hash): decides whether the confirmed email links the Event Pass. */
export async function hasActivePass(registrationId: string) { const rows = await query<{
    active: boolean;
}>("SELECT EXISTS(SELECT 1 FROM uss.event_passes p WHERE p.registration_id=$1 AND p.status='active' AND p.format_version=1 AND (p.expires_at IS NULL OR p.expires_at>clock_timestamp())) active", [registrationId]); return rows[0]?.active === true; }
