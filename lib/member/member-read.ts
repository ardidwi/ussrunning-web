import "server-only";
import { requireActiveAccount, assertActiveAccount } from "@/lib/auth/guards";
import { AccountError } from "@/lib/auth/errors";
import { ProfileError } from "./profile-errors";
import { readOwnProfile } from "./profile-repository";
export async function ownRecord() {
  const current = await requireActiveAccount();
  const record = await readOwnProfile(current.id);
  if (!record) throw new AccountError("ACCOUNT_NOT_PROVISIONED");
  assertActiveAccount({ ...current, status: record.status, emailVerifiedAt: record.email_verified_at });
  if (!record.profile || !record.version) throw new ProfileError("PROFILE_NOT_FOUND");
  return record;
}
