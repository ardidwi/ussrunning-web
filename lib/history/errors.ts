import "server-only";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
import type { AuthorizationCode } from "@/lib/authz/errors";
export type HistoryCode = AuthorizationCode | "HISTORY_VALIDATION_ERROR" | "HISTORY_NOT_FOUND" | "HISTORY_UNAVAILABLE";
export class HistoryError extends Error {
    constructor(public readonly code: HistoryCode) { super(code); }
}
export type HistoryResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    code: HistoryCode;
};
export function historyFailure(error: unknown): Extract<HistoryResult<never>, {
    ok: false;
}> {
    if (error instanceof AccountError || error instanceof AuthorizationError || error instanceof HistoryError)
        return { ok: false, code: error.code };
    return { ok: false, code: "HISTORY_UNAVAILABLE" };
}
export async function historyOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    }
    catch (error) {
        if (error instanceof AccountError || error instanceof AuthorizationError || error instanceof HistoryError)
            throw error;
        throw new HistoryError("HISTORY_UNAVAILABLE");
    }
}
