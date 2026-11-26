import "server-only";
import { getSql } from "@/lib/db";
import { rolesForPermission, type Permission } from "@/lib/authz/permissions";
import type { AccountStatus } from "@/lib/db/types";

export type PrivateAvatarRecord = { id: string; storageKey: string; provider: string; width: number; height: number };
const authority = `SELECT a.id FROM uss.accounts a
  WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
    WHERE ar.account_id=a.id AND r.code=ANY($2::text[])
  )`;
export const avatarSql = `jsonb_build_object('id',m.id,'storageKey',m.storage_key,
  'provider',m.storage_provider,'width',m.width,'height',m.height)`;
export const profileVersionSql = "encode(sha256(convert_to((to_jsonb(p) || jsonb_build_object('created_at',extract(epoch FROM p.created_at),'updated_at',extract(epoch FROM p.updated_at),'marketing_consent_at',extract(epoch FROM p.marketing_consent_at),'privacy_consent_at',extract(epoch FROM p.privacy_consent_at),'avatar_reviewed_at',extract(epoch FROM p.avatar_reviewed_at)))::text,'UTF8')),'hex')";

async function transaction<T>(actor: string, permission: Permission, statement: string, params: unknown[], target = actor) {
  const sql = getSql();
  const results = await sql.transaction([
    sql.query("SELECT set_config('lock_timeout','15s',true)"),
    sql.query("SELECT id FROM uss.accounts WHERE id IN ($1,$2) ORDER BY id FOR UPDATE", [actor, target]),
    sql.query(`SELECT ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
      WHERE ar.account_id=$1 FOR SHARE OF ar,r`, [actor]),
    sql.query(statement, [actor, rolesForPermission(permission), ...params]),
  ], { isolationLevel: "ReadCommitted" });
  return (results[3] as T[])[0];
}

const avatarDecision = `CASE WHEN NOT EXISTS (SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
  WHEN NOT EXISTS (SELECT 1 FROM uss.member_profiles WHERE account_id=$1) THEN 'PROFILE_NOT_FOUND'
  WHEN NOT EXISTS (SELECT 1 FROM uss.member_profiles p WHERE account_id=$1 AND ${profileVersionSql}=$3)
    THEN 'AVATAR_CONFLICT'`;

export function reserveAvatarUpload(actor: string, expectedVersion: string) {
  return transaction<{code: string}>(actor, "media.upload.self", `
    WITH authority AS (${authority}), decision AS MATERIALIZED (
      SELECT ${avatarDecision}
        WHEN (SELECT count(*) FROM uss.audit_logs WHERE actor_account_id=$1
          AND action='member.avatar.requested' AND created_at>clock_timestamp()-interval '1 hour')>=6
          THEN 'IDENTITY_RATE_LIMITED'
        ELSE 'OK' END AS code
    ), audit AS (
      INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
      SELECT $1,'member.avatar.requested','member_profile',$1,'{}' FROM decision WHERE code='OK'
    ) SELECT code FROM decision`, [expectedVersion]);
}

export function attachAvatar(actor: string, expectedVersion: string, asset: PrivateAvatarRecord & { bytes: number; checksum: string }) {
  return transaction<{code: string}>(actor, "media.upload.self", `
    WITH authority AS (${authority}), decision AS MATERIALIZED (
      SELECT ${avatarDecision} ELSE 'OK' END AS code
    ), asset AS (
      INSERT INTO uss.media_assets(id,storage_key,storage_provider,mime_type,byte_size,width,height,
        checksum_sha256,visibility,purpose,uploaded_by)
      SELECT $4,$5,$6,'image/webp',$7,$8,$8,$9,'private','member_avatar',$1 FROM decision WHERE code='OK'
      RETURNING id
    ), changed AS (
      UPDATE uss.member_profiles p SET avatar_media_id=asset.id,avatar_status='approved',
        avatar_reviewed_at=NULL,avatar_reviewed_by=NULL,avatar_rejection_reason=NULL
      FROM asset WHERE p.account_id=$1 RETURNING p.account_id,p.avatar_media_id
    ), audit AS (
      INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
      SELECT $1,'member.avatar.uploaded','member_profile',account_id,
        jsonb_build_object('assetId',avatar_media_id,'status','approved','approval','automatic') FROM changed
    ) SELECT code FROM decision`, [
      expectedVersion, asset.id, asset.storageKey, asset.provider, asset.bytes, asset.width, asset.checksum,
    ]);
}

