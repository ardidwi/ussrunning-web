"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { query } from "@/lib/db";

export type JoinState = { error?: string };

export async function createMember(
  _state: JoinState,
  formData: FormData
): Promise<JoinState> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const privacy = formData.get("privacy") === "on";

  if (!name || !email || !password) {
    return { error: "Name, email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (!privacy) {
    return { error: "Please accept the Privacy Policy and Terms of Use." };
  }

  try {
    const { data, error } = await getAuth().signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      return { error: error.message || "Unable to create your USS ID." };
    }

    const userId = data?.user?.id;
    if (userId) {
      await query(
        `INSERT INTO public.user_profiles(auth_user_id,first_name)
         VALUES($1,$2)
         ON CONFLICT(auth_user_id) DO NOTHING`,
        [userId, name]
      );

      await query(
        `INSERT INTO public.legal_consents(
           auth_user_id,consent_type,version,accepted,accepted_at,source
         )
         VALUES
           ($1,'privacy','2026-10-01',true,now(),'join'),
           ($1,'terms','2026-10-01',true,now(),'join')
         ON CONFLICT(auth_user_id,consent_type,version)
         DO UPDATE SET accepted=true,accepted_at=now(),source='join'`,
        [userId]
      );
    }
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message
          ? error.message
          : "Unable to create your USS ID right now. Please try again.",
    };
  }

  redirect("/dashboard");
}
