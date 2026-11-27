"use server";
import { AccountError } from '@/lib/auth/errors';
import { UserError } from './user-errors';
import * as service from './avatar-queue-service';
async function run<T>(fn: () => Promise<T>) {
    try { return { ok: true as const, data: await fn() }; }
    catch (e) { return { ok: false as const, code: e instanceof UserError || e instanceof AccountError ? e.code : 'USER_UNAVAILABLE' as const }; }
}
export async function listAvatarReviewQueue(input: unknown = {}) { return run(() => service.listAvatarReviewQueue(input)); }