export function reviewAvatar(actor: string, target: string, avatarId: string, status: "approved" | "rejected", reason: string | null) {
  return transaction<{code: string}>(actor, "members.photo.review", `
    WITH authority AS (${authority}), current AS MATERIALIZED (
      SELECT p.avatar_media_id FROM uss.member_profiles p
      JOIN uss.media_assets m ON m.id=p.avatar_media_id
        AND m.uploaded_by=p.account_id AND m.purpose='member_avatar' AND m.status='active'
      WHERE p.account_id=$3
    ), decision AS MATERIALIZED (
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
        WHEN NOT EXISTS (SELECT 1 FROM current) THEN 'PROFILE_NOT_FOUND'
        WHEN NOT EXISTS (SELECT 1 FROM current WHERE avatar_media_id=$4::uuid) THEN 'AVATAR_CONFLICT'
        ELSE 'OK' END AS code
    ), changed AS (
      UPDATE uss.member_profiles p SET avatar_status=$5,avatar_reviewed_by=$1,
        avatar_reviewed_at=clock_timestamp(),avatar_rejection_reason=$6
      FROM decision WHERE decision.code='OK' AND p.account_id=$3
        AND (p.avatar_status IS DISTINCT FROM $5 OR p.avatar_reviewed_at IS NULL)
      RETURNING p.account_id,p.avatar_media_id
    ), audit AS (
      INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
      SELECT $1,'member.avatar.reviewed','member_profile',account_id,
        jsonb_build_object('assetId',avatar_media_id,'status',$5::text,'reason',$6::text) FROM changed
    ) SELECT code FROM decision`, [target, avatarId, status, reason], target);
}

export function findMemberByBarcode(actor: string, barcode: string | null) {
  return transaction<{code: string; data: {
    photo: PrivateAvatarRecord | null; name: string; memberId: string; status: AccountStatus;
  } | null}>(actor, "members.lookup", `
    WITH authority AS (${authority}), quota AS MATERIALIZED (
      SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM authority) THEN 'INSUFFICIENT_PERMISSION'
        WHEN (SELECT count(*) FROM uss.audit_logs WHERE actor_account_id=$1
          AND action='member.barcode.looked_up' AND created_at>clock_timestamp()-interval '1 minute')>=30
          THEN 'IDENTITY_RATE_LIMITED'
        ELSE 'OK' END AS code
    ), found AS MATERIALIZED (
      SELECT a.id, jsonb_build_object('name',COALESCE(NULLIF(btrim(p.full_name),''),a.display_name,'USS member'),
        'memberId',uss.format_member_number(a.member_number),'status',a.status,
        'photo',CASE WHEN m.id IS NOT NULL THEN ${avatarSql} END) AS data
      FROM uss.accounts a LEFT JOIN uss.member_profiles p ON p.account_id=a.id
      LEFT JOIN uss.media_assets m ON m.id=p.avatar_media_id AND p.avatar_status='approved'
        AND m.uploaded_by=a.id AND m.purpose='member_avatar' AND m.status='active'
      WHERE a.barcode_value=$3 AND (SELECT code FROM quota)='OK'
    ), audit AS (
      INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
      SELECT $1,'member.barcode.looked_up','member_profile',found.id,
        jsonb_build_object('outcome',CASE WHEN found.id IS NOT NULL THEN 'found'
          WHEN $3 IS NULL THEN 'invalid' ELSE 'not_found' END)
      FROM quota LEFT JOIN found ON true WHERE quota.code='OK'
    ) SELECT CASE WHEN quota.code<>'OK' THEN quota.code WHEN $3 IS NULL THEN 'BARCODE_INVALID'
      WHEN found.id IS NULL THEN 'MEMBER_NOT_FOUND' ELSE 'OK' END AS code,found.data
    FROM quota LEFT JOIN found ON true`, [barcode]);
}
