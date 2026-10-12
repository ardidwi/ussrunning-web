"use server";
import * as service from './partner-service';
import { PartnerError } from './partner-errors';
import { AccountError } from '@/lib/auth/errors';
import type { PartnerCode } from './partner-errors';
import type { AccountErrorCode } from '@/lib/auth/errors';
export type PartnerResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: PartnerCode | AccountErrorCode;
};
async function run<T>(fn: () => Promise<T>): Promise<PartnerResult<T>> {
    try {
        return { ok: true, data: await fn() };
    }
    catch (e) {
        return { ok: false, code: e instanceof PartnerError || e instanceof AccountError ? e.code : 'PARTNER_UNAVAILABLE' };
    }
}
export async function createPartner(value: unknown) { return run(() => service.createPartner(value)); }
export async function updatePartner(value: unknown) { return run(() => service.updatePartner(value)); }
export async function activatePartner(value: unknown) { return run(() => service.activatePartner(value)); }
export async function deactivatePartner(value: unknown) { return run(() => service.deactivatePartner(value)); }
export async function archivePartner(value: unknown) { return run(() => service.archivePartner(value)); }
export async function getManagedPartner(value: unknown) { return run(() => service.getManagedPartner(value)); }
export async function getPublicPartnerBySlug(value: unknown) { return run(() => service.getPublicPartnerBySlug(value)); }
export async function getManagedEventPartner(value: unknown) { return run(() => service.getManagedEventPartner(value)); }
export async function attachPartnerToEvent(value: unknown) { return run(() => service.attachPartnerToEvent(value)); }
export async function updateEventPartner(value: unknown) { return run(() => service.updateEventPartner(value)); }
export async function detachPartnerFromEvent(value: unknown) { return run(() => service.detachPartnerFromEvent(value)); }
export async function reorderEventPartners(value: unknown) { return run(() => service.reorderEventPartners(value)); }
export async function listManagedEventPartners(value: unknown) { return run(() => service.listManagedEventPartners(value)); }
export async function listEventPartners(value: unknown) { return run(() => service.listEventPartners(value)); }
export async function listManagedPartners(value: unknown = {}) { return run(() => service.listManagedPartners(value)); }
export async function listPublicPartners(value: unknown = {}) { return run(() => service.listPublicPartners(value)); }
