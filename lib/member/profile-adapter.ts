import "server-only";
import { normalizeAuthCode } from "@/lib/auth/auth-errors";
import { profileFields, type MemberResult, type ProfileField, type ProfileIssueField } from "./contract";
import { PROFILE_POLICY } from "./profile-policy";
import type { MemberProfileDTO, ProfileResult } from "./profile-types";
/** Presentation projection only. BE-04 owns authorization, validation and identity. */
export function projectProfile(result: ProfileResult<MemberProfileDTO>): MemberResult {
  if (!result.ok) {
    const fields: Partial<Record<ProfileIssueField, string>> = {};
    for (const key of Object.keys(result.fieldErrors ?? {})) {
      const field = key === "instagramHandle" ? "instagram" : key;
      if (profileFields.includes(field as ProfileField) || ["birthDate","gender","jerseySize","runningPreferences","marketingConsent","privacyConsent"].includes(field)) fields[field as ProfileIssueField] = `Please check ${field.replace(/([A-Z])/g," $1").toLowerCase()} and try again.`;
    }
    const code = result.code === "CONFLICT" ? "PROFILE_CONFLICT"
      : result.code === "PROFILE_VALIDATION_ERROR" ? "VALIDATION_ERROR"
      : ["AUTH_NOT_CONFIGURED", "AUTH_UNAVAILABLE"].includes(result.code) ? "AUTH_UNAVAILABLE"
      : ["PROFILE_NOT_FOUND", "PROFILE_UNAVAILABLE", "MEDIA_NOT_FOUND"].includes(result.code) ? "PROFILE_UNAVAILABLE"
      : normalizeAuthCode(result.code);
    return { state: "error", code, fields };
  }
  const { account, profile, completion } = result.data;
  if (account.status === "suspended") return { state: "error", code: "ACCOUNT_SUSPENDED" };
  if (account.status === "deactivated") return { state: "error", code: "ACCOUNT_DEACTIVATED" };
  if (account.status !== "active" || !account.emailVerified) return { state: "error", code: "EMAIL_NOT_VERIFIED" };
  const missingFields = completion.missingFields.flatMap(field => field === "emergencyContact"
    ? ["emergencyContactName", "emergencyContactPhone"] : [field === "instagramHandle" ? "instagram" : field])
    .filter((field): field is ProfileField => profileFields.includes(field as ProfileField));
  return { state: "ready", profile: {
    memberId: account.memberId, revision: profile.version,
    values: { fullName: profile.fullName ?? "", phone: profile.phone ?? "", city: profile.city ?? "",
      instagram: profile.instagramHandle ?? "", emergencyContactName: profile.emergencyContactName ?? "",
      emergencyContactPhone: profile.emergencyContactPhone ?? "" },
    completion: { percentage: completion.percentage, missingFields },
    details: { birthDate: profile.birthDate ?? "", gender: profile.gender ?? "", jerseySize: profile.jerseySize ?? "", runningPreferences: profile.runningPreferences ?? {}, marketingConsent: profile.marketingConsent === true, privacyAccepted: Boolean(profile.privacyConsentAt) },
    policy: { required: ["fullName"], minimumPhoneDigits: 7, maximumPhoneDigits: 15, maximumBirthDate: new Date().toISOString().slice(0,10),
      maxLengths: { fullName: PROFILE_POLICY.maxName, city: PROFILE_POLICY.maxCity, phone: 40,
        instagram: 31, emergencyContactName: PROFILE_POLICY.maxName, emergencyContactPhone: 40 } },
  } };
}
