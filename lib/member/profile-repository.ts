import "server-only";
import { getSql, query } from "@/lib/db";
import { avatarSql, profileVersionSql as versionSql, type PrivateAvatarRecord } from "./identity-repository";
import type { AccountStatus } from "@/lib/db/types";
import type { UpdateProfileInput } from "./profile-types";
export interface ProfileRecord {
  id: string; email: string; member_id: string; barcode_value: string; status: AccountStatus; display_name: string | null;
  email_verified_at: string | null; profile: Record<string, unknown> | null; version: string | null;
  avatar: PrivateAvatarRecord | null;
  missing_fields: string[];
}
const readSql = `SELECT a.id,a.email,uss.format_member_number(a.member_number) AS member_id,a.barcode_value,a.status,a.display_name,a.email_verified_at::text,
  to_jsonb(p) AS profile,CASE WHEN p.account_id IS NOT NULL THEN ${versionSql} END AS version,
  uss.member_profile_missing(a.id) AS missing_fields,
  CASE WHEN m.id IS NOT NULL THEN ${avatarSql} END AS avatar
  FROM uss.accounts a LEFT JOIN uss.member_profiles p ON p.account_id=a.id
  LEFT JOIN uss.media_assets m ON m.id=p.avatar_media_id AND m.uploaded_by=a.id AND m.status='active' AND m.purpose='member_avatar'
  WHERE a.id=$1`;
export async function readOwnProfile(accountId: string): Promise<ProfileRecord | undefined> {
  return (await query<ProfileRecord>(readSql, [accountId]))[0];
}
// Structural column mapping is developer-owned, never supplied by a request.
const fields = [
  ["fullName", "full_name", "text"], ["phone", "phone", "text"], ["birthDate", "birth_date", "date"],
  ["gender", "gender", "text"], ["city", "city", "text"], ["emergencyContactName", "emergency_contact_name", "text"],
  ["emergencyContactPhone", "emergency_contact_phone", "text"], ["instagramHandle", "instagram_handle", "text"],
  ["jerseySize", "jersey_size", "text"], ["marketingConsent", "marketing_consent", "boolean"],
] as const;
const proposed = fields.map(([key, column, type]) => `CASE WHEN input.patch ? '${key}' THEN (input.patch->>'${key}')::${type} ELSE p.${column} END AS ${column}`).join(",");
const changed = fields.map(([key, column]) => `CASE WHEN p.${column} IS DISTINCT FROM n.${column} THEN '${key}' END`).join(",");
const setColumns = fields.map(([, column]) => `${column}=n.${column}`).join(",");
const updateSql = `WITH input AS (SELECT $3::jsonb AS patch),
  a AS MATERIALIZED (SELECT id,status,email_verified_at FROM uss.accounts WHERE id=$1),
  p AS MATERIALIZED (SELECT * FROM uss.member_profiles WHERE account_id=$1 FOR UPDATE),
  n AS MATERIALIZED (SELECT p.account_id,${proposed},
    CASE WHEN input.patch ? 'runningPreferences' THEN input.patch->'runningPreferences' ELSE p.running_preferences END AS running_preferences,
    CASE WHEN input.patch ? 'privacyConsent' THEN COALESCE(p.privacy_consent_at,clock_timestamp()) ELSE p.privacy_consent_at END AS privacy_consent_at
    FROM p CROSS JOIN input),
  decision AS MATERIALIZED (SELECT CASE
    WHEN a.status<>'active' OR a.email_verified_at IS NULL THEN 'BLOCKED'
    WHEN p.account_id IS NULL THEN 'PROFILE_NOT_FOUND'
    WHEN ${versionSql}<>$2 THEN 'CONFLICT'
    WHEN (input.patch ? 'emergencyContactName' OR input.patch ? 'emergencyContactPhone') AND
      ((n.emergency_contact_name IS NULL)<>(n.emergency_contact_phone IS NULL)) THEN 'PROFILE_VALIDATION_ERROR'
    ELSE 'OK' END AS code FROM a LEFT JOIN p ON true LEFT JOIN n ON true CROSS JOIN input),
  changes AS MATERIALIZED (SELECT array_remove(ARRAY[${changed},
    CASE WHEN p.running_preferences IS DISTINCT FROM n.running_preferences THEN 'runningPreferences' END,
    CASE WHEN p.privacy_consent_at IS DISTINCT FROM n.privacy_consent_at THEN 'privacyConsent' END],NULL) AS names FROM p JOIN n USING(account_id)),
  updated AS (UPDATE uss.member_profiles target SET ${setColumns},running_preferences=n.running_preferences,privacy_consent_at=n.privacy_consent_at,
    marketing_consent_at=CASE WHEN target.marketing_consent IS DISTINCT FROM n.marketing_consent THEN clock_timestamp() ELSE target.marketing_consent_at END
    FROM n,decision,changes WHERE target.account_id=n.account_id AND decision.code='OK' AND cardinality(changes.names)>0 RETURNING target.account_id),
  audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    SELECT $1,'member.profile.updated','member_profile',$1,jsonb_build_object('fields',changes.names) FROM updated CROSS JOIN changes RETURNING id),
  communication_audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    SELECT $1,'member.communication_preferences.updated','member_profile',$1,jsonb_build_object('fields',ARRAY['marketingConsent']) FROM updated CROSS JOIN changes WHERE 'marketingConsent'=ANY(changes.names) RETURNING id),
  privacy_audit AS (INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    SELECT $1,'member.privacy_consent.accepted','member_profile',$1,jsonb_build_object('fields',ARRAY['privacyConsent']) FROM updated CROSS JOIN changes WHERE 'privacyConsent'=ANY(changes.names) RETURNING id)
  SELECT a.status,a.email_verified_at::text,decision.code FROM a JOIN decision ON true`;
export async function updateOwnProfile(accountId: string, input: UpdateProfileInput) {
  const sql = getSql();
  // Fresh READ COMMITTED snapshot AFTER acquiring account lock, matching BE-03/status lock order.
  const results = await sql.transaction([
    sql.query("SELECT set_config('lock_timeout','15s',true)"),
    sql.query("SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE", [accountId]),
    sql.query(updateSql, [accountId, input.expectedVersion, JSON.stringify(input.changes)]),
  ], { isolationLevel: "ReadCommitted" });
  return (results[2] as { status: AccountStatus; email_verified_at: string | null; code: string }[])[0];
}
