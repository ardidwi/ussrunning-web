import type { AccountStatus } from "@/lib/db/types";
import type { AccountErrorCode } from "@/lib/auth/errors";
export interface RunningPreferences { distancesKm?: number[]; days?: string[]; goals?: string[] }
export interface ProfilePatch {
  fullName?: string | null; phone?: string | null; birthDate?: string | null; gender?: string | null; city?: string | null;
  emergencyContactName?: string | null; emergencyContactPhone?: string | null; instagramHandle?: string | null;
  jerseySize?: string | null; runningPreferences?: RunningPreferences; avatarMediaId?: string | null;
  marketingConsent?: boolean; privacyConsent?: true;
}
export interface UpdateProfileInput { expectedVersion: string; changes: ProfilePatch }
export interface AvatarDTO { id: string; url: string; altText: string | null; width: number | null; height: number | null }
export interface MemberProfileDTO {
  account: { id: string; email: string; memberId: string; status: AccountStatus; emailVerified: boolean; displayName: string | null };
  profile: { fullName: string | null; phone: string | null; birthDate: string | null; gender: string | null; city: string | null;
    emergencyContactName: string | null; emergencyContactPhone: string | null; instagramHandle: string | null; jerseySize: string | null;
    runningPreferences: RunningPreferences; avatar: AvatarDTO | null; marketingConsent: boolean; marketingConsentAt: string | null;
    privacyConsentAt: string | null; updatedAt: string; version: string };
  completion: { percentage: number; missingFields: string[] };
}
/** Private owner-only identifier; barcodeValue never grants authorization. */
export interface MemberCardDTO { displayName: string; memberId: string; barcodeValue: string; status: AccountStatus; avatar: AvatarDTO | null }
export type ProfileErrorCode = AccountErrorCode | "PROFILE_NOT_FOUND" | "PROFILE_VALIDATION_ERROR" | "PROFILE_UNAVAILABLE" | "MEDIA_NOT_FOUND" | "CONFLICT";
export type FieldErrors = Partial<Record<keyof ProfilePatch | "expectedVersion" | "changes", "INVALID" | "REQUIRED" | "UNSUPPORTED" | "INCONSISTENT">>;
export type ProfileResult<T> = { ok: true; data: T } | { ok: false; code: ProfileErrorCode; fieldErrors?: FieldErrors };
