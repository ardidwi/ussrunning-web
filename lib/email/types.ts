export type VerificationCode = "VERIFICATION_SUCCESS" | "VERIFICATION_INVALID" | "VERIFICATION_EXPIRED" | "VERIFICATION_ALREADY_USED" | "VERIFICATION_ISSUED" | "VERIFICATION_RESEND_COOLDOWN" | "VERIFICATION_RATE_LIMITED" | "ACCOUNT_ALREADY_ACTIVE" | "ACCOUNT_SUSPENDED" | "ACCOUNT_DEACTIVATED" | "ACCOUNT_NOT_PROVISIONED" | "UNAUTHENTICATED" | "EMAIL_NOT_CONFIGURED" | "EMAIL_DELIVERY_FAILED" | "EMAIL_DELIVERY_UNCERTAIN" | "VERIFICATION_UNAVAILABLE";
export type VerificationResult = { ok: boolean; code: VerificationCode; retryAfterSeconds?: number };
export type DeliveryResult = { ok: true; code: "EMAIL_SENT" } | { ok: false; code: "EMAIL_DELIVERY_FAILED" | "EMAIL_DELIVERY_UNCERTAIN" };
export interface EmailContent { subject: string; html: string; text: string }
export interface EmailMessage extends EmailContent { to: string; from: string; idempotencyKey: string }
export type ProviderResult = { ok: true; messageId: string } | { ok: false; code: "EMAIL_DELIVERY_FAILED" | "EMAIL_PROVIDER_TIMEOUT"; retryable?: boolean };
export interface EmailProvider { readonly name: string; readonly idempotencyRetentionSeconds?: number; send(message: EmailMessage): Promise<ProviderResult> }
