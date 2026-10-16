"use server";
import { AccountError } from '@/lib/auth/errors';
import { RoleError } from './role-errors';
import * as service from './role-service';

async function run<T>(fn: () => Promise<T>) {
  try { return { ok: true as const, data: await fn() }; }
  catch (error) {
    return {
      ok: false as const,
      code: error instanceof RoleError || error instanceof AccountError
        ? error.code
        : 'ROLE_UNAVAILABLE' as const,
    };
  }
}

export async function getRolePolicy() { return run(async () => service.rolePolicy()); }
export async function grantManagedRole(input: unknown) { return run(() => service.grantRole(input)); }
export async function revokeManagedRole(input: unknown) { return run(() => service.revokeRole(input)); }
