"use server";

import { getAuth } from "@/lib/auth/server";

export type LoginState = {
  status?: "success" | "error";
  message?: string;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function signInWithEmail(
  _state: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      status: "error",
      message: "Email and password are required.",
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "Please enter a valid email address.",
    };
  }

  try {
    const { error } = await getAuth().signIn.email({ email, password });

    if (error) {
      return {
        status: "error",
        message: "We couldn't confirm that email and password. Please check them and try again.",
      };
    }

    return {
      status: "success",
      message:
        "You are signed in. Continue to My USS to view your member profile and runs.",
    };
  } catch {
    return {
      status: "error",
      message: "Unable to sign in right now. Please try again in a moment.",
    };
  }
}
