/** Security-owned policy, not editable/client-provided claims. */
export const PERMISSIONS = ["profile.read.self", "profile.update.self", "member_card.read.self", "cms.content.manage", "stories.manage", "partners.manage", "events.manage", "audit.read", "audit.read.all", "users.manage", "roles.manage", "settings.manage"] as const;
export type Permission = typeof PERMISSIONS[number];
export const SYSTEM_ROLES = ["member", "admin", "super_admin"] as const;
export type SystemRole = typeof SYSTEM_ROLES[number];
const self: readonly Permission[] = ["profile.read.self", "profile.update.self", "member_card.read.self"];
const operational: readonly Permission[] = ["cms.content.manage", "stories.manage", "partners.manage", "events.manage", "audit.read"];
export const ROLE_PERMISSIONS: Readonly<Record<SystemRole, readonly Permission[]>> = {
    member: self, admin: [...self, ...operational], super_admin: [...PERMISSIONS],
};
export function isPermission(value: unknown): value is Permission { return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value); }
export function isSystemRole(value: unknown): value is SystemRole { return typeof value === "string" && (SYSTEM_ROLES as readonly string[]).includes(value); }
export function hasPermission(roles: readonly SystemRole[], permission: Permission): boolean {
    return isPermission(permission) && roles.some(role => isSystemRole(role) && ROLE_PERMISSIONS[role].includes(permission));
}
export function rolesForPermission(permission: Permission): SystemRole[] { return SYSTEM_ROLES.filter(role => hasPermission([role], permission)); }
