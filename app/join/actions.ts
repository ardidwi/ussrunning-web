"use server";

import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { redirect } from "next/navigation";

export type JoinState = {
  error?: string;
};

export async function createMember(
  _prevState: JoinState,
  formData: FormData
): Promise<JoinState> {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const acceptedLegal = formData.get("acceptLegal") === "on";
  const marketingConsent = formData.get("marketingConsent") === "on";

  if (!firstName || !email || !mobile || !city || !password) {
    return { error: "Please complete all required fields." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Password confirmation does not match." };
  }

  if (!acceptedLegal) {
    return { error: "Please accept the Privacy Policy and Terms of Use." };
  }

  try {
    const { data, error } = await getAuth().signUp.email({
      email,
      name: [firstName, lastName].filter(Boolean).join(" "),
      password,
    });

    if (error) {
      return { error: error.message || "Unable to create your USS ID." };
    }

    let userId =
      (data as { user?: { id?: string } } | null | undefined)?.user?.id;

    if (!userId) {
      const { data: session } = await getAuth().getSession();
      userId = session?.user?.id;
    }

    if (!userId) {
      return { error: "Account created, but the member profile could not be linked." };
    }

    await query(
      `INSERT INTO public.user_profiles(
         auth_user_id,
         first_name,
         last_name,
         mobile,
         city,
         instagram,
         marketing_consent,
         marketing_consent_at,
         privacy_version,
         terms_version
       )
       VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $7 THEN now() ELSE NULL END,'2026-10-01','2026-10-01')
       ON CONFLICT (auth_user_id)
       DO UPDATE SET
         first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name,
         mobile=EXCLUDED.mobile,
         city=EXCLUDED.city,
         instagram=EXCLUDED.instagram,
         marketing_consent=EXCLUDED.marketing_consent,
         marketing_consent_at=EXCLUDED.marketing_consent_at,
         privacy_version=EXCLUDED.privacy_version,
         terms_version=EXCLUDED.terms_version,
         updated_at=now()`,
      [
        userId,
        firstName,
        lastName || null,
        mobile,
        city,
        instagram || null,
        marketingConsent,
      ]
    );

    await query(
      `INSERT INTO public.legal_consents(auth_user_id,consent_type,version,accepted,source)
       VALUES
         ($1,'privacy','2026-10-01',true,'join'),
         ($1,'terms','2026-10-01',true,'join')
       ON CONFLICT (auth_user_id,consent_type,version)
       DO UPDATE SET accepted=true,accepted_at=now(),source='join'`,
      [userId]
    );

    if (marketingConsent) {
      await query(
        `INSERT INTO public.legal_consents(auth_user_id,consent_type,version,accepted,source)
         VALUES($1,'marketing','2026-10-01',true,'join')
         ON CONFLICT (auth_user_id,consent_type,version)
         DO UPDATE SET accepted=true,accepted_at=now(),source='join'`,
        [userId]
      );

      await query(
        `INSERT INTO public.newsletter_subscriptions(email,status,consent_version,source)
         VALUES($1,'subscribed','2026-10-01','join')
         ON CONFLICT (email)
         DO UPDATE SET
           status='subscribed',
           consent_version='2026-10-01',
           consent_at=now(),
           unsubscribed_at=NULL,
           source='join',
           updated_at=now()`,
        [email]
      );
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Unable to create your USS ID right now.",
    };
  }

  redirect("/dashboard");
}
