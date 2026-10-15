import 'server-only';
import { query } from '@/lib/db';
import { RoleError, ROLE_CODES } from './role-errors';
import type { ManagedElevatedRole, RoleOperation } from './role-types';

export async function mutateRole(
  actor: string,
  target: string,
  operation: RoleOperation,
  role: ManagedElevatedRole,
  expectedVersion: number,
  reason: string,
) {
  const row = (await query<{ code: string }>(
    'SELECT * FROM uss.manage_role($1,$2,$3,$4,$5,$6)',
    [actor,target,operation,role,expectedVersion,reason],
  ))[0];
  if (row?.code !== 'OK') {
    const code = ROLE_CODES.includes(row?.code as typeof ROLE_CODES[number])
      ? row.code as typeof ROLE_CODES[number]
      : 'ROLE_UNAVAILABLE';
    throw new RoleError(code);
  }
}
