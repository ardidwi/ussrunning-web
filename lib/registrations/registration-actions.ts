"use server";
import * as service from './registration-service';
import { RegistrationError } from './registration-errors';
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
import type { RegistrationCode } from './registration-errors';
import type { AuthorizationCode } from "@/lib/authz/errors";
export type RegistrationResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: RegistrationCode | AuthorizationCode;
};
async function run<T>(fn: () => Promise<T>): Promise<RegistrationResult<T>> { try {
    return { ok: true, data: await fn() };
}
catch (e) {
    return { ok: false, code: e instanceof RegistrationError || e instanceof AccountError || e instanceof AuthorizationError ? e.code : 'REGISTRATION_UNAVAILABLE' };
} }
export async function registerCurrentAccountForEvent(value: unknown) { return run(() => service.registerOwnEvent(value)); }
export async function cancelCurrentRegistration(value: unknown) { return run(() => service.cancelOwnRegistration(value)); }
export async function cancelEventRegistration(value: unknown) { return run(() => service.cancelManagedRegistration(value)); }
export async function getCurrentRegistration(value: unknown) { return run(() => service.getOwnRegistration(value)); }
export async function getEventRegistration(value: unknown) { return run(() => service.getManagedRegistration(value)); }
export async function getCurrentRegistrationHistory(value: unknown = {}) { return run(() => service.listOwnRegistrations(value)); }
export async function getEventRegistrations(value: unknown) { return run(() => service.listManagedRegistrations(value)); }
export async function getEventParticipants(value: unknown) { return run(() => service.listEventParticipants(value)); }
export async function cancelEventParticipant(value: unknown) { return run(() => service.cancelParticipantRegistration(value)); }
export async function exportEventParticipantsCsv(value: unknown) { return run(() => service.exportEventParticipants(value)); }
