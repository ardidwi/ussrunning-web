"use client";
import { useCallback, useState } from "react";
import AuthFlow from "./AuthFlow";
import type {
  AuthAdapter,
  AuthFlow as Flow,
  AuthOperation,
  AuthPolicy,
  AuthResult,
} from "@/lib/auth/contract";
import { normalizeAuthCode } from "@/lib/auth/auth-errors";
// This module is imported exclusively behind the development-only reference gate.
export default function AuthReference({
  flow,
  scenario,
  policy,
}: {
  flow: Flow;
  scenario: string;
  policy: AuthPolicy;
}) {
  const [calls, setCalls] = useState(0);
  const [destination, setDestination] = useState("");
  const adapter = useCallback<AuthAdapter>(
    async (operation, input) => {
      setCalls((current) => current + 1);
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (scenario === "network")
        throw new TypeError("Development network scenario");
      if (scenario === "malformed") return {} as AuthResult;
      if (scenario === "cooldown" && operation === "resend")
        return {
          state: "error",
          code: "VERIFICATION_RESEND_COOLDOWN",
          retryAfterSeconds: 3,
        };
      if (scenario === "rate" && operation === "resend")
        return { state: "error", code: "RATE_LIMITED", retryAfterSeconds: 3 };
      if (scenario === "verified-pending" && operation === "verify") return { state: "verified", accountStatus: "pending_verification" };
      if (scenario === "verified-unknown" && operation === "verify") return { state: "verified", accountStatus: "unknown" };
      if (scenario === "delivery-unavailable" && operation === "register") return { state: "verification_required", email: input.email, verificationError: "EMAIL_NOT_CONFIGURED" };
      if (
        scenario !== "success" &&
        scenario !== "cooldown" &&
        scenario !== "rate" &&
        scenario !== "code" &&
        scenario !== "already" &&
        scenario !== "session"
      )
        return {
          state: "error",
          code: normalizeAuthCode(scenario, operation === "reset"),
        };
      const results: Record<AuthOperation, AuthResult> = {
        login: { state: "signed_in", returnTo: "/dashboard" },
        register: {
          state: "verification_required",
          email: input.email,
          verificationMode: scenario === "code" ? "code" : "link",
        },
        forgot: { state: "recovery_sent" },
        reset: { state: "password_reset" },
        verify: {
          state: scenario === "already" ? "already_verified" : "verified",
        },
        resend: { state: "resend_sent", retryAfterSeconds: 3 },
      };
      return results[operation];
    },
    [scenario],
  );
  const signedIn = useCallback((path: string) => setDestination(path), []);
  return (
    <>
      <p className="uss-reference-disclosure">
        Development scenario only. No provider requests, sessions or emails.
      </p>
      <output data-testid="auth-calls">Requests: {calls}</output>
      <output data-testid="auth-destination">
        {destination ? "Sign-in destination: " + destination : ""}
      </output>
      <AuthFlow
        flow={flow}
        policy={policy}
        adapter={adapter}
        token={
          flow === "reset" || flow === "verify"
            ? "development-reference-only"
            : undefined
        }
        verificationMode={scenario === "code" ? "code" : "link"}
        sessionExpired={scenario === "session"}
        onSignedIn={signedIn}
      />
    </>
  );
}
