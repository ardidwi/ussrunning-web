import "server-only";
import { inputObject, entity, uuid, limit, decodeCursor } from "@/lib/history/validation";
import { HistoryError } from "@/lib/history/errors";
export function validateRevisionList(value: unknown) {
    const input = inputObject(value, ["entity", "entityId", "limit", "cursor"]), kind = entity(input.entity), parent = uuid(input.entityId);
    let cursor: {
        version: number;
        id: string;
    } | undefined;
    if (input.cursor !== undefined) {
        const c = decodeCursor(input.cursor, ["entity", "entityId", "version", "id"]);
        if (c.entity !== kind || c.entityId !== parent || typeof c.version !== "number" || !Number.isSafeInteger(c.version) || c.version < 1 || c.version > 2147483647)
            throw new HistoryError("HISTORY_VALIDATION_ERROR");
        cursor = { version: c.version, id: uuid(c.id) };
    }
    return { entity: kind, entityId: parent, limit: limit(input.limit), cursor };
}
export function validateRevisionDetail(value: unknown) { const input = inputObject(value, ["entity", "entityId", "revisionId"]); return { entity: entity(input.entity), entityId: uuid(input.entityId), revisionId: uuid(input.revisionId) }; }
