import "server-only";
import { query } from "@/lib/db";
import { rolesForPermission } from "@/lib/authz/permissions";
import type { Permission } from "@/lib/authz/permissions";
import { AuthorizationError } from "@/lib/authz/errors";
/** Recheck lifecycle/DB permission in the SAME snapshot as history data, including role revocation races.
 * text is repository-owned SQL only; external values are params. No caller-supplied SQL/identifiers. */
export async function authorizedRows<T>(accountId: string, permission: Permission, text: string, params: unknown[], ordering: "time" | "version" = "time"): Promise<T[]> {
    const rows = await query<{
        permitted: boolean;
        items: T[];
    }>(`
    WITH authority AS MATERIALIZED (SELECT EXISTS (
      SELECT 1 FROM uss.accounts a JOIN uss.account_roles ar ON ar.account_id=a.id
      JOIN uss.roles r ON r.id=ar.role_id WHERE a.id=$1 AND a.status='active'
        AND a.email_verified_at IS NOT NULL AND r.code=ANY($2::text[])
    ) AS permitted), matches AS (${text})
    SELECT permitted, COALESCE((SELECT jsonb_agg(to_jsonb(matches) ORDER BY ${ordering === "version" ? "matches.version" : "matches.occurred_at"} DESC,matches.id ASC) FROM matches),'[]'::jsonb) AS items FROM authority`, [accountId, rolesForPermission(permission), ...params]);
    if (!rows[0]?.permitted)
        throw new AuthorizationError("INSUFFICIENT_PERMISSION");
    return rows[0].items;
}
export const UTC_TIMESTAMP = `to_char(h.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
