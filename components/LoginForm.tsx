"use client";
import AuthFlow from "@/components/auth/AuthFlow";
import type { AuthPolicy } from "@/lib/auth/contract";
export default function LoginForm({
  policy,
  returnTo,
  sessionExpired,
}: {
  policy: AuthPolicy;
  returnTo?: string;
  sessionExpired?: boolean;
}) {
  return (
    <AuthFlow
      flow="login"
      policy={policy}
      returnTo={returnTo}
      sessionExpired={sessionExpired}
    />
  );
}
