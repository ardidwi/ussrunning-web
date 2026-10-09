import "server-only";
import { EventError } from "./event-errors";
import { EVENT_POLICY, EVENT_STATUSES } from "./event-policy";
import type { EventContent, EventFilters } from "./event-types";
export function invalid(): never { throw new EventError("EVENT_VALIDATION_ERROR"); }
export function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        invalid();
    try {
        if (Buffer.byteLength(JSON.stringify(value)) > EVENT_POLICY.maxPayloadBytes)
            invalid();
    }
    catch {
        invalid();
    }
    return value as Record<string, unknown>;
}
export function uuid(value: unknown): string { if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))
    invalid(); return value; }
function text(value: unknown, max: number, optional = false): string | null {
    if (optional && (value === null || value === undefined || value === ""))
        return null;
    if (typeof value !== "string")
        invalid();
    const v = value.trim();
    if (!v || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v))
        invalid();
    return v;
}
export function slug(value: unknown): string {
    const v = text(value, 120)!.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[ _]+/g, "-");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))
        invalid();
    return v;
}
function instant(value: unknown, optional = false): string | null {
    if (optional && (value === null || value === undefined))
        return null;
    if (typeof value !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value)))
        invalid();
    const datePart = value.slice(0, 10), [year, month, day] = datePart.split('-').map(Number);
    if (year < 1900 || year > 9999 || new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== datePart)
        invalid();
    return new Date(value).toISOString();
}
export const CONTENT_KEYS = ["slug", "eventType", "title", "summary", "description", "startsAt", "endsAt", "timezone", "venueName", "locationText", "mapUrl", "registrationOpensAt", "registrationClosesAt", "capacity", "waitlistEnabled", "visibility", "coverMediaId"] as const;
export function validateContent(value: unknown): EventContent {
    const v = object(value);
    if (Object.keys(v).some(k => !(CONTENT_KEYS as readonly string[]).includes(k)))
        invalid();
    const timezone = text(v.timezone, 80)!;
    try {
        new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
    }
    catch {
        invalid();
    }
    const startsAt = instant(v.startsAt)!, endsAt = instant(v.endsAt, true), registrationOpensAt = instant(v.registrationOpensAt, true), registrationClosesAt = instant(v.registrationClosesAt, true);
    if (endsAt && endsAt < startsAt || registrationOpensAt && registrationClosesAt && registrationClosesAt < registrationOpensAt)
        invalid();
    if (v.capacity !== null && v.capacity !== undefined && (!Number.isInteger(v.capacity) || Number(v.capacity) <= 0 || Number(v.capacity) > 2147483647))
        invalid();
    if (v.waitlistEnabled !== undefined && typeof v.waitlistEnabled !== "boolean")
        invalid();
    const visibility = v.visibility ?? "public";
    if (!["public", "members_only", "private"].includes(String(visibility)))
        invalid();
    let description: EventContent["description"] = null;
    if (v.description != null) {
        const d = object(v.description);
        if (Object.keys(d).length !== 1 || !Array.isArray(d.paragraphs) || d.paragraphs.length > EVENT_POLICY.maxParagraphs)
            invalid();
        description = { paragraphs: d.paragraphs.map(x => text(x, 2000)!) };
    }
    const mapUrl = text(v.mapUrl, 2048, true);
    if (mapUrl) {
        try {
            const u = new URL(mapUrl);
            if (u.protocol !== "https:" || u.username || u.password)
                invalid();
        }
        catch {
            invalid();
        }
    }
    const eventType = text(v.eventType, 80, true);
    if (eventType && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventType))
        invalid();
    return { slug: slug(v.slug), eventType, title: text(v.title, 200)!, summary: text(v.summary, 1000, true), description, startsAt, endsAt, timezone,
        venueName: text(v.venueName, 200, true), locationText: text(v.locationText, 500, true), mapUrl, registrationOpensAt, registrationClosesAt,
        capacity: v.capacity == null ? null : Number(v.capacity), waitlistEnabled: v.waitlistEnabled === true, visibility: visibility as EventContent["visibility"], coverMediaId: v.coverMediaId == null ? null : uuid(v.coverMediaId) };
}
export function version(value: unknown): string { if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value))
    invalid(); return value; }
export function filters(value: unknown, publicOnly: boolean): EventFilters {
    const v = object(value);
    if (Object.keys(v).some(k => !["limit", "cursor", "eventType", ...(publicOnly ? [] : ["status"])].includes(k)))
        invalid();
    const limit = v.limit ?? EVENT_POLICY.defaultLimit;
    if (!Number.isInteger(limit) || Number(limit) < 1 || Number(limit) > EVENT_POLICY.maxLimit)
        invalid();
    const eventType = text(v.eventType, 80, true);
    if (eventType && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventType))
        invalid();
    if (v.status != null && !EVENT_STATUSES.includes(v.status as never))
        invalid();
    let cursor: EventFilters["cursor"] = null;
    if (v.cursor != null) {
        if (typeof v.cursor !== "string" || v.cursor.length > 400)
            invalid();
        try {
            const c = object(JSON.parse(Buffer.from(v.cursor, "base64url").toString()));
            if (Object.keys(c).sort().join(',') !== "eventType,id,startsAt,status")
                invalid();
            if (c.eventType !== eventType || c.status !== (v.status ?? null))
                invalid();
            instant(c.startsAt);
            cursor = { startsAt: c.startsAt as string, id: uuid(c.id) };
        }
        catch {
            invalid();
        }
    }
    return { limit: Number(limit), cursor, eventType, status: (v.status ?? null) as EventFilters["status"] };
}
