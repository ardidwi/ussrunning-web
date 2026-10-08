import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/session";
import type { MemberResult } from "./contract";
// BE-04 is absent. A provider session alone cannot establish verified member status.
// Do not call legacy ensureProfile (which inserts on read) or fabricate completion.
export const loadMember = cache(async (): Promise<MemberResult> => {
  if (!(await getCurrentUser()))
    return { state: "error", code: "UNAUTHENTICATED" };
  return { state: "error", code: "PROFILE_UNAVAILABLE" };
});
