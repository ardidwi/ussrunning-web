import 'server-only';
import { AccountError } from '@/lib/auth/errors';
import { AuthorizationError } from '@/lib/authz/errors';

export const ROLE_CODES = [
  'ROLE_FORBIDDEN',
  'ROLE_TARGET_NOT_FOUND',
  'ROLE_TARGET_INELIGIBLE',
  'ROLE_CONFLICT',
  'ROLE_INVALID_INPUT',
  'ROLE_SELF_ACTION_FORBIDDEN',
  'ROLE_ALREADY_ASSIGNED',
  'ROLE_NOT_ASSIGNED',
  'ROLE_LAST_SUPER_ADMIN',
  'ROLE_BOOTSTRAP_CLOSED',
  'ROLE_UNAVAILABLE',
] as const;
export type RoleCode = typeof ROLE_CODES[number];

export class RoleError extends Error {
  constructor(public readonly code: RoleCode) { super(code); }
}

export async function roleOperation<T>(fn: () => Promise<T>): Promise<T> {
  try { return await fn(); }
  catch (error) {
    if (error instanceof RoleError || error instanceof AccountError) throw error;
    if (error instanceof AuthorizationError) throw new RoleError('ROLE_FORBIDDEN');
    throw new RoleError('ROLE_UNAVAILABLE');
  }
}
