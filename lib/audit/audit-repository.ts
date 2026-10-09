import "server-only";
import { authorizedRows, UTC_TIMESTAMP } from "@/lib/history/repository";
import { OPERATIONAL_AUDIT_ACTIONS, REVISION_ENTITIES } from "@/lib/history/policy";
import type { validateAuditFilters } from "./audit-validation";
export interface AuditRow {
    id: string;
    actor_account_id: string | null;
    display_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    revision_id: string | null;
    occurred_at: string;
    changed_fields: string[];
}
const SAFE_FIELDS = ["fullName", "phone", "birthDate", "gender", "city", "emergencyContactName", "emergencyContactPhone", "instagramHandle", "jerseySize", "runningPreferences", "avatarMediaId", "marketingConsent", "privacyConsent", "title", "slug", "status", "content", "body", "excerpt", "featured", "sponsored", "description", "visible", "capacity", "starts_at", "ends_at", "name"];
export async function readAudit(accountId: string, broad: boolean, f: ReturnType<typeof validateAuditFilters>): Promise<AuditRow[]> {
    return authorizedRows<AuditRow>(accountId, broad ? "audit.read.all" : "audit.read", `
    SELECT h.id,h.actor_account_id,left(a.display_name,241) AS display_name,h.action,h.entity_type,h.entity_id,h.revision_id,${UTC_TIMESTAMP} AS occurred_at,
      ARRAY(SELECT v.value FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(h.change_summary->'changedFields')='array' THEN jsonb_path_query_array(h.change_summary,'$.changedFields[0 to 31]') ELSE '[]'::jsonb END)
        WITH ORDINALITY AS v(value,ord) WHERE v.ord<=32 AND v.value=ANY($14::text[]) ORDER BY v.ord) AS changed_fields
    FROM uss.audit_logs h LEFT JOIN uss.accounts a ON a.id=h.actor_account_id
    WHERE (SELECT permitted FROM authority) AND h.created_at >= $3::timestamptz AND h.created_at <= $4::timestamptz
      AND ($5::uuid IS NULL OR h.actor_account_id=$5) AND ($6::text IS NULL OR h.action=$6)
      AND ($7::text IS NULL OR h.entity_type=$7) AND ($8::uuid IS NULL OR h.entity_id=$8)
      AND ($9::timestamptz IS NULL OR h.created_at<$9 OR (h.created_at=$9 AND h.id>$10::uuid))
      AND ($11::boolean OR (h.entity_type=ANY($12::text[]) AND h.action=ANY($13::text[]) AND split_part(h.action,'.',1)=h.entity_type))
    ORDER BY h.created_at DESC,h.id ASC LIMIT $15`, [f.from, f.until, f.actorId, f.action, f.entityType, f.entityId, f.cursor?.at ?? null, f.cursor?.id ?? null, broad, [...REVISION_ENTITIES], OPERATIONAL_AUDIT_ACTIONS, SAFE_FIELDS, f.limit + 1]);
}
