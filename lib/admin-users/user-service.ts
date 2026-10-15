import 'server-only';
import { requirePermission } from '@/lib/authz/guards';
import { isSystemRole } from '@/lib/authz/permissions';
import { userOperation } from './user-errors';
import { userFilters, userRef, userMutation } from './user-validation';
import * as repo from './user-repository';
import type { UserRecord, ManagedUserDTO, UserOperation } from './user-types';
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
