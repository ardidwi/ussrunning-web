"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";

export type JoinState = { error?: string };

function cleanPhone(value: string) {
  return value.replace(/[^0-9+]/g, "");
}

export async function createMember(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const mobile = cleanPhone(String(formData.get("mobile") || "").trim());
  const city = String(formData.get("city") || "").trim();
  const instagramRaw = String(formData.get("instagram") || "").trim();
  const instagram = instagramRaw ? (instagramRaw.startsWith("@") ? instagramRaw : `@${instagramRaw}`) : "";
  const emergencyContactName = String(formData.get("emergencyContactName") || "").trim();
  const emergencyContactMobile = cleanPhone(String(formData.get("emergencyContactMobile") || "").trim());
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const acceptedLegal = formData.get("acceptLegal") === "on";
  const marketingConsent = formData.get("marketingConsent") === "on";

  if (!firstName || !email || !mobile || !city || !instagram || !emergencyContactName || !emergencyContactMobile || !password) {
    return { error: "Please complete all required fields, including Instagram and emergency contact." };
  }

  if (mobile.replace(/\D/g, "").length < 8) return { error: "Please enter a valid mobile number." };
  if (emergencyContactMobile.replace(/\D/g, "").length < 8) return { error: "Please enter a valid emergency contact number." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Password confirmation does not match." };
  if (!acceptedLegal) return { error: "Please accept the Privacy Policy and Terms of Use." };

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  try {
    const { data, error } = await getAuth().signUp.email({ name: fullName, email, password });
    if (error) return { error: error.message || "Unable to create your USS ID." };

    const userId = data?.user?.id;
    if (userId) {
      await query(
        `INSERT INTO public.user_profiles(
           auth_user_id,first_name,last_name,mobile,city,instagram,
           emergency_contact_name,emergency_contact_mobile,
           marketing_consent,marketing_consent_at,privacy_version,terms_version
         )
         VALUES(
           $1,$2,$3,$4,$5,$6,$7,$8,$9,
           CASE WHEN $9 THEN now() ELSE NULL END,
           '2026-10-01','2026-10-01'
         )
         ON CONFLICT(auth_user_id)
         DO UPDATE SET
           first_name=EXCLUDED.first_name,
           last_name=EXCLUDED.last_name,
           mobile=EXCLUDED.mobile,
           city=EXCLUDED.city,
           instagram=EXCLUDED.instagram,
           emergency_contact_name=EXCLUDED.emergency_contact_name,
           emergency_contact_mobile=EXCLUDED.emergency_contact_mobile,
           marketing_consent=EXCLUDED.marketing_consent,
           marketing_consent_at=EXCLUDED.marketing_consent_at,
           privacy_version=EXCLUDED.privacy_version,
           terms_version=EXCLUDED.terms_version,
           updated_at=now()`,
        [userId,firstName,lastName || null,mobile,city,instagram,emergencyContactName,emergencyContactMobile,marketingConsent]
      );

      await query(
        `INSERT INTO public.legal_consents(auth_user_id,consent_type,version,accepted,accepted_at,source)
         VALUES
           ($1,'privacy','2026-10-01',true,now(),'join'),
           ($1,'terms','2026-10-01',true,now(),'join')
         ON CONFLICT(auth_user_id,consent_type,version)
         DO UPDATE SET accepted=true,accepted_at=now(),source='join'`,
        [userId]
      );

      if (marketingConsent) {
        await query(
          `INSERT INTO public.legal_consents(auth_user_id,consent_type,version,accepted,accepted_at,source)
           VALUES($1,'marketing','2026-10-01',true,now(),'join')
           ON CONFLICT(auth_user_id,consent_type,version)
           DO UPDATE SET accepted=true,accepted_at=now(),source='join'`,
          [userId]
        );

        await query(
          `INSERT INTO public.newsletter_subscriptions(email,status,consent_version,consent_at,source)
           VALUES($1,'subscribed','2026-10-01',now(),'join')
           ON CONFLICT(email)
           DO UPDATE SET status='subscribed',consent_version='2026-10-01',consent_at=now(),unsubscribed_at=NULL,source='join',updated_at=now()`,
          [email]
        );
      }
    }
  } catch (error) {
    return { error: error instanceof Error && error.message ? error.message : "Unable to create your USS ID right now. Please try again." };
  }

  redirect("/dashboard");
}
