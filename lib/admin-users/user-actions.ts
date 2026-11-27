"use server";
import { AccountError } from '@/lib/auth/errors';
import { UserError } from './user-errors';
import * as service from './user-service';
async function run<T>(fn: () => Promise<T>) { try {
    return { ok: true as const, data: await fn() };
}
catch (e) {
    return { ok: false as const, code: e instanceof UserError || e instanceof AccountError ? e.code : 'USER_UNAVAILABLE' as const };
} }
export async function listManagedUsers(input: unknown = {}) { return run(() => service.listManagedUsers(input)); }
export async function getManagedUser(input: unknown) { return run(() => service.getManagedUser(input)); }
export async function activateUser(input: unknown) { return run(() => service.activateUser(input)); }
export async function suspendUser(input: unknown) { return run(() => service.suspendUser(input)); }
export async function deactivateUser(input: unknown) { return run(() => service.deactivateUser(input)); }
export async function listMemberDirectory(input: unknown = {}) { return run(() => service.listMemberDirectory(input)); }
export async function getMemberDirectoryEntry(input: unknown) { return run(() => service.getMemberDirectoryEntry(input)); }
