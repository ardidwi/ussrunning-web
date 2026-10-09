import "server-only";
import { cache } from "react";
import {
  getAuthorization,
  requireAnyPermission,
  type AuthorizedAccount,
} from "@/lib/authz/guards";
import { PERMISSIONS, hasPermission } from "@/lib/authz/permissions";
import { AuthorizationError, type AuthorizationCode } from "@/lib/authz/errors";
import { AccountError } from "@/lib/auth/errors";
import { CMS_ACCESS, type PermissionSnapshot } from "./model";
export type PermissionResult =
  | { ok: true; data: PermissionSnapshot }
  | { ok: false; code: AuthorizationCode };
function projection(context: AuthorizedAccount): PermissionSnapshot {
  return {
    roles: context.roles,
    permissions: PERMISSIONS.filter((permission) =>
      hasPermission(context.roles, permission),
    ),
    displayName: context.account.displayName || "USS account",
  };
}
async function read(cms: boolean): Promise<PermissionResult> {
  try {
    return {
      ok: true,
      data: projection(
        cms ? await requireAnyPermission(CMS_ACCESS) : await getAuthorization(),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      code:
        error instanceof AccountError || error instanceof AuthorizationError
          ? error.code
          : "AUTHORIZATION_UNAVAILABLE",
    };
  }
}
// Minimal server-issued presentation only; fresh backend actions still enforce their own guards.
export const loadPermissions = cache(() => read(false));
export const loadCmsPermissions = cache(() => read(true));
