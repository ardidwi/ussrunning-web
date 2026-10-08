import "server-only";
import { requireActiveAccount, assertActiveAccount } from "@/lib/auth/guards";
import { AccountError } from "@/lib/auth/errors";
import { ProfileError, profileOperation } from "./profile-errors";
import { profileCompletion } from "./profile-completion";
import { validateProfileUpdate, validatePreferences } from "./profile-validation";
import { readOwnProfile, updateOwnProfile } from "./profile-repository";
import type { ProfileRecord } from "./profile-repository";
import type { AvatarDTO, MemberCardDTO, MemberProfileDTO } from "./profile-types";
function safeAvatar(avatar: ProfileRecord["avatar"]): AvatarDTO | null {
  if (!avatar?.url) return null;
  try { const url = new URL(avatar.url); if (url.protocol !== "https:" || url.username || url.password) return null; }
  catch { return null; }
  return { ...avatar, url: avatar.url };
}
async function ownRecord() {
  const current = await requireActiveAccount();
  const record = await readOwnProfile(current.id);
  if (!record) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
  assertActiveAccount({ ...current, status: record.status, emailVerifiedAt: record.email_verified_at });
  if (!record.profile || !record.version) throw new ProfileError("PROFILE_NOT_FOUND");
  return record;
}
/** No global mutable-profile cache. Session authority always comes from existing guards. */
export async function getCurrentMemberProfile(): Promise<MemberProfileDTO> {
  return profileOperation(async () => {
    const record = await ownRecord(), p = record.profile!;
    const nullable = (field: string) => typeof p[field] === "string" ? p[field] as string : null;
    const timestamp = (field: string) => nullable(field) ? new Date(nullable(field)!).toISOString() : null;
    const profile: MemberProfileDTO["profile"] = {
      fullName: nullable("full_name"),phone: nullable("phone"),birthDate: nullable("birth_date"),gender: nullable("gender"),city: nullable("city"),
      emergencyContactName: nullable("emergency_contact_name"),emergencyContactPhone: nullable("emergency_contact_phone"),instagramHandle: nullable("instagram_handle"),jerseySize: nullable("jersey_size"),
      runningPreferences: validatePreferences(p.running_preferences),avatar: safeAvatar(record.avatar),marketingConsent: p.marketing_consent === true,
      marketingConsentAt: timestamp("marketing_consent_at"),privacyConsentAt: timestamp("privacy_consent_at"),updatedAt: timestamp("updated_at")!,version: record.version!,
    };
    return { account: { id: record.id,email: record.email,memberId: record.member_id,status: record.status,emailVerified: record.email_verified_at !== null,displayName: record.display_name }, profile, completion: profileCompletion(profile) };
  });
}
export async function updateCurrentMemberProfile(value: unknown): Promise<MemberProfileDTO> {
  return profileOperation(async () => {
    const account = await requireActiveAccount();
    const input = validateProfileUpdate(value);
    const result = await updateOwnProfile(account.id, input);
    if (!result) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
    assertActiveAccount({ ...account, status: result.status, emailVerifiedAt: result.email_verified_at });
    if (result.code !== "OK") {
      if (result.code === "PROFILE_VALIDATION_ERROR") throw new ProfileError("PROFILE_VALIDATION_ERROR", { emergencyContactName: "INCONSISTENT", emergencyContactPhone: "INCONSISTENT" });
      if (["PROFILE_NOT_FOUND", "CONFLICT", "MEDIA_NOT_FOUND"].includes(result.code)) throw new ProfileError(result.code as "PROFILE_NOT_FOUND" | "CONFLICT" | "MEDIA_NOT_FOUND");
      throw new ProfileError("PROFILE_UNAVAILABLE");
    }
    return getCurrentMemberProfile();
  });
}
export async function getCurrentMemberCard(): Promise<MemberCardDTO> {
  return profileOperation(async () => {
    const record = await ownRecord();
    return { displayName: typeof record.profile!.full_name === "string" && record.profile!.full_name.trim() ? record.profile!.full_name : record.display_name || record.member_id,
      memberId: record.member_id,barcodeValue: record.barcode_value,status: record.status,avatar: safeAvatar(record.avatar) };
  });
}
