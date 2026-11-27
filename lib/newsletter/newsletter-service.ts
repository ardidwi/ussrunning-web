import "server-only";
import { query } from "@/lib/db";
import { membershipConfig } from "@/lib/membership-config";

export type NewsletterCode = "NEWSLETTER_SUBSCRIBED" | "NEWSLETTER_VALIDATION_ERROR";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * Explicit opt-in only. Re-subscribing records fresh consent (version + time) and clears a previous opt-out;
 * an unsubscribed row is never re-activated without new consent. Storage: uss.newsletter_subscriptions (migration 022).
 */
export async function subscribeToNewsletter(input: { email: unknown; consent: unknown; source?: string }): Promise<{ ok: boolean; code: NewsletterCode }> {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const source = input.source ?? "footer";
  if (input.consent !== true || !email || email.length > 254 || !EMAIL.test(email) || !/^[a-z0-9_-]{1,40}$/.test(source))
    return { ok: false, code: "NEWSLETTER_VALIDATION_ERROR" };
  await query(
    `INSERT INTO uss.newsletter_subscriptions(email,status,consent_version,consent_at,source)
     VALUES($1,'subscribed',$2,clock_timestamp(),$3)
     ON CONFLICT(email) DO UPDATE SET status='subscribed',consent_version=excluded.consent_version,consent_at=excluded.consent_at,
       unsubscribed_at=NULL,source=excluded.source,updated_at=clock_timestamp()`,
    [email, membershipConfig.marketingVersion.slice(0, 40), source],
  );
  return { ok: true, code: "NEWSLETTER_SUBSCRIBED" };
}
