import { normalizeAuthCode, type AuthErrorCode } from "./auth-errors";
export type AuthFlow = "login" | "register" | "verify" | "forgot" | "reset";
export type AuthOperation = AuthFlow | "resend";
export type AuthPolicy = {
  minimumPasswordLength: number;
  maximumPasswordLength: number;
  maximumNameLength: number;
};
export type AuthInput = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  consent?: boolean;
  token?: string;
  code?: string;
  returnTo?: string;
};
export type AuthField =
  "email" | "password" | "confirmPassword" | "fullName" | "consent" | "code";
export type AuthResult =
  | { state: "error"; code: AuthErrorCode; retryAfterSeconds?: number }
  | { state: "signed_in"; returnTo?: string }
  | {
      state: "verification_required";
      email?: string;
      verificationMode?: "link" | "code";
      retryAfterSeconds?: number;
      verificationError?: AuthErrorCode;
      requiresSignIn?: boolean;
    }
  | {
      state:
        | "verified"
        | "already_verified"
        | "recovery_sent"
        | "password_reset"
        | "resend_sent";
      retryAfterSeconds?: number;
      accountStatus?: "active" | "pending_verification" | "suspended" | "deactivated" | "unknown";
    };
export type AuthAdapter = (
  operation: AuthOperation,
  input: AuthInput,
) => Promise<AuthResult>;
const successes: Record<AuthOperation, readonly string[]> = {
  login: ["signed_in", "verification_required"],
  register: ["verification_required", "already_verified"],
  verify: ["verified", "already_verified"],
  forgot: ["recovery_sent"],
  reset: ["password_reset"],
  resend: ["resend_sent", "already_verified"],
};
// Only this boundary interprets backend codes. Never render an upstream message.
export function decodeAuthResult(
  raw: unknown,
  operation: AuthOperation,
): AuthResult {
  if (!raw || typeof raw !== "object")
    return { state: "error", code: "UNKNOWN_ERROR" };
  const value = raw as Record<string, unknown>;
  const retryAfterSeconds =
    typeof value.retryAfterSeconds === "number" &&
    Number.isFinite(value.retryAfterSeconds) &&
    value.retryAfterSeconds >= 0 &&
    value.retryAfterSeconds <= 86400
      ? Math.ceil(value.retryAfterSeconds)
      : undefined;
  if (value.state === "error")
    return {
      state: "error",
      code: normalizeAuthCode(value.code, operation === "reset"),
      retryAfterSeconds,
    };
  if (!successes[operation].includes(String(value.state)))
    return { state: "error", code: "UNKNOWN_ERROR" };
  if (value.state === "signed_in")
    return {
      state: "signed_in",
      returnTo: typeof value.returnTo === "string" ? value.returnTo : undefined,
    };
  if (value.state === "verification_required")
    return {
      state: "verification_required",
      email: typeof value.email === "string" ? value.email : undefined,
      verificationMode: value.verificationMode === "code" ? "code" : "link",
      retryAfterSeconds,
      verificationError: value.verificationError ? normalizeAuthCode(value.verificationError) : undefined,
      requiresSignIn: value.requiresSignIn === true,
    };
  const accountStatus = ["active","pending_verification","suspended","deactivated","unknown"].includes(String(value.accountStatus)) ? value.accountStatus as "active" | "pending_verification" | "suspended" | "deactivated" | "unknown" : undefined;
  return { state: value.state, retryAfterSeconds, accountStatus } as AuthResult;
}
