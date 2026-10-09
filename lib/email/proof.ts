import "server-only";
import { createHash, randomBytes } from "node:crypto";
export function createVerificationProof() { return randomBytes(32).toString("base64url"); }
export function validVerificationProof(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value); }
export function hashVerificationProof(token: string) { return createHash("sha256").update(token, "utf8").digest("hex"); }
/** Fragment stays out of HTTP URLs, access logs and Referer headers. No request Host/redirect input. */
export function verificationUrl(baseUrl: string, token: string) {
  const url = new URL("/api/account/verify-email", baseUrl);
  url.hash = new URLSearchParams({ token }).toString();
  return url.href;
}
