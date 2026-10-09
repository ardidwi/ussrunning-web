import "server-only";
import { cache } from "react";
import { getOwnMemberProfile } from "@/lib/member/profile-actions";
import { dashboardProjection, type DashboardResult } from "../model";
// Request-local only; the canonical owner service performs fresh lifecycle checks.
export const loadDashboard = cache(async (): Promise<DashboardResult> => {
  try {
    return dashboardProjection(await getOwnMemberProfile());
  } catch {
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  }
});
