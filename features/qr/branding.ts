export type QrBranding = {
  centerLogoUrl?: string | null;
  logoScale?: number;
  /** Padding in QR modules, included inside the bounded logo patch. */
  logoPadding?: number;
  errorCorrection?: "L" | "M" | "Q" | "H";
  foreground?: string;
  background?: string;
  /** Quiet zone in QR modules. */
  quietZone?: number;
};
export const USS_QR_LOGO = "/uss-logo.png";
function clamp(
  n: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n!)) : fallback;
}
function logoUrl(value: string | null | undefined) {
  if (value === null) return null;
  if (
    value?.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\s]/.test(value)
  )
    return value;
  try {
    if (value && new URL(value).protocol === "https:") return value;
  } catch {
    /* Unsafe URL uses the USS asset. */
  }
  return USS_QR_LOGO;
}
function luminance(hex: string) {
  return [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
}
export function qrBranding(input: QrBranding = {}) {
  let foreground = /^#[0-9a-f]{6}$/i.test(input.foreground ?? "")
    ? input.foreground!
    : "#000000";
  let background = /^#[0-9a-f]{6}$/i.test(input.background ?? "")
    ? input.background!
    : "#ffffff";
  if (
    luminance(background) < 0.8 ||
    (luminance(background) + 0.05) / (luminance(foreground) + 0.05) < 7
  ) {
    foreground = "#000000";
    background = "#ffffff";
  }
  const centerLogoUrl = logoUrl(input.centerLogoUrl);
  return {
    centerLogoUrl,
    logoScale: clamp(input.logoScale, 0.1, 0, 0.12),
    logoPadding: clamp(input.logoPadding, 0.35, 0, 0.5),
    errorCorrection: centerLogoUrl
      ? ("H" as const)
      : (input.errorCorrection ?? "H"),
    foreground,
    background,
    quietZone: Math.round(clamp(input.quietZone, 4, 4, 12)),
  };
}
