import type { Permission, SystemRole } from "@/lib/authz/permissions";
export type PermissionSnapshot = {
  roles: readonly SystemRole[];
  permissions: readonly Permission[];
  displayName: string;
};
export function permissionView(snapshot: PermissionSnapshot | null) {
  return {
    can: (permission: Permission) =>
      Boolean(snapshot?.permissions.includes(permission)),
    canAny: (permissions: readonly Permission[]) =>
      permissions.some((permission) =>
        Boolean(snapshot?.permissions.includes(permission)),
      ),
    hasRole: (role: SystemRole) => Boolean(snapshot?.roles.includes(role)),
  };
}
export const CMS_ACCESS: readonly Permission[] = [
  "cms.content.manage",
  "stories.manage",
  "partners.manage",
  "events.manage",
  "audit.read",
  "users.manage",
  "members.lookup",
  "roles.manage",
  "settings.manage",
];
