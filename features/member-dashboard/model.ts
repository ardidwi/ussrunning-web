import type {
  AvatarDTO,
  MemberProfileDTO,
  ProfileResult,
  ProfileErrorCode,
} from "@/lib/member/profile-types";
/** Small owner-only presentation; contact data, version and barcode never enter the overview. */
export type DashboardMember = {
  displayName: string;
  memberId: string;
  status: "active";
  emailVerified: true;
  avatar: AvatarDTO | null;
  completion: MemberProfileDTO["completion"];
};
export type DashboardErrorCode =
  ProfileErrorCode | "INSUFFICIENT_PERMISSION" | "NETWORK_ERROR";
export type DashboardResult =
  { ok: true; data: DashboardMember } | { ok: false; code: DashboardErrorCode };
export type DashboardState =
  { phase: "loading" } | { phase: "settled"; result: DashboardResult };
export function dashboardProjection(
  result: ProfileResult<MemberProfileDTO>,
): DashboardResult {
  if (!result || typeof result !== "object")
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  if (!result.ok) return { ok: false, code: result.code };
  const data = result.data;
  if (!data?.account || !data.profile || !data.completion)
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  const { account, profile, completion } = data;
  if (
    (profile.fullName !== null && typeof profile.fullName !== "string") ||
    (account.displayName !== null && typeof account.displayName !== "string")
  )
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  if (account.status === "suspended")
    return { ok: false, code: "ACCOUNT_SUSPENDED" };
  if (account.status === "deactivated")
    return { ok: false, code: "ACCOUNT_DEACTIVATED" };
  if (
    account.status === "pending_verification" ||
    account.emailVerified !== true
  )
    return { ok: false, code: "EMAIL_NOT_VERIFIED" };
  if (
    account.status !== "active" ||
    typeof account.memberId !== "string" ||
    !account.memberId.trim() ||
    !Number.isFinite(completion.percentage) ||
    completion.percentage < 0 ||
    completion.percentage > 100 ||
    !Array.isArray(completion.missingFields) ||
    !completion.missingFields.every((field) => typeof field === "string")
  )
    return { ok: false, code: "PROFILE_UNAVAILABLE" };
  return {
    ok: true,
    data: {
      displayName:
        profile.fullName?.trim() ||
        account.displayName?.trim() ||
        account.memberId,
      memberId: account.memberId,
      status: "active",
      emailVerified: true,
      avatar: profile.avatar,
      completion: {
        percentage: completion.percentage,
        missingFields: [...completion.missingFields],
      },
    },
  };
}
const completionLabels: Record<string, string> = {
  fullName: "your full name",
  phone: "a phone number",
  city: "your city",
  emergencyContact: "an emergency contact",
};
export function completionGuidance(completion: DashboardMember["completion"]) {
  if (!completion.missingFields.length)
    return "Your profile is up to date. Keep your details current before your next run.";
  const labels = completion.missingFields
    .map((field) => completionLabels[field])
    .filter(Boolean);
  return labels.length === completion.missingFields.length
    ? `Next, add ${labels.join(", ")}.`
    : "Review your profile to see which details still need updating.";
}
