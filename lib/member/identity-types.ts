import type { AuthorizationCode } from "@/lib/authz/errors";
import type { AccountStatus } from "@/lib/db/types";

export const AVATAR_MAX_BYTES = 900_000;
export const AVATAR_EDGE = 512;
export const AVATAR_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarStatus = "pending_review" | "approved" | "rejected";
export type MembershipLookup = { photo: string | null; name: string; memberId: string; status: AccountStatus };
export type IdentityCode = AuthorizationCode | "AVATAR_INVALID" | "AVATAR_CONFLICT" |
  "AVATAR_UNAVAILABLE" | "PROFILE_NOT_FOUND" | "MEMBER_NOT_FOUND" | "BARCODE_INVALID" |
  "IDENTITY_RATE_LIMITED" | "IDENTITY_UNAVAILABLE" | "PHOTO_REVIEW_INVALID";
export type IdentityResult<T> = { ok: true; data: T } |
  { ok: false; code: IdentityCode; retryAfterSeconds?: number };
