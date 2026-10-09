"use server";
import { listAuditHistory } from "./audit-service";
import { historyFailure } from "@/lib/history/errors";
import type { HistoryResult } from "@/lib/history/errors";
import type { AuditPage } from "./audit-types";
export async function getAuditHistory(filters: unknown = {}): Promise<HistoryResult<AuditPage>> {
    try {
        return { ok: true, data: await listAuditHistory(filters) };
    }
    catch (error) {
        return historyFailure(error);
    }
}
