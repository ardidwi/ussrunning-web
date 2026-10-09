"use server";
import { listRevisionHistory, getRevisionSnapshot } from "./revision-service";
import { historyFailure } from "@/lib/history/errors";
import type { HistoryResult } from "@/lib/history/errors";
import type { RevisionPage, RevisionDetail } from "./revision-types";
export async function getRevisionHistory(input: unknown): Promise<HistoryResult<RevisionPage>> { try {
    return { ok: true, data: await listRevisionHistory(input) };
}
catch (error) {
    return historyFailure(error);
} }
export async function getHistorySnapshot(input: unknown): Promise<HistoryResult<RevisionDetail>> { try {
    return { ok: true, data: await getRevisionSnapshot(input) };
}
catch (error) {
    return historyFailure(error);
} }
