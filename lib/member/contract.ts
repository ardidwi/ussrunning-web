import { normalizeAuthCode, type AuthErrorCode } from "@/lib/auth/auth-errors";
// Provisional presentation contract, not a production API or schema.
// "ready" may only be issued after server-authorized active/verified own-profile access.
// Limit editable fields to those already present in the legacy profile scaffold.
export type ProfileValues = {
  fullName: string;
  phone: string;
  city: string;
  instagram: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};
export type ProfileField = keyof ProfileValues;
export type ProfilePolicy = {
  required: ProfileField[];
  maxLengths: Record<ProfileField, number>;
  minimumPhoneDigits: number;
  maximumPhoneDigits: number;
};
export type MemberProfile = {
  values: ProfileValues;
  memberId: string;
  revision: string;
  completion: { percentage: number; missingFields: ProfileField[] };
  policy: ProfilePolicy;
};
export type MemberErrorCode =
  AuthErrorCode | "PROFILE_UNAVAILABLE" | "PROFILE_CONFLICT";
export type MemberResult =
  | { state: "ready"; profile: MemberProfile }
  | {
      state: "error";
      code: MemberErrorCode;
      fields?: Partial<Record<ProfileField, string>>;
    };
export type ProfileAdapter = (
  values: ProfileValues,
  revision: string,
) => Promise<MemberResult>;
export const profileLabels: Record<ProfileField, string> = {
  fullName: "Full name",
  phone: "Phone",
  city: "City",
  instagram: "Instagram",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
};
export const profileFields = Object.keys(profileLabels) as ProfileField[];
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function decodeMemberResult(raw: unknown): MemberResult {
  if (!record(raw)) return { state: "error", code: "UNKNOWN_ERROR" };
  if (raw.state === "error") {
    // Field messages are owned here: raw upstream text is never shown.
    const fields: Partial<Record<ProfileField, string>> = {};
    if (record(raw.fields))
      for (const field of profileFields)
        if (raw.fields[field])
          fields[field] =
            `Please check ${profileLabels[field].toLowerCase()} and try again.`;
    return {
      state: "error",
      code:
        raw.code === "PROFILE_UNAVAILABLE" || raw.code === "PROFILE_CONFLICT"
          ? raw.code
          : normalizeAuthCode(raw.code),
      fields,
    };
  }
  const p = raw.profile;
  if (
    raw.state !== "ready" ||
    !record(p) ||
    !record(p.values) ||
    !record(p.completion) ||
    !record(p.policy) ||
    !record(p.policy.maxLengths)
  )
    return { state: "error", code: "UNKNOWN_ERROR" };
  const v = p.values,
    c = p.completion,
    policy = p.policy,
    max = policy.maxLengths as Record<string, unknown>;
  if (
    typeof p.memberId !== "string" ||
    !p.memberId ||
    p.memberId.length > 100 ||
    typeof p.revision !== "string" ||
    !p.revision ||
    p.revision.length > 200 ||
    profileFields.some(
      (f) => typeof v[f] !== "string" || (v[f] as string).length > 1000,
    ) ||
    typeof c.percentage !== "number" ||
    !Number.isFinite(c.percentage) ||
    c.percentage < 0 ||
    c.percentage > 100 ||
    !Array.isArray(c.missingFields) ||
    c.missingFields.some((f) => !profileFields.includes(f)) ||
    !Array.isArray(policy.required) ||
    policy.required.some((f) => !profileFields.includes(f)) ||
    profileFields.some(
      (f) =>
        typeof max[f] !== "number" ||
        !Number.isInteger(max[f]) ||
        Number(max[f]) < 1 ||
        Number(max[f]) > 1000,
    ) ||
    typeof policy.minimumPhoneDigits !== "number" ||
    typeof policy.maximumPhoneDigits !== "number" ||
    !Number.isInteger(policy.minimumPhoneDigits) ||
    !Number.isInteger(policy.maximumPhoneDigits) ||
    policy.minimumPhoneDigits < 1 ||
    policy.maximumPhoneDigits > 30 ||
    policy.minimumPhoneDigits > policy.maximumPhoneDigits
  )
    return { state: "error", code: "UNKNOWN_ERROR" };
  // Whitelist DTO fields; barcode payload, roles and upstream extras never enter UI.
  return {
    state: "ready",
    profile: {
      memberId: p.memberId,
      revision: p.revision,
      values: Object.fromEntries(
        profileFields.map((f) => [f, v[f]]),
      ) as ProfileValues,
      completion: { percentage: c.percentage, missingFields: c.missingFields },
      policy: {
        required: policy.required,
        maxLengths: Object.fromEntries(
          profileFields.map((f) => [f, max[f]]),
        ) as Record<ProfileField, number>,
        minimumPhoneDigits: policy.minimumPhoneDigits,
        maximumPhoneDigits: policy.maximumPhoneDigits,
      },
    },
  };
}
