"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type MemberActionState = {
  ok?: string;
  error?: string;
};

function cleanPhone(value: string) {
  return value.replace(/[^0-9+]/g, "");
}

export async function updateMemberProfile(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const user = await requireUser();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const mobile = cleanPhone(String(formData.get("mobile") || "").trim());
  const city = String(formData.get("city") || "").trim();
  const instagramRaw = String(formData.get("instagram") || "").trim();
  const instagram = instagramRaw
    ? instagramRaw.startsWith("@")
      ? instagramRaw
      : `@${instagramRaw}`
    : "";
  const emergencyContactName = String(
    formData.get("emergencyContactName") || ""
  ).trim();
  const emergencyContactMobile = cleanPhone(
    String(formData.get("emergencyContactMobile") || "").trim()
  );

  if (
    !firstName ||
    !mobile ||
    !city ||
    !instagram ||
    !emergencyContactName ||
    !emergencyContactMobile
  ) {
    return {
      error:
        "First name, mobile, city, Instagram and emergency contact are required.",
    };
  }

  if (mobile.replace(/\D/g, "").length < 8) {
    return { error: "Please enter a valid mobile number." };
  }

  if (emergencyContactMobile.replace(/\D/g, "").length < 8) {
    return { error: "Please enter a valid emergency contact number." };
  }

  try {
    await query(
      `INSERT INTO public.user_profiles(
         auth_user_id,first_name,last_name,mobile,city,instagram,
         emergency_contact_name,emergency_contact_mobile
       )
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(auth_user_id)
       DO UPDATE SET
         first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name,
         mobile=EXCLUDED.mobile,
         city=EXCLUDED.city,
         instagram=EXCLUDED.instagram,
         emergency_contact_name=EXCLUDED.emergency_contact_name,
         emergency_contact_mobile=EXCLUDED.emergency_contact_mobile,
         updated_at=now()`,
      [
        user.id,
        firstName,
        lastName || null,
        mobile,
        city,
        instagram,
        emergencyContactName,
        emergencyContactMobile,
      ]
    );
  } catch {
    return { error: "We couldn't save your profile. Please try again." };
  }

  revalidatePath("/dashboard");
  return { ok: "Your USS profile has been updated." };
}

export async function registerForEvent(formData: FormData) {
  const user = await requireUser();
  const eventId = String(formData.get("eventId") || "");

  if (!eventId) return;

  await query(
    `WITH target AS (
       SELECT id, capacity FROM public.events WHERE id=$1::uuid AND published=true
     ),
     current_count AS (
       SELECT count(*)::int AS count
       FROM public.event_registrations
       WHERE event_id=$1::uuid AND status IN ('registered','checked_in')
     )
     INSERT INTO public.event_registrations(
       event_id,auth_user_id,status,pass_code,qr_payload
     )
     SELECT
       target.id,
       $2::uuid,
       CASE
         WHEN target.capacity IS NOT NULL AND current_count.count >= target.capacity
           THEN 'waitlist'
         ELSE 'registered'
       END,
       'USS-RUN-' || upper(substr(encode(gen_random_bytes(5),'hex'),1,10)),
       'USS:' || target.id::text || ':' || $2::text
     FROM target CROSS JOIN current_count
     ON CONFLICT(event_id,auth_user_id)
     DO UPDATE SET
       status=CASE
         WHEN public.event_registrations.status='cancelled' THEN 'registered'
         ELSE public.event_registrations.status
       END,
       registered_at=now()`,
    [eventId, user.id]
  );

  revalidatePath("/dashboard");
  revalidatePath("/runs");
}

export async function cancelRegistration(formData: FormData) {
  const user = await requireUser();
  const registrationId = String(formData.get("registrationId") || "");

  if (!registrationId) return;

  await query(
    `UPDATE public.event_registrations
     SET status='cancelled'
     WHERE id=$1::uuid AND auth_user_id=$2::uuid`,
    [registrationId, user.id]
  );

  revalidatePath("/dashboard");
}

export async function signOut() {
  try {
    await getAuth().signOut();
  } finally {
    redirect("/");
  }
}
