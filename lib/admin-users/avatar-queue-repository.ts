import 'server-only';
import { query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import { UserError } from './user-errors';
import type { PrivateAvatarRecord } from '@/lib/member/identity-repository';
import type { AccountStatus } from '@/lib/db/types';

export interface AvatarQueueRecord {
    account_id: string;
    avatar_id: string;
    uploaded_at: string;
    name: string;
    member_id: string;
    status: AccountStatus;
    photo: PrivateAvatarRecord;
}
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
// K-01: uploads are auto-approved; the queue holds owner-uploaded active avatars no staff member has reviewed yet.
export const pendingAvatarSql = `FROM uss.member_profiles p JOIN uss.accounts a ON a.id=p.account_id
 JOIN uss.media_assets m ON m.id=p.avatar_media_id AND m.uploaded_by=p.account_id AND m.purpose='member_avatar' AND m.status='active'
 WHERE p.avatar_media_id IS NOT NULL AND p.avatar_reviewed_at IS NULL AND p.avatar_status IN ('approved','pending_review')`;
const roles = () => rolesForPermission('members.photo.review');

export async function listAvatarQueue(actor: string, limit: number, cursor: { at: string; id: string } | null) {
    const row = (await query<{ authorized: boolean; total: number; items: AvatarQueueRecord[] }>(`WITH authority AS (${authority}), page AS (
 SELECT p.account_id, m.id AS avatar_id, m.created_at AS uploaded_at,
  COALESCE(NULLIF(btrim(p.full_name),''),a.display_name,'USS member') AS name,
  uss.format_member_number(a.member_number) AS member_id, a.status,
  jsonb_build_object('id',m.id,'storageKey',m.storage_key,'provider',m.storage_provider,'width',m.width,'height',m.height) AS photo
 ${pendingAvatarSql} AND EXISTS(SELECT 1 FROM authority)
  AND ($3::timestamptz IS NULL OR m.created_at>$3 OR (m.created_at=$3 AND m.id>$4::uuid))
 ORDER BY m.created_at, m.id LIMIT $5)
 SELECT EXISTS(SELECT 1 FROM authority) AS authorized,
  (SELECT count(*)::int ${pendingAvatarSql} AND EXISTS(SELECT 1 FROM authority)) AS total,
  COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY uploaded_at, avatar_id) FROM page),'[]') AS items`,
        [actor, roles(), cursor?.at ?? null, cursor?.id ?? null, limit + 1]))[0];
    if (!row?.authorized) throw new UserError('USER_FORBIDDEN');
    return row;
}

export async function countAvatarQueue(actor: string): Promise<number> {
    const row = (await query<{ authorized: boolean; total: number }>(`WITH authority AS (${authority})
 SELECT EXISTS(SELECT 1 FROM authority) AS authorized, (SELECT count(*)::int ${pendingAvatarSql} AND EXISTS(SELECT 1 FROM authority)) AS total`,
        [actor, roles()]))[0];
    if (!row?.authorized) throw new UserError('USER_FORBIDDEN');
    return row.total;
}
