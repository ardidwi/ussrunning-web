import "server-only";
import { HISTORY_POLICY, REVISION_ENTITIES } from "./policy";
import type { RevisionEntity } from "./policy";
import { HistoryError } from "./errors";
const bad = (): never => { throw new HistoryError("HISTORY_VALIDATION_ERROR"); };
export function inputObject(value: unknown, keys: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype)
        return bad();
    try {
        if (Buffer.byteLength(JSON.stringify(value)) > HISTORY_POLICY.maxInputBytes)
            return bad();
    }
    catch {
        return bad();
    }
    if (Object.keys(value).some(key => !keys.includes(key)))
        return bad();
    return value as Record<string, unknown>;
}
export function uuid(value: unknown): string {
    if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
        return bad();
    return value.toLowerCase();
}
export function limit(value: unknown): number {
    if (value === undefined)
        return HISTORY_POLICY.defaultLimit;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > HISTORY_POLICY.maxLimit)
        return bad();
    return value;
}
export function label(value: unknown): string {
    if (typeof value !== "string" || !/^[a-z][a-z0-9_.]{0,79}$/.test(value))
        return bad();
    return value;
}
export function instant(value: unknown): string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value) || !Number.isFinite(Date.parse(value)))
        return bad();
    // Preserve PostgreSQL microseconds for exact cursor ordering; reject normalized invalid calendar dates.
    if (value.startsWith("0000-") || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19))
        return bad();
    return value;
}
export function entity(value: unknown): RevisionEntity {
    if (typeof value !== "string" || !(REVISION_ENTITIES as readonly string[]).includes(value))
        return bad();
    return value as RevisionEntity;
}
export function encodeCursor(value: Record<string, unknown>): string { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
export function decodeCursor(value: unknown, keys: readonly string[]): Record<string, unknown> {
    if (typeof value !== "string" || value.length > HISTORY_POLICY.maxCursorBytes || !/^[A-Za-z0-9_-]+$/.test(value))
        return bad();
    try {
        const bytes = Buffer.from(value, "base64url");
        if (bytes.toString("base64url") !== value)
            return bad();
        return inputObject(JSON.parse(bytes.toString("utf8")), keys);
    }
    catch {
        return bad();
    }
}
