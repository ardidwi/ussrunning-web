"use server";

import { getAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";

export type LoginState = {
  error?: string;
};

export async function signInWithEmail(
  _prevState: LoginState,
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
      return { error: error.message || "Unable to sign in." };
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Authentication is not configured yet.",
    };
  }

  redirect("/dashboard");
}
