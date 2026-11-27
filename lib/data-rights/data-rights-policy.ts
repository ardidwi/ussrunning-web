import { rolesForPermission, type Permission } from "@/lib/authz/permissions";

/**
 * Permission mapping for data-subject rights. lib/authz/permissions.ts is owned by the Admin UI
 * lane; until the dedicated keys below are wired there, the closest existing least-privilege keys
 * are used. Swapping is a one-line change per key here (see handover wiring request):
 *   export  -> "data_rights.export.self"  (member, admin, super_admin)
 *   request -> "data_rights.request.self" (member, admin, super_admin)
 *   manage  -> "data_rights.manage"       (super_admin only)
 * Execution is additionally pinned to the super_admin role inside the database function.
 */
export const DATA_RIGHTS_PERMISSIONS = {
  export: "profile.read.self",
  request: "profile.update.self",
  manage: "users.manage",
} as const satisfies Record<string, Permission>;

export const DATA_RIGHTS_POLICY = {
  exportsPerHour: 3,
  queueDefaultLimit: 20,
  queueMaxLimit: 50,
  maxInputBytes: 4096,
  reasonMax: 500,
  decisionReasonMin: 5,
  executeConfirmation: "ERASE",
} as const;

export function rolesFor(key: keyof typeof DATA_RIGHTS_PERMISSIONS): string[] {
  return rolesForPermission(DATA_RIGHTS_PERMISSIONS[key]);
}
