import 'server-only';
import { requirePermission } from '@/lib/authz/guards';
import { hasPermission, isSystemRole, rolesForPermission } from '@/lib/authz/permissions';
import { maskEmail } from './email-mask';
import { userOperation } from './user-errors';
import { userFilters, userRef, userMutation } from './user-validation';
import * as repo from './user-repository';
import type { UserRecord, ManagedUserDTO, UserOperation, RestrictedMemberDTO, MemberDirectoryEntry, MemberDirectoryPage, MemberDirectoryDetail } from './user-types';
const timestamp = (v: string | null) => v ? new Date(v).toISOString() : null;
function dto(r: UserRecord): ManagedUserDTO {
    return {
        id: r.id, displayName: r.display_name, email: r.email, memberId: r.member_id, status: r.status,
        emailVerified: r.email_verified_at !== null, emailVerifiedAt: timestamp(r.email_verified_at), roles: r.roles.filter(isSystemRole),
        createdAt: timestamp(r.created_at)!, updatedAt: timestamp(r.updated_at)!, statusChangedAt: timestamp(r.status_changed_at), lastLoginAt: timestamp(r.last_login_at), version: r.version,
        profile: { exists: r.profile_exists, fullName: r.full_name, city: r.city, marketingConsent: r.marketing_consent, privacyConsentAt: timestamp(r.privacy_consent_at) }
    };
}
export async function listManagedUsers(input: unknown = {}) {
    return userOperation(async () => {
        const { account } = await requirePermission('users.manage'), f = userFilters(input), rows = await repo.listUsers(account.id, f), page = rows.slice(0, f.limit), last = page.at(-1);
        return { items: page.map(dto), nextCursor: rows.length > f.limit && last ? Buffer.from(JSON.stringify({ at: last.created_at, id: last.id, fingerprint: f.fingerprint })).toString('base64url') : null };
    });
}
export async function getManagedUser(input: unknown) { return userOperation(async () => { const { account } = await requirePermission('users.manage'); return dto(await repo.readUser(account.id, userRef(input).id)); }); }
async function change(input: unknown, operation: UserOperation) {
    return userOperation(async () => {
        const { account } = await requirePermission('users.manage'), v = userMutation(input);
        await repo.mutateUser(account.id, v.id, operation, v.expectedVersion, v.reason);
        return { id: v.id, code: 'USER_STATUS_UPDATED' as const };
        // Do not perform an unguarded post-commit read or pretend provider sessions were revoked.
    });
}
export async function activateUser(input: unknown) { return change(input, 'activate'); }
export async function suspendUser(input: unknown) { return change(input, 'suspend'); }
export async function deactivateUser(input: unknown) { return change(input, 'deactivate'); }

// K-03: members.read gives a restricted directory; users.manage keeps the full managed view.
function restricted(r: UserRecord): RestrictedMemberDTO {
    return {
        id: r.id, displayName: r.display_name, emailMasked: maskEmail(r.email), memberId: r.member_id, status: r.status,
        emailVerified: r.email_verified_at !== null, roles: r.roles.filter(isSystemRole), createdAt: timestamp(r.created_at)!,
        lastLoginAt: timestamp(r.last_login_at), profile: { exists: r.profile_exists, fullName: r.full_name, city: r.city }
    };
}
async function directory() {
    const context = await requirePermission('members.read'), full = hasPermission(context.roles, 'users.manage');
    const scope = full ? { roles: rolesForPermission('users.manage'), emailSearch: true } : { roles: rolesForPermission('members.read'), emailSearch: false };
    const entry = (r: UserRecord): MemberDirectoryEntry => full ? { view: 'full', ...dto(r) } : { view: 'restricted', ...restricted(r) };
    return { actor: context.account.id, full, scope, entry };
}
export async function listMemberDirectory(input: unknown = {}): Promise<MemberDirectoryPage> {
    return userOperation(async () => {
        const d = await directory(), f = userFilters(input), rows = await repo.listUsers(d.actor, f, d.scope), page = rows.slice(0, f.limit), last = page.at(-1);
        return { view: d.full ? 'full' : 'restricted', items: page.map(d.entry), nextCursor: rows.length > f.limit && last ? Buffer.from(JSON.stringify({ at: last.created_at, id: last.id, fingerprint: f.fingerprint })).toString('base64url') : null };
    });
}
export async function getMemberDirectoryEntry(input: unknown): Promise<MemberDirectoryDetail> {
    return userOperation(async () => {
        const d = await directory(), id = userRef(input).id;
        return { member: d.entry(await repo.readUser(d.actor, id, d.scope)), isSelf: id === d.actor };
    });
}
