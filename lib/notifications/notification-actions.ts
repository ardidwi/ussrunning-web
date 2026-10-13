"use server";
import { AccountError } from '@/lib/auth/errors';
import { NotificationError } from './notification-errors';
import * as service from './notification-service';
async function run<T>(fn: () => Promise<T>) { try {
    return { ok: true as const, data: await fn() };
}
catch (e) {
    return { ok: false as const, code: e instanceof NotificationError || e instanceof AccountError ? e.code : 'NOTIFICATION_UNAVAILABLE' };
} }
export async function getManagedNotification(input: unknown) { return run(() => service.getManagedNotification(input)); }
export async function listManagedNotifications(input: unknown = {}) { return run(() => service.listManagedNotifications(input)); }
export async function dispatchManagedNotification(input: unknown) { return run(() => service.dispatchManagedNotification(input)); }
export async function cancelManagedNotification(input: unknown) { return run(() => service.cancelManagedNotification(input)); }
