import "server-only";
import { query } from "@/lib/db";
import { getEmailConfig, EmailConfigError } from "@/lib/email/config";
import { createVerificationProof, validVerificationProof, hashVerificationProof, verificationUrl } from "@/lib/email/proof";
import { verificationEmail } from "@/lib/email/templates";
import { createResendProvider } from "@/lib/email/providers/resend";
import { sendTransactionalEmail } from "@/lib/email/service";
import type { VerificationCode, VerificationResult } from "@/lib/email/types";
/** Internal only: caller must supply account resolved from the trusted provider session. */
export async function issueEmailVerification(accountId: string): Promise<VerificationResult> {
  try {
    const config = getEmailConfig();
    const token = createVerificationProof();
    const rows = await query<{ code: VerificationCode; retry_after_seconds: number | null; delivery_id: string | null; recipient: string | null }>(
      "SELECT * FROM uss.issue_email_verification($1::uuid,$2,$3,$4,$5,$6)",
      [accountId, hashVerificationProof(token), config.ttlSeconds, config.cooldownSeconds, config.windowSeconds, config.maxRequests]);
    const row = rows[0];
    if (!row) return { ok: false, code: "VERIFICATION_UNAVAILABLE" };
    if (row.code !== "VERIFICATION_ISSUED") return { ok: row.code === "ACCOUNT_ALREADY_ACTIVE", code: row.code, ...(row.retry_after_seconds ? { retryAfterSeconds: row.retry_after_seconds } : {}) };
    if (!row.delivery_id || !row.recipient) return { ok: false, code: "VERIFICATION_UNAVAILABLE" };
    const delivery = await sendTransactionalEmail(row.delivery_id, row.recipient, verificationEmail(verificationUrl(config.baseUrl, token), config.ttlSeconds / 60), config.from, createResendProvider(config.apiKey, config.timeoutMs));
    return delivery.ok ? { ok: true, code: "VERIFICATION_ISSUED" } : delivery;
  } catch (error) { return { ok: false, code: error instanceof EmailConfigError ? "EMAIL_NOT_CONFIGURED" : "VERIFICATION_UNAVAILABLE" }; }
}
export async function verifyEmailProof(token: unknown): Promise<VerificationResult> {
  if (!validVerificationProof(token)) return { ok: false, code: "VERIFICATION_INVALID" };
  try {
    const rows = await query<{ code: VerificationCode }>("SELECT uss.consume_email_verification($1) AS code", [hashVerificationProof(token)]);
    const code = rows[0]?.code || "VERIFICATION_UNAVAILABLE";
    return { ok: code === "VERIFICATION_SUCCESS" || code === "ACCOUNT_ALREADY_ACTIVE", code };
  } catch { return { ok: false, code: "VERIFICATION_UNAVAILABLE" }; }
}
