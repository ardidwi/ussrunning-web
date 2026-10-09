import "server-only";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
export type EventErrorCode = "EVENT_VALIDATION_ERROR" | "EVENT_NOT_FOUND" | "EVENT_SLUG_CONFLICT" | "EVENT_CONFLICT" | "EVENT_INVALID_TRANSITION" | "EVENT_MEDIA_NOT_FOUND" | "EVENT_UNAVAILABLE";
export class EventError extends Error {
    constructor(public readonly code: EventErrorCode) { super(code); }
}
export async function eventOperation<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    }
    catch (error) {
        if (error instanceof EventError || error instanceof AccountError || error instanceof AuthorizationError)
            throw error;
        if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
            throw new EventError("constraint" in error && error.constraint === "events_slug_key" ? "EVENT_SLUG_CONFLICT" : "EVENT_CONFLICT");
        }
        throw new EventError("EVENT_UNAVAILABLE");
    }
}
