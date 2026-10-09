import "server-only";
import { requireAnyPermission } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { AuthorizationError } from "@/lib/authz/errors";
import { historyOperation, HistoryError } from "@/lib/history/errors";
import { encodeCursor } from "@/lib/history/validation";
import { safeText, safeLabel } from "@/lib/history/presentation";
import { validateRevisionList, validateRevisionDetail } from "./revision-validation";
import { REVISION_SOURCES, readRevisionList, readRevisionDetail } from "./revision-repository";
import type { RevisionRow } from "./revision-repository";
import type { RevisionMetadata, RevisionPage, RevisionDetail } from "./revision-types";
const metadata = (row: RevisionRow): RevisionMetadata => ({ id: row.id, entityId: row.entity_id, version: row.version, action: safeLabel(row.action), occurredAt: row.occurred_at,
    actor: row.created_by ? { accountId: row.created_by, displayName: safeText(row.display_name) } : null });
async function protectedInput() { return requireAnyPermission(["cms.content.manage", "stories.manage", "partners.manage", "events.manage"]); }
export async function listRevisionHistory(value: unknown): Promise<RevisionPage> {
    return historyOperation(async () => {
        const context = await protectedInput(), f = validateRevisionList(value);
        if (!hasPermission(context.roles, REVISION_SOURCES[f.entity].permission))
            throw new AuthorizationError("INSUFFICIENT_PERMISSION");
        const rows = await readRevisionList(context.account.id, f), shown = rows.slice(0, f.limit), last = shown.at(-1);
        return { entity: f.entity, items: shown.map(metadata), nextCursor: rows.length > f.limit && last ? encodeCursor({ entity: f.entity, entityId: f.entityId, version: last.version, id: last.id }) : null };
    });
}
export async function getRevisionSnapshot(value: unknown): Promise<RevisionDetail> {
    return historyOperation(async () => {
        const context = await protectedInput(), f = validateRevisionDetail(value);
        if (!hasPermission(context.roles, REVISION_SOURCES[f.entity].permission))
            throw new AuthorizationError("INSUFFICIENT_PERMISSION");
        const row = (await readRevisionDetail(context.account.id, f))[0];
        if (!row)
            throw new HistoryError("HISTORY_NOT_FOUND");
        const raw = row.snapshot ?? {}, text = (key: string) => safeText(raw[key], 2000) ?? undefined, flag = (key: string) => typeof raw[key] === "boolean" ? raw[key] as boolean : undefined;
        const base = { metadata: metadata(row), snapshotScope: "safe_preview" as const };
        switch (f.entity) {
            case "site_content": return { ...base, entity: f.entity, snapshot: { headline: text("headline"), description: text("description"), ctaLabel: text("ctaLabel") } };
            case "story": return { ...base, entity: f.entity, snapshot: { title: text("title"), slug: text("slug"), excerpt: text("excerpt"), status: text("status"), featured: flag("featured"), sponsored: flag("sponsored") } };
            case "partner": return { ...base, entity: f.entity, snapshot: { name: text("name"), slug: text("slug"), description: text("description"), visible: flag("visible"), featured: flag("featured") } };
            case "event": return { ...base, entity: f.entity, snapshot: { title: text("title"), slug: text("slug"), summary: text("summary"), status: text("status"), startsAt: text("starts_at"), endsAt: text("ends_at"), timezone: text("timezone"), venueName: text("venue_name") } };
        }
    });
}
