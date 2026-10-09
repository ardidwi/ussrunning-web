"use server";
import { getCurrentAccount } from "./account-provisioning";
import { issueEmailVerification } from "./email-verification";
import type { VerificationResult } from "@/lib/email/types";
/** Request/resend are the same input-free own-account contract. No email lookup or client IDs. */
export async function requestOwnEmailVerification(): Promise<VerificationResult> {
  try {
    const account = await getCurrentAccount();
    if (!account) return { ok: false, code: "UNAUTHENTICATED" };
    return await issueEmailVerification(account.id);
  } catch { return { ok: false, code: "VERIFICATION_UNAVAILABLE" }; }
}
