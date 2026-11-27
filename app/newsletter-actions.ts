"use server";

import { subscribeToNewsletter } from "@/lib/newsletter/newsletter-service";

/** Footer opt-in. Throws on rejected input so the form shows failure instead of a false confirmation. */
export async function subscribeNewsletter(formData: FormData) {
  const result = await subscribeToNewsletter({
    email: formData.get("email"),
    consent: formData.get("consent") === "on",
  });
  if (!result.ok) throw new Error(result.code);
}
