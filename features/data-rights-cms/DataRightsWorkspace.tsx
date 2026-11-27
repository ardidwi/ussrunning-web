import { listDeletionRequests } from "@/lib/data-rights/data-rights-actions";
import { DELETION_STATUSES, type DeletionStatus } from "@/lib/data-rights/data-rights-types";
import { text, type Query } from "@/features/history/query";
import { DataRightsQueue } from "./DataRightsQueue";

/**
 * Admin slot for /admin?module=data-rights (wired by the Admin UI lane). Authorization is enforced by
 * listDeletionRequests/decide/execute on the server; the nav permission only adapts visibility.
 */
export async function DataRightsWorkspace({ query }: { query: Query }) {
  const raw = text(query, "status"), cursor = text(query, "cursor");
  const status = (DELETION_STATUSES as readonly string[]).includes(raw) ? raw as DeletionStatus : "";
  const result = raw && !status
    ? { ok: false as const, code: "DATA_RIGHTS_INVALID_INPUT" as const }
    : await listDeletionRequests({ limit: 20, ...(status ? { status } : {}), ...(cursor ? { cursor } : {}) });
  return <DataRightsQueue result={result} status={status} cursor={cursor} />;
}
