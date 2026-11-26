import type { MemberCardPresentationDTO } from "@/lib/member/member-card-types";
import { renderBrandedQr } from "@/features/qr/render";

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function cappedName(context: CanvasRenderingContext2D, name: string, width: number) {
  for (let size = 48; size >= 20; size -= 2) {
    context.font = `bold ${size}px sans-serif`;
    if (context.measureText(name).width <= width) return name;
  }
  const characters = Array.from(name);
  while (characters.length && context.measureText(characters.join("") + "…").width > width) characters.pop();
  return characters.join("") + "…";
}

export async function downloadMemberCard(card: MemberCardPresentationDTO) {
  if (!card.avatar) throw new Error("Profile photo unavailable");
  const qr = await renderBrandedQr(card.barcode.value);
  const [photo, symbol, brand] = await Promise.all([
    loadImage(`/api/member/avatar?id=${encodeURIComponent(card.avatar.id)}`),
    loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.svg)}`),
    loadImage("/uss-logo.png"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Card rendering unavailable");
  context.fillStyle = "#111111";
  context.fillRect(0, 0, 720, 960);
  context.drawImage(brand, 48, 38, 150, 150 * brand.height / brand.width);
  context.drawImage(photo, 48, 158, 144, 144);
  context.fillStyle = "#ffffff";
  context.fillText(cappedName(context, card.displayName, 452), 220, 203);
  context.font = "28px sans-serif";
  context.fillText(card.memberId, 220, 251);
  context.fillText("Active member", 220, 292);
  const qrSize = 510, qrX = (720 - qrSize) / 2, qrY = 351;
  context.imageSmoothingEnabled = false;
  context.drawImage(symbol, qrX, qrY, qrSize, qrSize);
  const patch = qrSize * qr.logoPercent / 100;
  if (patch > 0) {
    const padding = patch * qr.paddingPercent / 100;
    context.fillRect(360 - patch / 2, qrY + (qrSize - patch) / 2, patch, patch);
    const width = patch - padding * 2;
    const height = width * brand.height / brand.width;
    context.fillStyle = "#070707";
    context.fillRect(360 - width / 2, qrY + (qrSize - width) / 2, width, width);
    context.drawImage(brand, 360 - width / 2, qrY + (qrSize - height) / 2, width, height);
    context.fillStyle = "#ffffff";
  }
  context.font = "22px sans-serif";
  context.textAlign = "center";
  context.fillText("USS Running membership • Status verified at scan", 360, 914);
  const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("PNG unavailable");
  const url = URL.createObjectURL(png);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${card.memberId.replace(/[^a-zA-Z0-9_-]/g, "_")}-member-card.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
