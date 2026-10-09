export const authMessages = {
  UNAUTHENTICATED: "Your session has expired. Sign in again to continue.",
  INVALID_CREDENTIALS:
    "We couldn't sign you in. Check your email and password and try again.",
  ACCOUNT_NOT_PROVISIONED:
    "Your USS account is still being prepared. Please contact support before trying again.",
  EMAIL_NOT_VERIFIED: "Verify your email before signing in to USS Running.",
  VERIFICATION_EXPIRED:
    "This verification link or code has expired. Request a new email to continue.",
  VERIFICATION_INVALID:
    "This verification link or code isn't valid. Check it or request a new email.",
  VERIFICATION_RESEND_COOLDOWN:
    "Please wait before requesting another verification email.",
  ACCOUNT_SUSPENDED:
    "Your USS Running account is currently suspended. Please contact USS Running support if you believe this is an error.",
  ACCOUNT_DEACTIVATED:
    "This USS Running account is no longer active. Contact support if you need help.",
  ACCOUNT_CONFLICT:
    "An account with this email already exists. Sign in or reset your password.",
  VALIDATION_ERROR: "Please review the highlighted fields and try again.",
  RATE_LIMITED: "Too many requests. Please wait before trying again.",
  NETWORK_ERROR: "We couldn't connect. Check your connection and try again.",
  UNKNOWN_ERROR: "We couldn't complete your request. Please try again.",
  AUTH_UNAVAILABLE:
    "This account service is temporarily unavailable. Please try again later or contact USS Running support.",
  RESET_EXPIRED: "This password reset link has expired. Request a new link.",
  RESET_INVALID: "This password reset link isn't valid. Request a new link.",
} as const;
export type AuthErrorCode = keyof typeof authMessages;
const aliases: Record<string, AuthErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: "INVALID_CREDENTIALS",
  INVALID_PASSWORD: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  USER_ALREADY_EXISTS: "ACCOUNT_CONFLICT",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "ACCOUNT_CONFLICT",
  SESSION_EXPIRED: "UNAUTHENTICATED",
  INVALID_TOKEN: "VERIFICATION_INVALID",
  TOKEN_EXPIRED: "VERIFICATION_EXPIRED",
  TOO_MANY_REQUESTS: "RATE_LIMITED",
};
export function normalizeAuthCode(
  value: unknown,
  reset = false,
): AuthErrorCode {
  if (typeof value !== "string") return "UNKNOWN_ERROR";
  const code = Object.hasOwn(authMessages, value)
    ? (value as AuthErrorCode)
    : (aliases[value] ?? "UNKNOWN_ERROR");
  if (reset && code === "VERIFICATION_EXPIRED") return "RESET_EXPIRED";
  if (reset && code === "VERIFICATION_INVALID") return "RESET_INVALID";
  return code;
}
