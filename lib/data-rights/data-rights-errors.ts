import "server-only";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
import { DATA_RIGHTS_CODES, type DataRightsCode, type DataRightsErrorCode, type DataRightsResult } from "./data-rights-types";

export class DataRightsError extends Error {
  constructor(public readonly code: DataRightsCode) { super(code); this.name = "DataRightsError"; }
}
export function isDataRightsCode(value: unknown): value is DataRightsCode {
  return typeof value === "string" && (DATA_RIGHTS_CODES as readonly string[]).includes(value);
}
/** DB function outcome -> typed error. Unknown codes never leak as-is. */
export function checkOutcome(code: unknown): void {
  if (code === "OK") return;
  throw new DataRightsError(isDataRightsCode(code) ? code : "DATA_RIGHTS_UNAVAILABLE");
}
export async function dataRightsOperation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DataRightsError || error instanceof AccountError) throw error;
    if (error instanceof AuthorizationError) {
      if (error.code === "INSUFFICIENT_PERMISSION") throw new DataRightsError("DATA_RIGHTS_FORBIDDEN");
      if (error.code === "AUTHORIZATION_UNAVAILABLE") throw new DataRightsError("DATA_RIGHTS_UNAVAILABLE");
      throw new AccountError(error.code);
    }
    // Structured, PII-free signal only; never SQL text, parameters or provider messages.
    console.error("Data rights operation failed");
    throw new DataRightsError("DATA_RIGHTS_UNAVAILABLE");
  }
}
export async function dataRightsResult<T>(fn: () => Promise<T>): Promise<DataRightsResult<T>> {
  try {
    return { ok: true, data: await dataRightsOperation(fn) };
  } catch (error) {
    const code: DataRightsErrorCode = error instanceof DataRightsError || error instanceof AccountError ? error.code : "DATA_RIGHTS_UNAVAILABLE";
    return { ok: false, code };
  }
}
