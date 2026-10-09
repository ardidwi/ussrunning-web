import "server-only";
import { authorizedRows, UTC_TIMESTAMP } from "@/lib/history/repository";
import type { Permission } from "@/lib/authz/permissions";
import type { RevisionEntity } from "@/lib/history/policy";
import type { validateRevisionList, validateRevisionDetail } from "./revision-validation";
/** Identifiers and JSON keys come exclusively from this closed code-owned map. */
export const REVISION_SOURCES: Readonly<Record<RevisionEntity, {
    table: string;
    parent: string;
    permission: Permission;
    keys: readonly string[];
}>> = {
    site_content: { table: "site_content_revisions", parent: "site_content_id", permission: "cms.content.manage", keys: ["headline", "description", "ctaLabel"] },
    story: { table: "story_revisions", parent: "story_id", permission: "stories.manage", keys: ["title", "slug", "excerpt", "status", "featured", "sponsored"] },
    partner: { table: "partner_revisions", parent: "partner_id", permission: "partners.manage", keys: ["name", "slug", "description", "visible", "featured"] },
    event: { table: "event_revisions", parent: "event_id", permission: "events.manage", keys: ["title", "slug", "summary", "status", "starts_at", "ends_at", "timezone", "venue_name"] },
};
export interface RevisionRow {
    id: string;
    entity_id: string;
    version: number;
    action: string;
    occurred_at: string;
    created_by: string | null;
    display_name: string | null;
    snapshot?: Record<string, unknown>;
}
function projection(kind: RevisionEntity, detail: boolean) {
    const s = REVISION_SOURCES[kind], column = kind === "site_content" ? "content" : "snapshot";
    return `h.id,h.${s.parent} AS entity_id,h.version,${kind === "site_content" ? "h.status" : "h.action"} AS action,${UTC_TIMESTAMP} AS occurred_at,h.created_by,left(a.display_name,241) AS display_name` +
        (detail ? `, COALESCE((SELECT jsonb_object_agg(v.key,v.value) FROM unnest($5::text[]) AS k(key) CROSS JOIN LATERAL (SELECT k.key,h.${column}->k.key AS value) v WHERE jsonb_typeof(v.value) IN ('string','boolean') AND octet_length(v.value::text)<=2048),'{}'::jsonb) AS snapshot` : "");
}
export function readRevisionList(accountId: string, f: ReturnType<typeof validateRevisionList>): Promise<RevisionRow[]> {
    const s = REVISION_SOURCES[f.entity];
    return authorizedRows(accountId, s.permission, `SELECT ${projection(f.entity, false)} FROM uss.${s.table} h LEFT JOIN uss.accounts a ON a.id=h.created_by
 WHERE (SELECT permitted FROM authority) AND h.${s.parent}=$3::uuid AND ($4::integer IS NULL OR h.version<$4 OR (h.version=$4 AND h.id>$5::uuid))
 ORDER BY h.version DESC,h.id ASC LIMIT $6`, [f.entityId, f.cursor?.version ?? null, f.cursor?.id ?? null, f.limit + 1], "version");
}
export function readRevisionDetail(accountId: string, f: ReturnType<typeof validateRevisionDetail>): Promise<RevisionRow[]> {
    const s = REVISION_SOURCES[f.entity];
    return authorizedRows(accountId, s.permission, `SELECT ${projection(f.entity, true)} FROM uss.${s.table} h LEFT JOIN uss.accounts a ON a.id=h.created_by
 WHERE (SELECT permitted FROM authority) AND h.${s.parent}=$3::uuid AND h.id=$4::uuid LIMIT 1`, [f.entityId, f.revisionId, [...s.keys]], "version");
}
