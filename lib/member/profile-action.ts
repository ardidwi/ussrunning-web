"use server";
import { getCurrentUser } from "@/lib/session";
import type { MemberResult, ProfileValues } from "./contract";
// Replace this boundary with BE-04's authorized mutation once its contract exists.
// Unsupported updates are not sent to the legacy database action.
export async function saveProfile(
  _values: ProfileValues,
  _revision: string,
): Promise<MemberResult> {
  if (!(await getCurrentUser()))
    return { state: "error", code: "UNAUTHENTICATED" };
  return { state: "error", code: "PROFILE_UNAVAILABLE" };
}
