import 'server-only';
import type {PassEffect} from '@/lib/passes/pass-repository';
import type {ScanEffect} from './check-in-types';
import {scanLimitConfig} from './check-in-config';
/** Composed into BE-09's final post-lock statement. Every value remains parameterized. */
export function attendanceEffect():PassEffect<ScanEffect>{
 const config=scanLimitConfig();
 return {params:[config.max,config.seconds],ctes:`
 scan_rate AS (INSERT INTO uss.check_in_scan_limits(actor_account_id,event_id,attempts)
 SELECT $1,$4,1 FROM authority,event
 ON CONFLICT(actor_account_id,event_id) DO UPDATE SET
 attempts=CASE WHEN check_in_scan_limits.window_started_at+make_interval(secs=>$14::int)<=clock_timestamp() THEN 1 ELSE LEAST(check_in_scan_limits.attempts+1,$13::int+1) END,
 window_started_at=CASE WHEN check_in_scan_limits.window_started_at+make_interval(secs=>$14::int)<=clock_timestamp() THEN clock_timestamp() ELSE check_in_scan_limits.window_started_at END
 RETURNING *),
 scan_decision AS MATERIALIZED(SELECT CASE
 WHEN EXISTS(SELECT 1 FROM scan_rate WHERE attempts>$13) THEN 'CHECK_IN_RATE_LIMITED'
 WHEN d.code='INSUFFICIENT_PERMISSION' THEN 'FORBIDDEN'
 WHEN d.code='EVENT_PASS_NOT_FOUND' AND EXISTS(SELECT 1 FROM uss.event_passes WHERE token_hash=$11 AND event_id<>$4) THEN 'WRONG_EVENT'
 WHEN EXISTS(SELECT 1 FROM registration WHERE status='cancelled' OR cancelled_at IS NOT NULL) THEN 'REGISTRATION_CANCELLED'
 WHEN EXISTS(SELECT 1 FROM registration WHERE status<>'confirmed') THEN 'REGISTRATION_NOT_CONFIRMED'
 WHEN EXISTS(SELECT 1 FROM uss.accounts a JOIN registration r ON a.id=r.account_id WHERE a.status<>'active' OR a.email_verified_at IS NULL) THEN 'ACCOUNT_INELIGIBLE'
 WHEN d.code<>'OK' THEN CASE d.code WHEN 'EVENT_PASS_REVOKED' THEN 'PASS_REVOKED' WHEN 'EVENT_PASS_EXPIRED' THEN 'PASS_EXPIRED' WHEN 'EVENT_PASS_NOT_ELIGIBLE' THEN 'ACCOUNT_INELIGIBLE' ELSE 'PASS_INVALID' END
 WHEN NOT (SELECT checkin_enabled FROM event) THEN 'CHECK_IN_DISABLED'
 WHEN (SELECT COALESCE(checkin_closes_at,ends_at) FROM event) IS NULL
 OR (SELECT COALESCE(checkin_closes_at,ends_at)<=COALESCE(checkin_opens_at,starts_at) FROM event) THEN 'CHECK_IN_WINDOW_UNCONFIGURED'
 WHEN clock_timestamp()<(SELECT COALESCE(checkin_opens_at,starts_at) FROM event) THEN 'CHECK_IN_NOT_OPEN'
 WHEN clock_timestamp()>=(SELECT COALESCE(checkin_closes_at,ends_at) FROM event) THEN 'CHECK_IN_CLOSED'
 WHEN EXISTS(SELECT 1 FROM uss.check_ins c JOIN registration r ON c.registration_id=r.id) THEN 'ALREADY_CHECKED_IN'
 ELSE 'CHECK_IN_SUCCESS' END code FROM decision d),
 attendance_insert AS (INSERT INTO uss.check_ins(registration_id,event_id,event_pass_id,checked_in_by,checked_in_at)
 SELECT r.id,$4,p.id,$1,clock_timestamp() FROM registration r,resolved p,scan_decision sd
 WHERE sd.code='CHECK_IN_SUCCESS' RETURNING *),
 attendance_audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 SELECT $1,'check_in.created','check_in',c.id,jsonb_build_object('eventId',c.event_id,'registrationId',c.registration_id,'passId',c.event_pass_id)
 FROM attendance_insert c RETURNING id),
 attendance AS MATERIALIZED(SELECT * FROM attendance_insert UNION ALL
 SELECT c.* FROM uss.check_ins c JOIN registration r ON r.id=c.registration_id WHERE NOT EXISTS(SELECT 1 FROM attendance_insert))`,
 resultSql:`SELECT jsonb_build_object('code',sd.code,'retryAfterSeconds',COALESCE((SELECT GREATEST(1,ceil(extract(epoch FROM window_started_at+make_interval(secs=>$14::int)-clock_timestamp())))::int FROM scan_rate),0),
 'data',(SELECT jsonb_build_object('event',jsonb_build_object('id',e.id,'title',e.title,'timezone',e.timezone),
 'member',jsonb_build_object('memberId',a.member_id,'displayName',COALESCE(NULLIF(trim(a.display_name),''),a.member_id)),
 'registration',jsonb_build_object('id',r.id,'status',r.status),
 'checkIn',jsonb_build_object('id',c.id,'passId',c.event_pass_id,'checkedInAt',to_char(c.checked_in_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'status','checked_in'))
 FROM attendance c JOIN registration r ON r.id=c.registration_id JOIN uss.accounts a ON a.id=r.account_id CROSS JOIN event e
 WHERE sd.code IN('CHECK_IN_SUCCESS','ALREADY_CHECKED_IN'))) FROM scan_decision sd`};
}
