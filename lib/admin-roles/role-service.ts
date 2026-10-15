import 'server-only';
import { requirePermission } from '@/lib/authz/guards';
import { RoleError, roleOperation } from './role-errors';
import { roleMutation } from './role-validation';
import * as repo from './role-repository';
import { MANAGED_ELEVATED_ROLES, type RoleMutationResult, type RoleOperation, type RolePolicyDTO } from './role-types';

export function rolePolicy(): RolePolicyDTO {
  return {
    assignableRoles: MANAGED_ELEVATED_ROLES,
    immutableBaselineRole: 'member',
    selfMutationAllowed: false,
  };
}

async function change(input: unknown, operation: RoleOperation): Promise<RoleMutationResult> {
  return roleOperation(async () => {
    const { account } = await requirePermission('roles.manage');
    const mutation = roleMutation(input);
    if (mutation.id === account.id) throw new RoleError('ROLE_SELF_ACTION_FORBIDDEN');
    await repo.mutateRole(account.id, mutation.id, operation, mutation.role, mutation.expectedVersion, mutation.reason);
    return { id: mutation.id, role: mutation.role, operation, code: 'ROLE_UPDATED' };
  });
}

export async function grantRole(input: unknown) { return change(input, 'grant'); }
export async function revokeRole(input: unknown) { return change(input, 'revoke'); }
