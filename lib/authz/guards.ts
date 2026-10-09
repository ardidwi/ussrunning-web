import "server-only";
import { query } from "@/lib/db";
import { requireActiveAccount, assertActiveAccount } from "@/lib/auth/guards";
import { AccountError } from "@/lib/auth/errors";
import type { CurrentAccount } from "@/lib/auth/types";
import { AuthorizationError, authorizationOperation } from "./errors";
import { hasPermission, isPermission, isSystemRole, PERMISSIONS } from "./permissions";
import type { Permission, SystemRole } from "./permissions";
export interface AuthorizedAccount {
    account: CurrentAccount;
    roles: SystemRole[];
}
/** Fresh DB account/roles; provider role metadata and supplied request identities are never used. */
export async function getAuthorization(): Promise<AuthorizedAccount> {
    return authorizationOperation(async () => {
        const account = await requireActiveAccount();
        const rows = await query<{
            status: CurrentAccount["status"];
            verified_at: string | null;
            roles: unknown[];
        }>(`
      SELECT a.status, a.email_verified_at AS verified_at,
        COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), ARRAY[]::text[]) AS roles
      FROM uss.accounts a LEFT JOIN uss.account_roles ar ON ar.account_id=a.id
      LEFT JOIN uss.roles r ON r.id=ar.role_id WHERE a.id=$1 GROUP BY a.id`, [account.id]);
        if (!rows[0])
            throw new AccountError("ACCOUNT_NOT_PROVISIONED");
        assertActiveAccount({ ...account, status: rows[0].status, emailVerifiedAt: rows[0].verified_at });
        return { account, roles: rows[0].roles.filter(isSystemRole) };
    });
}
export async function requirePermission(permission: Permission): Promise<AuthorizedAccount> {
    if (!isPermission(permission))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    const context = await getAuthorization();
    if (!hasPermission(context.roles, permission))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    return context;
}
export async function requireAnyPermission(permissions: readonly Permission[]): Promise<AuthorizedAccount> {
    if (!Array.isArray(permissions) || !permissions.length || permissions.length > PERMISSIONS.length || !permissions.every(isPermission))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    const context = await getAuthorization();
    if (!permissions.some(permission => hasPermission(context.roles, permission)))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    return context;
}
/** Reserved backend workflows only; business services prefer requirePermission. No role writes. */
export async function requireRole(role: SystemRole): Promise<AuthorizedAccount> {
    if (!isSystemRole(role))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    const context = await getAuthorization();
    if (!context.roles.includes(role))
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    return context;
}
