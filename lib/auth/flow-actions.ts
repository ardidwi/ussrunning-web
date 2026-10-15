"use server";
import { revalidatePath } from "next/cache";
import { executeAuthFlow } from "./flow-service";
import { getAuth, isAuthConfigured } from "./server";
import type { AuthOperation, AuthResult } from "./contract";
export async function runAuthOperation(operation: AuthOperation, input: FormData, returnTo?: string): Promise<AuthResult> {
  const result = await executeAuthFlow(operation, input, returnTo);
  if (["signed_in","verified","already_verified","password_reset"].includes(result.state)) revalidatePath("/dashboard", "layout");
  return result;
}
export async function signOutAccount(): Promise<{ ok: boolean }> {
  if (!isAuthConfigured()) return { ok: false };
  try { const result = await getAuth().signOut(); if (result.error) return { ok: false }; revalidatePath("/dashboard", "layout"); return { ok: true }; }
  catch { return { ok: false }; }
}
