import { createNeonAuth } from "@neondatabase/auth/next/server";

export function isAuthConfigured() {
  return Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET
  );
}

export function getAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      "Managed Neon Auth is not fully configured. NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are required."
    );
  }

  return createNeonAuth({
    baseUrl,
    cookies: {
      secret,
    },
    logLevel: "warn",
  });
}
