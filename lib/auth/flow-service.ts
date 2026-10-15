import "server-only";
import { getAuth, isAuthConfigured } from "./server";
import { getCutoverAccount, recordSignupPrivacy } from "./cutover-account";
import { requestOwnEmailVerification } from "./verification-actions";
import { verifyEmailProof } from "./email-verification";
import { normalizeAuthCode } from "./auth-errors";
import { getClientAuthPolicy } from "./policy";
import { validateAuth } from "./validation";
import { safeReturnPath } from "./return-path";
import type { AuthInput, AuthOperation, AuthResult } from "./contract";
import type { CurrentAccount } from "./types";
import type { VerificationResult } from "@/lib/email/types";
type Reply = { data?: unknown; error?: { code?: string; status?: number } | null };
export type AuthFlowDependencies = {
  configured(): boolean;
  login(email: string, password: string): Promise<Reply>;
  signup(email: string, password: string, name: string): Promise<Reply>;
  account(): Promise<CurrentAccount | null>;
  consent(account: CurrentAccount): Promise<void>;
  resend(): Promise<VerificationResult>;
  verify(token: string): Promise<VerificationResult>;
  forgot(email: string, redirectTo: string): Promise<Reply>;
  reset(password: string, token: string): Promise<Reply>;
};
const production: AuthFlowDependencies = {
  configured: isAuthConfigured,
  login: (email, password) => getAuth().signIn.email({ email, password }),
  signup: (email, password, name) => getAuth().signUp.email({ email, password, name }),
  account: getCutoverAccount, consent: recordSignupPrivacy,
  resend: requestOwnEmailVerification, verify: verifyEmailProof,
  forgot: (email, redirectTo) => getAuth().requestPasswordReset({ email, redirectTo }),
  reset: (newPassword, token) => getAuth().resetPassword({ newPassword, token }),
};
const keys: Record<AuthOperation, readonly string[]> = { login: ["email","password"], register: ["email","password","confirmPassword","fullName","consent"], verify: ["token"], resend: [], forgot: ["email"], reset: ["password","confirmPassword","token"] };
function fail(code: unknown, reset = false): AuthResult { return { state: "error", code: normalizeAuthCode(code, reset) }; }
function verification(result: VerificationResult, resend: boolean): AuthResult {
  if (result.code === "ACCOUNT_ALREADY_ACTIVE") return { state: "already_verified" };
  if (result.ok && result.code === (resend ? "VERIFICATION_ISSUED" : "VERIFICATION_SUCCESS")) return { state: resend ? "resend_sent" : "verified", retryAfterSeconds: result.retryAfterSeconds };
  if (result.ok) return { state: "error", code: "AUTH_UNAVAILABLE" };
  return { state: "error", code: normalizeAuthCode(result.code), retryAfterSeconds: result.retryAfterSeconds };
}
export async function executeAuthFlow(operation: AuthOperation, form: FormData, returnTo?: string, deps = production): Promise<AuthResult> {
  if (!Object.hasOwn(keys, operation) || !(form instanceof FormData)) return fail("VALIDATION_ERROR");
  for (const [key, value] of form.entries()) if (!keys[operation].includes(key) || typeof value !== "string" || value.length > 2048 || form.getAll(key).length !== 1) return fail("VALIDATION_ERROR");
  const input: AuthInput = { email: String(form.get("email") ?? "").trim().toLowerCase(), password: String(form.get("password") ?? ""), confirmPassword: String(form.get("confirmPassword") ?? ""), fullName: String(form.get("fullName") ?? "").trim(), consent: form.get("consent") === "true" };
  if (!["resend","verify"].includes(operation) && Object.keys(validateAuth(operation, input, getClientAuthPolicy())).length) return fail("VALIDATION_ERROR");
  if (operation === "register" && /[<>\x00-\x1f]/.test(input.fullName!)) return fail("VALIDATION_ERROR");
  const token = String(form.get("token") ?? "");
  try {
    if (operation === "verify") {
      const outcome = verification(await deps.verify(token), false);
      if (outcome.state !== "verified" && outcome.state !== "already_verified") return outcome;
      try { const account = await deps.account(); return { ...outcome, accountStatus: account?.status ?? "unknown" }; }
      catch { return { ...outcome, accountStatus: "unknown" }; }
    }
    if (!deps.configured()) return fail("AUTH_UNAVAILABLE");
    if (operation === "resend") {
      const account = await deps.account(); if (!account) return fail("UNAUTHENTICATED");
      if (account.status === "suspended") return fail("ACCOUNT_SUSPENDED");
      if (account.status === "deactivated") return fail("ACCOUNT_DEACTIVATED");
      return verification(await deps.resend(), true);
    }
    if (operation === "forgot") {
      const origin = process.env.APP_BASE_URL; if (!origin) return fail("AUTH_UNAVAILABLE");
      const url = new URL(origin);
      if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return fail("AUTH_UNAVAILABLE");
      const response = await deps.forgot(input.email!, `${url.origin}/login?flow=reset`);
      if (response.error && response.error.code !== "USER_NOT_FOUND") return fail(response.error.code || "AUTH_UNAVAILABLE");
      if (!response.error && (!response.data || typeof response.data !== "object" || !("status" in response.data) || response.data.status !== true)) return fail("AUTH_UNAVAILABLE");
      return { state: "recovery_sent" };
    }
    if (operation === "reset") {
      if (!token || token.length > 512) return fail("RESET_INVALID");
      const response = await deps.reset(input.password!, token);
      if (response.error) return fail(response.error.code || "AUTH_UNAVAILABLE", true);
      return response.data && typeof response.data === "object" && "status" in response.data && response.data.status === true ? { state: "password_reset" } : fail("AUTH_UNAVAILABLE");
    }
    const response = operation === "register" ? await deps.signup(input.email!, input.password!, input.fullName!) : await deps.login(input.email!, input.password!);
    if (response.error) return fail(response.error.status === 429 ? "RATE_LIMITED" : response.error.code || "AUTH_UNAVAILABLE");
    if (!response.data || typeof response.data !== "object" || !("user" in response.data) || !response.data.user) return fail("AUTH_UNAVAILABLE");
    const account = await deps.account();
    if (!account) return operation === "register" ? { state: "verification_required", email: input.email, requiresSignIn: true } : fail("UNAUTHENTICATED");
    if (account.email.toLowerCase() !== input.email) return fail("ACCOUNT_CONFLICT");
    if (account.status === "suspended") return fail("ACCOUNT_SUSPENDED");
    if (account.status === "deactivated") return fail("ACCOUNT_DEACTIVATED");
    if (operation === "register" && account.status !== "pending_verification") return fail("ACCOUNT_CONFLICT");
    if (operation === "register") await deps.consent(account);
    if (operation === "register" || account.status === "pending_verification" || !account.emailVerifiedAt) {
      const delivery = operation === "register" ? await deps.resend() : undefined;
      if (delivery?.code === "ACCOUNT_ALREADY_ACTIVE") { const latest = await deps.account(); return { state: "already_verified", accountStatus: latest?.status ?? "unknown" }; }
      return { state: "verification_required", email: account.email, verificationMode: "link", retryAfterSeconds: delivery?.retryAfterSeconds, verificationError: delivery && !delivery.ok ? normalizeAuthCode(delivery.code) : undefined };
    }
    return { state: "signed_in", returnTo: safeReturnPath(returnTo) };
  } catch (error) { return fail(error && typeof error === "object" && "code" in error ? error.code : "AUTH_UNAVAILABLE"); }
}
