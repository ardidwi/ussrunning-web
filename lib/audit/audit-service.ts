import "server-only";
import { requirePermission } from "@/lib/authz/guards";
import { hasPermission } from "@/lib/authz/permissions";
import { historyOperation } from "@/lib/history/errors";
import { encodeCursor } from "@/lib/history/validation";
import { safeText, safeLabel } from "@/lib/history/presentation";
import { validateAuditFilters } from "./audit-validation";
import { readAudit } from "./audit-repository";
import type { AuditPage } from "./audit-types";
export async function listAuditHistory(value: unknown = {}): Promise<AuditPage> {
    return historyOperation(async () => {
        const context = await requirePermission("audit.read"), filters = validateAuditFilters(value);
        const rows = await readAudit(context.account.id, hasPermission(context.roles, "audit.read.all"), filters);
        const shown = rows.slice(0, filters.limit), last = shown.at(-1);
        return { items: shown.map(row => ({ id: row.id, actor: row.actor_account_id ? { accountId: row.actor_account_id, displayName: safeText(row.display_name) } : null,
                action: safeLabel(row.action), entityType: safeLabel(row.entity_type), entityId: row.entity_id, revisionId: row.revision_id, occurredAt: row.occurred_at, metadata: { changedFields: row.changed_fields } })),
            nextCursor: rows.length > filters.limit && last ? encodeCursor({ at: last.occurred_at, id: last.id, from: filters.from, until: filters.until }) : null, window: { from: filters.from, until: filters.until } };
    });
}
