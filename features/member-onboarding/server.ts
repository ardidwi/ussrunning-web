import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getOwnMemberProfile } from "@/lib/member/profile-actions";
import { ownRecord } from "@/lib/member/member-read";

export const loadOnboarding = cache(getOwnMemberProfile);
const snapshot = cache(async () => {
  try { return await ownRecord(); } catch { return null; }
});

export async function redirectIncompleteMember() {
  const record = await snapshot();
  if (record?.missing_fields.length) redirect("/dashboard/onboarding");
}
