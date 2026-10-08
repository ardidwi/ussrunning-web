import "server-only";
import { query } from "@/lib/db";
import type { EmailContent, EmailProvider, DeliveryResult } from "./types";
/** Claim once, commit, call provider outside any transaction, then persist sanitized outcome. */
export async function sendTransactionalEmail(deliveryId: string, recipient: string, content: EmailContent, from: string, provider: EmailProvider): Promise<DeliveryResult> {
  try {
    const rows = await query<{ idempotency_key: string }>(`UPDATE uss.notification_deliveries SET status='sending',provider=$3,attempt_count=attempt_count+1
      WHERE id=$1 AND recipient=$2 AND status='queued' RETURNING idempotency_key`, [deliveryId, recipient, provider.name]);
    if (!rows[0]?.idempotency_key) return { ok: false, code: "EMAIL_DELIVERY_UNCERTAIN" };
    let result;
    try { result = await provider.send({ ...content, to: recipient, from, idempotencyKey: rows[0].idempotency_key }); }
    catch { result = { ok: false, code: "EMAIL_DELIVERY_FAILED" } as const; }
    if (result.ok) {
      await query(`UPDATE uss.notification_deliveries SET status='sent',provider_message_id=$2,sent_at=clock_timestamp(),last_error_code=NULL,last_error_summary=NULL WHERE id=$1 AND status='sending'`, [deliveryId, result.messageId]);
      return { ok: true, code: "EMAIL_SENT" };
    }
    await query(`UPDATE uss.notification_deliveries SET status='failed',failed_at=clock_timestamp(),last_error_code=$2,last_error_summary='Transactional email delivery did not complete.' WHERE id=$1 AND status='sending'`, [deliveryId, result.code]);
    return { ok: false, code: "EMAIL_DELIVERY_FAILED" };
  } catch { return { ok: false, code: "EMAIL_DELIVERY_UNCERTAIN" }; }
}
