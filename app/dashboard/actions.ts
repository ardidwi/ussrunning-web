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

export async function updateMemberProfile(
  _prev: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const user = await requireUser();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const mobile = String(formData.get("mobile") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const instagram = String(formData.get("instagram") || "").trim();

  if (!firstName) return { error: "First name is required." };

  await query(
    `INSERT INTO public.user_profiles(auth_user_id,first_name,last_name,mobile,city,instagram)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(auth_user_id)
     DO UPDATE SET
       first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name,
       mobile=EXCLUDED.mobile,
       city=EXCLUDED.city,
       instagram=EXCLUDED.instagram,
       updated_at=now()`,
    [user.id, firstName, lastName || null, mobile || null, city || null, instagram || null]
  );

  revalidatePath("/dashboard");
  return { ok: "Profile updated." };
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
