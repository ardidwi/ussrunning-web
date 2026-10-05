"use server";

import { getAuth } from "@/lib/auth/server";

export type LoginState = {
  status?: "success" | "error";
  message?: string;
};

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

  try {
    const { error } = await getAuth().signIn.email({ email, password });

    if (error) {
      return {
        status: "error",
        message: error.message || "Email or password is invalid.",
      };
    }

    return {
      status: "success",
      message: "You are signed in. Continue to My USS to view your member profile and runs.",
    };
  } catch (cause) {
    return {
      status: "error",
      message:
        cause instanceof Error && cause.message
          ? cause.message
          : "Unable to sign in right now. Please try again.",
    };
  }
}
