import "server-only";
export class EmailConfigError extends Error { constructor() { super("EMAIL_NOT_CONFIGURED"); } }
function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (raw !== undefined && !/^\d+$/.test(raw)) throw new EmailConfigError();
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new EmailConfigError();
  return value;
}
/** Lazy validation: unrelated pages/builds never need mail credentials. */
export function getEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const address = process.env.EMAIL_FROM_ADDRESS?.trim();
  const name = process.env.EMAIL_FROM_NAME?.trim() || "USS Running";
  if (!apiKey || !address || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) || /[<>\r\n]/.test(name)) throw new EmailConfigError();
  let base: URL;
  try { base = new URL(process.env.APP_BASE_URL || ""); } catch { throw new EmailConfigError(); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/" || (base.protocol !== "https:" && !(base.protocol === "http:" && local && process.env.NODE_ENV !== "production"))) throw new EmailConfigError();
  const cooldownSeconds = integer("EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS", 60, 1, 86400);
  return {
    apiKey, from: `${name} <${address}>`, baseUrl: base.origin,
    ttlSeconds: integer("EMAIL_VERIFICATION_TTL_MINUTES", 30, 1, 1440) * 60,
    cooldownSeconds,
    windowSeconds: integer("EMAIL_VERIFICATION_RATE_WINDOW_SECONDS", 3600, cooldownSeconds, 86400),
    maxRequests: integer("EMAIL_VERIFICATION_MAX_REQUESTS", 5, 1, 50),
    timeoutMs: integer("EMAIL_PROVIDER_TIMEOUT_MS", 15000, 100, 60000),
  };
}
