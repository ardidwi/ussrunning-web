import type { MemberProfileDTO } from "./profile-types";
type Profile = MemberProfileDTO["profile"];
/** Recommended UX guidance only. Optional demographics/marketing never gate active membership. */
export const PROFILE_COMPLETION_FIELDS = [
  { key: "fullName", weight: 20, complete: (p: Profile) => Boolean(p.fullName?.trim()) },
  { key: "phone", weight: 20, complete: (p: Profile) => Boolean(p.phone?.trim()) },
  { key: "city", weight: 20, complete: (p: Profile) => Boolean(p.city?.trim()) },
  { key: "emergencyContact", weight: 40, complete: (p: Profile) => Boolean(p.emergencyContactName?.trim() && p.emergencyContactPhone?.trim()) },
] as const;
export function profileCompletion(profile: Profile) {
  return { percentage: PROFILE_COMPLETION_FIELDS.reduce((n, field) => n + (field.complete(profile) ? field.weight : 0), 0), missingFields: PROFILE_COMPLETION_FIELDS.filter(field => !field.complete(profile)).map(field => field.key) };
}
