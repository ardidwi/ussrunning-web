import type { MediaAsset } from "@/lib/media/media-types";

/** Public UI may only render media the authoritative DTO marks as deliverable. */
export function deliverableUrl(asset: MediaAsset | null | undefined): string | null {
  return asset?.deliveryAvailable && asset.url ? asset.url : null;
}

/** First deliverable asset, optionally preferring a specific media id. */
export function firstDeliverable(
  media: readonly MediaAsset[],
  preferredId?: string | null,
): MediaAsset | null {
  const preferred = preferredId
    ? media.find((item) => item.id === preferredId && deliverableUrl(item))
    : undefined;
  return preferred ?? media.find((item) => deliverableUrl(item)) ?? null;
}
