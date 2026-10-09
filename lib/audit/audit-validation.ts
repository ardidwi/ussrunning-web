import "server-only";
import { inputObject, limit, instant, uuid, label, decodeCursor } from "@/lib/history/validation";
import { HISTORY_POLICY } from "@/lib/history/policy";
import { HistoryError } from "@/lib/history/errors";
export function validateAuditFilters(value: unknown) {
    const input = inputObject(value, ["limit", "cursor", "from", "until", "actorId", "action", "entityType", "entityId"]);
    let cursor: {
        at: string;
        id: string;
        from: string;
        until: string;
    } | undefined;
    if (input.cursor !== undefined) {
        const c = decodeCursor(input.cursor, ["at", "id", "from", "until"]);
        cursor = { at: instant(c.at), id: uuid(c.id), from: instant(c.from), until: instant(c.until) };
    }
    const until = instant(input.until ?? cursor?.until ?? new Date().toISOString());
    const from = instant(input.from ?? cursor?.from ?? new Date(Date.parse(until) - HISTORY_POLICY.defaultDays * 86400000).toISOString());
    const range = Date.parse(until) - Date.parse(from);
    if (range < 0 || range > HISTORY_POLICY.maxDays * 86400000 || (cursor && (cursor.from !== from || cursor.until !== until || Date.parse(cursor.at) < Date.parse(from) || Date.parse(cursor.at) > Date.parse(until))))
        throw new HistoryError("HISTORY_VALIDATION_ERROR");
    return { limit: limit(input.limit), from, until, cursor, actorId: input.actorId === undefined ? null : uuid(input.actorId), action: input.action === undefined ? null : label(input.action),
        entityType: input.entityType === undefined ? null : label(input.entityType), entityId: input.entityId === undefined ? null : uuid(input.entityId) };
}
