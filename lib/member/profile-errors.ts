import "server-only";
import { AccountError } from "@/lib/auth/errors";
import type { FieldErrors, ProfileErrorCode, ProfileResult } from "./profile-types";
export class ProfileError extends Error {
  constructor(public readonly code: ProfileErrorCode, public readonly fieldErrors?: FieldErrors) { super(code); }
}
export function profileFailure(error: unknown): ProfileResult<never> {
  if (error instanceof ProfileError) return { ok: false, code: error.code, ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}) };
  if (error instanceof AccountError) return { ok: false, code: error.code };
  return { ok: false, code: "PROFILE_UNAVAILABLE" };
}

/** Safe service boundary also protects server-component consumers, not only actions. */
export async function profileOperation<T>(operation: () => Promise<T>): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof ProfileError || error instanceof AccountError) throw error;
    throw new ProfileError("PROFILE_UNAVAILABLE");
  }
}
