"use server";
import { createEvent, updateEvent, transitionEvent, getManagedEvent, getPublicEvent, listManagedEvents, listPublicEvents } from "./event-service";
import { EventError } from "./event-errors";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
import type { EventErrorCode } from "./event-errors";
import type { AuthorizationCode } from "@/lib/authz/errors";
export type EventResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: EventErrorCode | AuthorizationCode;
};
async function run<T>(fn: () => Promise<T>): Promise<EventResult<T>> { try {
    return { ok: true, data: await fn() };
}
catch (e) {
    return { ok: false, code: e instanceof EventError || e instanceof AccountError || e instanceof AuthorizationError ? e.code : 'EVENT_UNAVAILABLE' };
} }
export async function createManagedEvent(input: unknown) { return run(() => createEvent(input)); }
export async function updateManagedEvent(input: unknown) { return run(() => updateEvent(input)); }
export async function changeEventLifecycle(input: unknown) { return run(() => transitionEvent(input)); }
export async function getManagedEventDetail(id: unknown) { return run(() => getManagedEvent(id)); }
export async function getPublicEventDetail(slug: unknown) { return run(() => getPublicEvent(slug)); }
export async function getManagedEventList(filters: unknown = {}) { return run(() => listManagedEvents(filters)); }
export async function getPublicEventList(filters: unknown = {}) { return run(() => listPublicEvents(filters)); }
