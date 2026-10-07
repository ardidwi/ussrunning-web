"use server";

import { query } from "@/lib/db";

export async function subscribeNewsletter(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";

  if (!email || !consent) return;

  await query(
    `INSERT INTO public.newsletter_subscriptions(email,status,consent_version,consent_at,source)
     VALUES($1,'subscribed','2026-10-01',now(),'footer')
     ON CONFLICT(email)
     DO UPDATE SET
       status='subscribed',
       consent_version='2026-10-01',
       consent_at=now(),
       unsubscribed_at=NULL,
       source='footer',
       updated_at=now()`,
    [email]
  );
}
