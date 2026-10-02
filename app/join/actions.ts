"use server";

import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export type JoinState = { error?: string };

export async function joinWithEmail(
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
    const { error } = await getAuth().signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      return { error: error.message || "Unable to create your USS ID." };
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
