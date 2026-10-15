"use client";
import { useEffect, useRef } from "react";
import { authMessages } from "@/lib/auth/auth-errors";
import type { AuthResult } from "@/lib/auth/contract";
import { LinkButton } from "@/components/ui";
const successCopy = {
  verified: ["EMAIL VERIFIED.", "Email verification completed. Sign in to check your account status."],
  already_verified: [
    "ALREADY VERIFIED.",
    "Your email is already verified. You can sign in.",
  ],
  password_reset: [
    "PASSWORD UPDATED.",
    "Your password has been reset. Sign in with your new password.",
  ],
  recovery_sent: [
    "CHECK YOUR EMAIL.",
    "If an account exists for this email, password reset instructions have been sent.",
  ],
} as const;
export function AuthStatus({
  result,
  loginHref = "/login",
}: {
  result: AuthResult;
  loginHref?: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [result]);
  if (result.state === "error") {
    const account = [
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_DEACTIVATED",
      "ACCOUNT_NOT_PROVISIONED",
    ].includes(result.code);
    return (
      <div
        className={account ? "uss-auth-status" : "uss-auth-feedback"}
        role="alert"
      >
        {account && (
          <h3 ref={heading} tabIndex={-1}>
            {result.code === "ACCOUNT_SUSPENDED"
              ? "ACCOUNT SUSPENDED."
              : result.code === "ACCOUNT_DEACTIVATED"
                ? "ACCOUNT DEACTIVATED."
                : "ACCOUNT IN PREPARATION."}
          </h3>
        )}
        <p>{authMessages[result.code]}</p>
        {account && (
          <LinkButton href="mailto:hello@ussrunning.com" variant="secondary">
            Contact USS support ↗
          </LinkButton>
        )}
      </div>
    );
  }
  if (result.state in successCopy) {
    const [title, message] =
      successCopy[result.state as keyof typeof successCopy];
    return (
      <div className="uss-auth-status" role="status">
        <h3 ref={heading} tabIndex={-1}>
          {title}
        </h3>
        <p>{message}</p>
        {(result.state === "verified" || result.state === "already_verified") && result.accountStatus && <p role="status">{result.accountStatus === "active" ? "Your signed-in account is active. Any profile requirements still apply." : result.accountStatus === "unknown" ? "Account status could not be confirmed here. Sign in to refresh your account." : result.accountStatus === "pending_verification" ? "Your signed-in account is still pending verification. Follow its current account guidance." : result.accountStatus === "suspended" ? authMessages.ACCOUNT_SUSPENDED : authMessages.ACCOUNT_DEACTIVATED}</p>}
        <LinkButton href={loginHref}>Sign in ↗</LinkButton>
        {result.state === "recovery_sent" && (
          <p>
            Check your spam folder too. If the email doesn't arrive, you can try
            again.
          </p>
        )}
      </div>
    );
  }
  return null;
}
