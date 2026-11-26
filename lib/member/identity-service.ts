import "server-only";
import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { AccountError } from "@/lib/auth/errors";
import { AuthorizationError } from "@/lib/authz/errors";
import { requirePermission } from "@/lib/authz/guards";
import type { StorageProvider } from "@/lib/media/storage/storage-provider";
import { avatarStorage, signedAvatar } from "./avatar-storage";
import { memberBarcode } from "./barcode-contract";
import { attachAvatar, findMemberByBarcode, reserveAvatarUpload, reviewAvatar as saveReview } from "./identity-repository";
import { AVATAR_EDGE, AVATAR_MAX_BYTES, AVATAR_MIMES, type IdentityCode, type IdentityResult, type MembershipLookup } from "./identity-types";

class IdentityError extends Error {
  constructor(readonly code: IdentityCode, readonly retryAfterSeconds?: number) { super(code); }
}
function check(code: string | undefined, retryAfterSeconds?: number) {
  if (code !== "OK") throw new IdentityError((code ?? "IDENTITY_UNAVAILABLE") as IdentityCode, retryAfterSeconds);
}
export async function identityResult<T>(execute: () => Promise<T>): Promise<IdentityResult<T>> {
  try {
    return { ok: true, data: await execute() };
  } catch (error) {
    if (error instanceof IdentityError) return {
      ok: false, code: error.code,
      ...(error.code === "IDENTITY_RATE_LIMITED" ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
    };
    if (error instanceof AccountError || error instanceof AuthorizationError) return { ok: false, code: error.code };
    console.error("Member identity operation failed");
    return { ok: false, code: "IDENTITY_UNAVAILABLE" };
  }
}

export async function normalizeAvatar(file: File): Promise<Buffer> {
  try {
    const expected = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
    if (file.size < 1 || file.size > AVATAR_MAX_BYTES || !AVATAR_MIMES.some(mime => mime === file.type)) throw new Error();
    const input = sharp(Buffer.from(await file.arrayBuffer()), { failOn: "warning", limitInputPixels: 16_777_216 });
    const info = await input.metadata();
    if (!info.width || !info.height || Math.min(info.width, info.height) < 128 ||
        Math.max(info.width, info.height) > 4096 || (info.pages ?? 1) !== 1 ||
        expected[info.format as keyof typeof expected] !== file.type) throw new Error();
    return await input.autoOrient().resize(AVATAR_EDGE, AVATAR_EDGE, { fit: "cover" })
      .flatten({ background: "#f5f5f5" }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new IdentityError("AVATAR_INVALID");
  }
}

export function createMemberIdentityService(storage: StorageProvider) {
  return {
    async uploadOwnAvatar(data: FormData) {
      const { account } = await requirePermission("media.upload.self");
      const file = data instanceof FormData ? data.get("photo") : null;
      const version = data instanceof FormData ? data.get("version") : null;
      if (!(file instanceof File) || typeof version !== "string" || !/^[0-9a-f]{64}$/.test(version)) {
        throw new IdentityError("AVATAR_INVALID");
      }
      check((await reserveAvatarUpload(account.id, version))?.code, 3600);
      const bytes = await normalizeAvatar(file);
      const id = randomUUID(), storageKey = `member-avatars/${id}.webp`;
      try {
        await storage.put(storageKey, bytes, "image/webp", "private");
      } catch {
        throw new IdentityError("AVATAR_UNAVAILABLE");
      }
      const asset = {
        id, storageKey, provider: storage.id, width: AVATAR_EDGE, height: AVATAR_EDGE,
        bytes: bytes.length, checksum: createHash("sha256").update(bytes).digest("hex"),
      };
      // Only an audited DB transaction can publish the stored object to its owner.
      check((await attachAvatar(account.id, version, asset))?.code);
      return { photo: await signedAvatar(asset, storage) };
    },

    async lookupMember(value: unknown): Promise<MembershipLookup> {
      const { account } = await requirePermission("members.lookup");
      let barcode = null;
      if (typeof value === "string" && value.length === 40) {
        try { barcode = memberBarcode(value).value; } catch { /* Invalid scans use the same quota and audit. */ }
      }
      const row = await findMemberByBarcode(account.id, barcode);
      check(row?.code, 60);
      if (!row.data) throw new IdentityError("MEMBER_NOT_FOUND");
      return { ...row.data, photo: (await signedAvatar(row.data.photo, storage))?.url ?? null };
    },
  };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function reviewMemberAvatar(value: unknown) {
  const { account } = await requirePermission("members.photo.review");
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new IdentityError("PHOTO_REVIEW_INVALID");
  const { accountId, avatarId, decision, reason } = value as Record<string, unknown>;
  if (typeof accountId !== "string" || !uuid.test(accountId) || typeof avatarId !== "string" ||
      !uuid.test(avatarId) || (decision !== "approved" && decision !== "rejected") ||
      (decision === "approved" && reason != null) ||
      (decision === "rejected" && (typeof reason !== "string" || reason.trim().length < 5 ||
        reason.length > 240 || /[<>\u0000-\u001f\u007f]/.test(reason)))) {
    throw new IdentityError("PHOTO_REVIEW_INVALID");
  }
  check((await saveReview(account.id, accountId, avatarId, decision, typeof reason === "string" ? reason.trim() : null))?.code);
  return { status: decision };
}

export const { uploadOwnAvatar, lookupMember } = createMemberIdentityService(avatarStorage);
