import "server-only";
import { createConfiguredStorage } from "@/lib/media/storage/neon-s3-provider";
import { unconfiguredStorage, type StorageProvider } from "@/lib/media/storage/storage-provider";
import type { AvatarDTO } from "./profile-types";
import type { PrivateAvatarRecord } from "./identity-repository";

export const avatarStorage = createConfiguredStorage() ?? unconfiguredStorage;

export async function signedAvatar(
  avatar: PrivateAvatarRecord | null,
  storage: StorageProvider = avatarStorage,
): Promise<AvatarDTO | null> {
  if (!avatar || avatar.provider !== storage.id || !avatar.storageKey.startsWith("member-avatars/")) return null;
  try {
    const value = await storage.deliveryUrl(avatar.storageKey, "private");
    if (!value) return null;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash) return null;
    return { id: avatar.id, width: avatar.width, height: avatar.height, altText: null, url: url.href };
  } catch {
    return null;
  }
}
