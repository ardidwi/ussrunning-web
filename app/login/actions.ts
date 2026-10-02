"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type LoginState = { error?: string };

export async function loginWithEmail(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const { error } = await getAuth().signIn.email({
      email,
      password,
    });

    if (error) {
      return { error: error.message || "Email or password is invalid." };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error && error.message
          ? error.message
          : "Unable to sign in right now. Please try again.",
    };
  }

  redirect("/dashboard");
}
