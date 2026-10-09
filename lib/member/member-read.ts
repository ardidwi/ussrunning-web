import "server-only";
import { requireActiveAccount, assertActiveAccount } from "@/lib/auth/guards";
import { AccountError } from "@/lib/auth/errors";
import { ProfileError } from "./profile-errors";
import { readOwnProfile } from "./profile-repository";
import type { ProfileRecord } from "./profile-repository";
import type { AvatarDTO } from "./profile-types";
export function safeAvatar(avatar: ProfileRecord["avatar"]): AvatarDTO | null {
  if (!avatar?.url) return null;
  try { const url = new URL(avatar.url); if (url.protocol !== "https:" || url.username || url.password) return null; }
  catch { return null; }
  return { ...avatar, url: avatar.url };
}
export async function ownRecord() {
  const current = await requireActiveAccount();
  const record = await readOwnProfile(current.id);
  if (!record) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
  assertActiveAccount({ ...current, status: record.status, emailVerifiedAt: record.email_verified_at });
  if (!record.profile || !record.version) throw new ProfileError("PROFILE_NOT_FOUND");
  return record;
}
