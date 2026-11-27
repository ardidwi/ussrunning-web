import 'server-only';
import { query } from '@/lib/db';
import type { NotificationRecord } from './notification-types';
import { NOTIFICATION_JOB_POLICY } from './notification-job-policy';
const p = NOTIFICATION_JOB_POLICY;
/** Bounded, index-backed scan of due intents. Not a lock: the per-row claim is the concurrency authority. */
export async function listDueNotifications(limit: number) {
    return query<NotificationRecord>(`SELECT d.* FROM uss.notification_deliveries d WHERE d.schema_version=1 AND d.cancelled_at IS NULL AND d.attempt_count<$2
 AND ((d.status='queued' AND COALESCE(d.next_attempt_at,d.queued_at)<=clock_timestamp())
  OR (d.status='failed' AND d.retryable AND d.next_attempt_at<=clock_timestamp())
  OR (d.status='sending' AND d.claimed_at<=clock_timestamp()-make_interval(secs=>$3)))
 ORDER BY COALESCE(d.next_attempt_at,d.queued_at),d.id LIMIT $1`, [limit, p.maxAttempts, p.leaseSeconds]);
}
export async function claimForJob(id: string, hash: string, provider: string) {
    const row = (await query<{ code: string; record: NotificationRecord | null }>('SELECT * FROM uss.claim_notification_for_job($1,$2,$3,$4,$5)', [id, hash, provider, p.leaseSeconds, p.maxAttempts]))[0];
    return row ?? { code: 'NOTIFICATION_UNAVAILABLE', record: null };
}
/** Sanitized outcome. Exponential backoff in SQL; terminal failures are audited (no recipient/content). */
export async function finishJobAttempt(id: string, claimId: string, ok: boolean, messageId: string | null, errorCode: string | null, retryable: boolean) {
    const rows = await query<{ status: string; retryable: boolean }>(`WITH changed AS (UPDATE uss.notification_deliveries SET status=CASE WHEN $3 THEN 'sent' ELSE 'failed' END,
 provider_message_id=CASE WHEN $3 THEN $4 ELSE NULL END,sent_at=CASE WHEN $3 THEN clock_timestamp() END,failed_at=CASE WHEN NOT $3 THEN clock_timestamp() END,
 last_error_code=$5,last_error_summary=CASE WHEN NOT $3 THEN 'Scheduled notification send did not complete.' END,
 retryable=NOT $3 AND $6 AND attempt_count<$7,
 next_attempt_at=CASE WHEN NOT $3 AND $6 AND attempt_count<$7 THEN clock_timestamp()+make_interval(secs=>LEAST($10::double precision,$8::double precision*power($9::double precision,attempt_count-1))) END
 WHERE id=$1 AND claim_id=$2 AND status='sending' AND schema_version=1 RETURNING id,status,retryable,attempt_count,last_error_code),
 audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 SELECT NULL,'notification.failed','notification',id,jsonb_build_object('attemptCount',attempt_count,'errorCode',last_error_code,'initiator','system') FROM changed WHERE status='failed' AND NOT retryable RETURNING id)
 SELECT status,retryable FROM changed`, [id, claimId, ok, messageId, errorCode, retryable, p.maxAttempts, p.baseDelaySeconds, p.backoffFactor, p.maxDelaySeconds]);
    return rows[0] ?? null;
}
/** The confirmed email already linked the pass, so an untouched pass-available intent would be a duplicate. Retained, not deleted. */
export async function mergePassAnnouncement(registrationId: string) {
    await query(`UPDATE uss.notification_deliveries SET cancelled_at=clock_timestamp(),retryable=false,next_attempt_at=NULL,last_error_code='NOTIFICATION_MERGED'
 WHERE schema_version=1 AND registration_id=$1 AND notification_type='event_pass_available' AND status='queued' AND attempt_count=0 AND cancelled_at IS NULL`, [registrationId]);
}
