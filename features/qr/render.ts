import * as QRCode from "qrcode";
import { qrBranding, type QrBranding } from "./branding";
export async function renderBrandedQr(value: string, input: QrBranding = {}) {
  if (!value || value.length > 2048) throw new Error("QR cannot be rendered");
  const config = qrBranding(input);
  const qr = QRCode.create(value, {
    errorCorrectionLevel: config.errorCorrection,
  });
  const size = qr.modules.size,
    total = size + config.quietZone * 2;
  const patch = size * config.logoScale,
    start = (size - patch) / 2,
    end = start + patch;
  let protectedCenter = false;
  for (let r = Math.floor(start); r < Math.ceil(end); r++)
    for (let c = Math.floor(start); c < Math.ceil(end); c++)
      if (qr.modules.isReserved(r, c)) protectedCenter = true;
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: config.errorCorrection,
    margin: config.quietZone,
    width: 360,
    color: { dark: config.foreground, light: config.background },
  });
  return {
    svg,
    config,
    logoPercent: protectedCenter ? 0 : (patch / total) * 100,
    paddingPercent: patch
      ? Math.min((config.logoPadding / patch) * 100, 20)
      : 0,
  };
}
