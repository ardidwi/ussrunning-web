import type { SystemRole } from '@/lib/authz/permissions';

export const MANAGED_ELEVATED_ROLES = ['admin','super_admin'] as const;
export type ManagedElevatedRole = typeof MANAGED_ELEVATED_ROLES[number];
export type RoleOperation = 'grant' | 'revoke';

export interface RoleMutation {
  id: string;
  role: ManagedElevatedRole;
  expectedVersion: number;
  reason: string;
}

export interface RoleMutationResult {
  id: string;
  role: ManagedElevatedRole;
  operation: RoleOperation;
  code: 'ROLE_UPDATED';
}

export interface RolePolicyDTO {
  assignableRoles: readonly ManagedElevatedRole[];
  immutableBaselineRole: Extract<SystemRole,'member'>;
  selfMutationAllowed: false;
}
