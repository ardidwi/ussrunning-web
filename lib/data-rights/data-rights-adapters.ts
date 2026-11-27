import "server-only";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { storageConfigFromEnv } from "@/lib/media/storage/neon-s3-provider";
import { getAuth, isAuthConfigured } from "@/lib/auth/server";

/**
 * Physical object deletion for erased member avatars. Deliberately separate from the general
 * StorageProvider (which has no delete API by design): only the audited erasure flow may delete,
 * only private member-avatar keys, and only on the provider that stored them.
 */
export interface ObjectEraser {
  readonly id: string;
  erase(key: string): Promise<void>;
}
const AVATAR_KEY = /^member-avatars\/[0-9a-f-]{36}\.(webp|jpg|png)$/;
export function isErasableAvatarKey(key: string) {
  return AVATAR_KEY.test(key) && !key.includes("..");
}
export class DataRightsStorageError extends Error {
  constructor(public readonly code: "DATA_RIGHTS_STORAGE_UNAVAILABLE" | "DATA_RIGHTS_STORAGE_FAILED" | "DATA_RIGHTS_STORAGE_MISMATCH") { super(code); }
}

export function createS3ObjectEraser(): ObjectEraser | null {
  const config = storageConfigFromEnv();
  if (!config) return null;
  const client = new S3Client({ region: config.region, endpoint: config.endpoint, forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return {
    id: "neon-s3",
    async erase(key) {
      if (!isErasableAvatarKey(key)) throw new DataRightsStorageError("DATA_RIGHTS_STORAGE_MISMATCH");
      // S3 DeleteObject is idempotent: an already-missing key is a successful erase.
      try { await client.send(new DeleteObjectCommand({ Bucket: config.privateBucket, Key: key })); }
      catch { throw new DataRightsStorageError("DATA_RIGHTS_STORAGE_FAILED"); }
    },
  };
}
export const unconfiguredEraser: ObjectEraser = {
  id: "unconfigured",
  async erase() { throw new DataRightsStorageError("DATA_RIGHTS_STORAGE_UNAVAILABLE"); },
};

/**
 * Provider-side session revocation. USS authorization already fails closed for the erased account
 * (status=deactivated is re-read from the DB on every guarded request); this additionally asks the
 * auth provider to end live sessions where its admin API is available, and reports honestly when not.
 */
export interface SessionRevoker {
  revokeAll(providerUserId: string): Promise<"revoked" | "unavailable">;
}
type ProviderAdmin = { admin?: { revokeUserSessions?: (input: { userId: string }) => Promise<{ error?: unknown } | null | undefined> } };
export const providerSessionRevoker: SessionRevoker = {
  async revokeAll(providerUserId) {
    if (!isAuthConfigured()) return "unavailable";
    try {
      const admin = (getAuth() as unknown as ProviderAdmin).admin;
      if (typeof admin?.revokeUserSessions !== "function") return "unavailable";
      const result = await admin.revokeUserSessions({ userId: providerUserId });
      return result && result.error ? "unavailable" : "revoked";
    } catch {
      return "unavailable";
    }
  },
};
