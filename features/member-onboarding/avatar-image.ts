import { AVATAR_EDGE, AVATAR_MAX_BYTES } from "@/lib/member/identity-types";

export type Crop = { x: number; y: number; zoom: number };
export const initialCrop: Crop = { x: 50, y: 50, zoom: 1 };

export function drawCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: Crop) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image editing is unavailable.");
  const side = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom;
  const x = (image.naturalWidth - side) * crop.x / 100;
  const y = (image.naturalHeight - side) * crop.y / 100;
  context.fillStyle = "#f5f5f5";
  context.fillRect(0, 0, AVATAR_EDGE, AVATAR_EDGE);
  context.drawImage(image, x, y, side, side, 0, 0, AVATAR_EDGE, AVATAR_EDGE);
}

export async function compressCrop(canvas: HTMLCanvasElement) {
  for (const quality of [0.88, 0.7, 0.5]) {
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob?.type === "image/jpeg" && blob.size <= AVATAR_MAX_BYTES) {
      return new File([blob], "profile-photo.jpg", { type: blob.type });
    }
  }
  throw new Error("The photo could not be compressed.");
}
