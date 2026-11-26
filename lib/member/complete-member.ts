import "server-only";
import { ownRecord } from "./member-read";
import { ProfileError } from "./profile-errors";

export async function requireCompleteMember() {
  const record = await ownRecord();
  if (record.missing_fields.length) throw new ProfileError("PROFILE_INCOMPLETE");
  return record;
}
