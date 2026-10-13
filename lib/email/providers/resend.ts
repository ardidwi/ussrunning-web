import "server-only";
import { Resend } from "resend";
import type { EmailMessage, EmailProvider, ProviderResult } from "../types";
/** SDK 6.13.0 is pinned: patched dependencies and no automatic raw provider-error logging. */
export function createResendProvider(apiKey: string, timeoutMs: number): EmailProvider {
  const client = new Resend(apiKey);
  return { name: "resend", idempotencyRetentionSeconds: 86400, async send(message: EmailMessage): Promise<ProviderResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const request = client.emails.send({ from: message.from, to: message.to, subject: message.subject, html: message.html, text: message.text }, { idempotencyKey: message.idempotencyKey }).then(result => {
        // Never forward/log arbitrary provider messages, headers or payloads.
        if (result.error || !result.data?.id || !/^[A-Za-z0-9_-]{1,200}$/.test(result.data.id)) return { ok: false, code: "EMAIL_DELIVERY_FAILED", retryable: ["rate_limit_exceeded", "application_error", "internal_server_error", "api_error", "concurrent_idempotent_requests"].includes(result.error?.name || "") } as const;
        return { ok: true, messageId: result.data.id } as const;
      }, () => ({ ok: false, code: "EMAIL_DELIVERY_FAILED", retryable: true } as const));
      const timeout = new Promise<ProviderResult>(resolve => { timer = setTimeout(() => resolve({ ok: false, code: "EMAIL_PROVIDER_TIMEOUT", retryable: true }), timeoutMs); });
      // SDK has no typed abort option. Timeout is ambiguous acceptance; keep proof valid.
      return await Promise.race([request, timeout]);
    } catch { return { ok: false, code: "EMAIL_DELIVERY_FAILED", retryable: true }; }
    finally { if (timer) clearTimeout(timer); }
  } };
}
