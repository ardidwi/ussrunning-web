import "server-only";
import { ownRecord } from "./member-read";
import { signedAvatar } from "./avatar-storage";
import type { AvatarStatus } from "./identity-types";
import { getCurrentMemberCardPresentation } from "./member-card-service";
import { requireActiveAccount, assertActiveAccount } from "@/lib/auth/guards";
import { AccountError } from "@/lib/auth/errors";
import { ProfileError, profileOperation } from "./profile-errors";
import { profileCompletion } from "./profile-completion";
import { validateProfileUpdate, validatePreferences } from "./profile-validation";
import { updateOwnProfile } from "./profile-repository";
import type { MemberCardDTO, MemberProfileDTO } from "./profile-types";
/** No global mutable-profile cache. Session authority always comes from existing guards. */
export async function getCurrentMemberProfile(): Promise<MemberProfileDTO> {
  return profileOperation(async () => {
    const record = await ownRecord(), p = record.profile!;
    const nullable = (field: string) => typeof p[field] === "string" ? p[field] as string : null;
    const timestamp = (field: string) => nullable(field) ? new Date(nullable(field)!).toISOString() : null;
    const profile: MemberProfileDTO["profile"] = {
      fullName: nullable("full_name"),phone: nullable("phone"),birthDate: nullable("birth_date"),gender: nullable("gender"),city: nullable("city"),
      emergencyContactName: nullable("emergency_contact_name"),emergencyContactPhone: nullable("emergency_contact_phone"),instagramHandle: nullable("instagram_handle"),jerseySize: nullable("jersey_size"),
      runningPreferences: validatePreferences(p.running_preferences),avatar: await signedAvatar(record.avatar), avatarStatus: nullable("avatar_status") as AvatarStatus | null,
      avatarRejectionReason: nullable("avatar_rejection_reason"),marketingConsent: p.marketing_consent === true,
      marketingConsentAt: timestamp("marketing_consent_at"),privacyConsentAt: timestamp("privacy_consent_at"),updatedAt: timestamp("updated_at")!,version: record.version!,
    };
    return { account: { id: record.id,email: record.email,memberId: record.member_id,status: record.status,emailVerified: record.email_verified_at !== null,displayName: record.display_name }, profile, completion: profileCompletion(record.missing_fields) };
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
/** BE-04 compatibility adapter; canonical presentation contract is owned by BE-05. */
export async function getCurrentMemberCard(): Promise<MemberCardDTO> {
  const { barcode, ...card } = await getCurrentMemberCardPresentation();
  return { ...card, barcodeValue: barcode.value };
}
