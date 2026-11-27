import 'server-only';
import { query } from '@/lib/db';
import { rolesForPermission } from '@/lib/authz/permissions';
import { UserError, USER_CODES } from './user-errors';
import type { UserRecord, UserFilters, UserOperation } from './user-types';
const authority = `SELECT a.id FROM uss.accounts a WHERE a.id=$1 AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=ANY($2::text[]))`;
const projection = `a.id,a.display_name,a.email,uss.format_member_number(a.member_number) AS member_id,a.status,a.email_verified_at,a.created_at,a.updated_at,a.status_changed_at,a.last_login_at,a.version,
 ARRAY(SELECT r.code FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id ORDER BY r.code) roles,
 p.account_id IS NOT NULL profile_exists,p.full_name,p.city,COALESCE(p.marketing_consent,false) marketing_consent,p.privacy_consent_at`;
const roles = rolesForPermission('users.manage');
/** Directory reads: DB authority is rechecked for the permission the service authorized. */
export interface DirectoryScope { roles: readonly string[]; emailSearch: boolean }
const fullScope: DirectoryScope = { roles, emailSearch: true };
export async function readUser(actor: string, id: string, scope: DirectoryScope = fullScope): Promise<UserRecord> {
    const result = (await query<{
        authorized: boolean;
        data: UserRecord | null;
    }>(`WITH authority AS (${authority})
 SELECT EXISTS(SELECT 1 FROM authority) authorized,(SELECT to_jsonb(t) FROM (SELECT ${projection} FROM uss.accounts a LEFT JOIN uss.member_profiles p ON p.account_id=a.id WHERE a.id=$3 AND EXISTS(SELECT 1 FROM authority)) t) data`, [actor, scope.roles, id]))[0];
    if (!result?.authorized)
        throw new UserError('USER_FORBIDDEN');
    if (!result.data)
        throw new UserError('USER_NOT_FOUND');
    return result.data;
}
export async function listUsers(actor: string, f: UserFilters, scope: DirectoryScope = fullScope): Promise<UserRecord[]> {
    // LIKE metacharacters are literal; only server adds the final prefix wildcard.
    const prefix = f.search?.toLowerCase().replace(/[\\%_]/g, '\\$&') + '%';
    const result = (await query<{
        authorized: boolean;
        items: UserRecord[];
    }>(`WITH authority AS (${authority}),page AS (
 SELECT ${projection} FROM uss.accounts a LEFT JOIN uss.member_profiles p ON p.account_id=a.id
 WHERE EXISTS(SELECT 1 FROM authority) AND ($3::text IS NULL OR a.status=$3)
 AND ($4::boolean IS NULL OR (a.email_verified_at IS NOT NULL)=$4)
 AND ($5::text IS NULL OR EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=a.id AND r.code=$5))
 AND ($6::text IS NULL OR ($14::boolean AND a.email=$6::citext) OR uss.format_member_number(a.member_number)=upper($6) OR lower(a.display_name) LIKE $7 ESCAPE '\\')
 AND ($8::text IS NULL OR a.member_id=$8 OR uss.format_member_number(a.member_number)=$8) AND ($9::timestamptz IS NULL OR a.created_at>=$9)
 AND ($10::timestamptz IS NULL OR a.created_at<=$10)
 AND ($11::timestamptz IS NULL OR a.created_at<$11 OR (a.created_at=$11 AND a.id>$12::uuid))
 ORDER BY a.created_at DESC,a.id LIMIT $13)
 SELECT EXISTS(SELECT 1 FROM authority) authorized,COALESCE((SELECT jsonb_agg(to_jsonb(page) ORDER BY created_at DESC,id) FROM page),'[]') items`, [actor, scope.roles, f.status, f.verified, f.role, f.search, prefix, f.memberId, f.createdFrom, f.createdTo, f.cursor?.at ?? null, f.cursor?.id ?? null, f.limit + 1, scope.emailSearch]))[0];
    if (!result?.authorized)
        throw new UserError('USER_FORBIDDEN');
    return result.items;
}
export async function mutateUser(actor: string, id: string, operation: UserOperation, version: number, reason: string) {
    const row = (await query<{
        code: string;
    }>('SELECT * FROM uss.manage_account($1,$2,$3,$4,$5)', [actor, id, operation, version, reason]))[0];
    if (row?.code !== 'OK')
        throw new UserError(USER_CODES.includes(row?.code as typeof USER_CODES[number]) ? row.code as typeof USER_CODES[number] : 'USER_UNAVAILABLE');
}
