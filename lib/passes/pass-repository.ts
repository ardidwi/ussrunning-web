import "server-only";
import { getSql } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import type { PassRecord, PassResolution } from './pass-types';
export type PassMode = 'issue' | 'read' | 'revoke' | 'resolve';
type Request = {
  actorId: string; managed: boolean; eventId: string; registrationId?: string;
  mode: PassMode; passId?: string; lookupHash?: string;
  candidate?: {id:string;hash:string;keyId:string};
};
export type PassEffect<T> = { ctes: string; resultSql: string; params: unknown[] };
type Result<T> = {code:string;data:PassRecord|null;resolution:PassResolution|null;effect:T};
const roles=rolesForPermission('events.manage');
const allowedEvents=['published','registration_open','registration_closed'];
const utc=(c:string)=>`to_char(${c} AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const projection=`jsonb_build_object('id',p.id,'registrationId',p.registration_id,'eventId',p.event_id,
 'status',p.status,'issuedAt',${utc('p.issued_at')},'expiresAt',${utc('p.expires_at')},'revokedAt',${utc('p.revoked_at')},
 'revokedReason',p.revoked_reason,'formatVersion',p.format_version,'tokenKeyId',p.token_key_id,'tokenHash',p.token_hash)`;
export async function passTransaction<T = null>(v:Request,effect?:PassEffect<T>):Promise<Result<T>> {
 const sql=getSql();
 const statement=`WITH authority AS MATERIALIZED (
 SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL
 AND (NOT $2 OR EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=a.id AND role.code=ANY($3::text[])))),
 registration AS MATERIALIZED (
 SELECT r.* FROM uss.event_registrations r WHERE r.event_id=$4 AND ($2 OR r.account_id=$1)
 AND r.id=CASE WHEN $6='resolve' THEN (SELECT p.registration_id FROM uss.event_passes p WHERE p.token_hash=$11 AND p.event_id=$4) ELSE $5::uuid END FOR UPDATE),
 event AS MATERIALIZED(SELECT * FROM uss.events WHERE id=$4),
 current AS MATERIALIZED(SELECT p.* FROM uss.event_passes p JOIN registration r ON r.id=p.registration_id WHERE p.event_id=$4 FOR UPDATE OF p),
 decision AS MATERIALIZED(SELECT CASE
 WHEN NOT EXISTS(SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
 WHEN NOT EXISTS(SELECT 1 FROM registration) THEN 'EVENT_PASS_NOT_FOUND'
 WHEN $6='revoke' AND (NOT EXISTS(SELECT 1 FROM current) OR (SELECT id FROM current)<>$10) THEN 'EVENT_PASS_NOT_FOUND'
 WHEN $6='revoke' AND (SELECT status FROM current)='expired' THEN 'EVENT_PASS_EXPIRED'
 WHEN $6='revoke' THEN 'OK'
 WHEN $6<>'issue' AND NOT EXISTS(SELECT 1 FROM current) THEN 'EVENT_PASS_NOT_FOUND'
 WHEN (SELECT status FROM current)='revoked' THEN 'EVENT_PASS_REVOKED'
 WHEN (SELECT status FROM current)='expired' OR clock_timestamp()>=(SELECT expires_at FROM current) THEN 'EVENT_PASS_EXPIRED'
 WHEN EXISTS(SELECT 1 FROM current WHERE format_version<>1) THEN 'EVENT_PASS_PROTOCOL_UNSUPPORTED'
 WHEN (SELECT status FROM registration)<>'confirmed' OR (SELECT cancelled_at FROM registration) IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM uss.accounts a JOIN registration r ON a.id=r.account_id WHERE a.status='active' AND a.email_verified_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM event WHERE status=ANY($12::text[]) AND archived_at IS NULL AND visibility<>'private' AND eligibility_config='{}'::jsonb AND (ends_at IS NULL OR ends_at>clock_timestamp())) THEN 'EVENT_PASS_NOT_ELIGIBLE'
 ELSE 'OK' END code),
 inserted AS (INSERT INTO uss.event_passes(id,registration_id,event_id,token_hash,format_version,token_key_id,expires_at)
 SELECT $7,r.id,$4,$8,1,$9,e.ends_at FROM registration r,event e,decision d
 WHERE d.code='OK' AND $6='issue' AND NOT EXISTS(SELECT 1 FROM current) RETURNING *),
 updated AS (UPDATE uss.event_passes p SET status='revoked',revoked_at=clock_timestamp(),revoked_reason='admin_revoked'
 FROM current c,decision d WHERE p.id=c.id AND d.code='OK' AND $6='revoke' AND c.status='active' RETURNING p.*),
 changes AS MATERIALIZED(SELECT * FROM inserted UNION ALL SELECT * FROM updated),
 audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 SELECT $1,CASE WHEN $6='issue' THEN 'event_pass.issued' ELSE 'event_pass.revoked' END,'event_pass',p.id,
 jsonb_build_object('registrationId',p.registration_id,'eventId',p.event_id,'formatVersion',p.format_version,'initiator',CASE WHEN $2 THEN 'admin' ELSE 'owner' END,'reason',p.revoked_reason)
 FROM changes p RETURNING id),
 resolved AS (SELECT * FROM changes UNION ALL SELECT * FROM current WHERE NOT EXISTS(SELECT 1 FROM changes))
 ${effect ? ',' + effect.ctes : ''}
 SELECT d.code,(SELECT ${projection} FROM resolved p WHERE d.code='OK') data,
 (SELECT jsonb_build_object('passId',p.id,'registrationId',r.id,'eventId',r.event_id,'accountId',r.account_id,'formatVersion',p.format_version)
 FROM resolved p JOIN registration r ON r.id=p.registration_id WHERE d.code='OK' AND $6='resolve') resolution,${effect ? '(' + effect.resultSql + ')' : 'NULL'} AS effect FROM decision d`;
 const results=await sql.transaction([
  sql.query("SELECT set_config('lock_timeout','15s',true)"),
  // Account locks precede event/registration/pass locks, including the managed target account.
  sql.query(`SELECT a.id FROM uss.accounts a WHERE a.id IN (SELECT $1::uuid UNION
   SELECT r.account_id FROM uss.event_registrations r WHERE r.event_id=$3 AND ($5 OR r.account_id=$1)
   AND r.id=COALESCE($2::uuid,(SELECT p.registration_id FROM uss.event_passes p WHERE p.token_hash=$4 AND p.event_id=$3)))
   ORDER BY a.id FOR UPDATE`,[v.actorId,v.registrationId??null,v.eventId,v.lookupHash??null,v.managed]),
  sql.query('SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=$1 FOR SHARE OF ar,role',[v.actorId]),
  sql.query('SELECT id FROM uss.events WHERE id=$1 FOR UPDATE',[v.eventId]),
  // Separate fresh READ COMMITTED statement after lock wait: observes cancellation and previous issuance.
  sql.query(statement,[v.actorId,v.managed,roles,v.eventId,v.registrationId??null,v.mode,v.candidate?.id??null,v.candidate?.hash??null,v.candidate?.keyId??null,v.passId??null,v.lookupHash??null,allowedEvents,...(effect?.params??[])]),
 ],{isolationLevel:'ReadCommitted'});
 return (results[4] as Result<T>[])[0];
}
