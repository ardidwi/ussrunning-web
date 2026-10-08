"use client";
import { useEffect, useState } from "react";
import { Field, Input, Button, useToast } from "@/components/ui";
import type { AuthAdapter, AuthPolicy } from "@/lib/auth/contract";
import { authMessages } from "@/lib/auth/auth-errors";
import { validateAuth } from "@/lib/auth/validation";
import { useAuthRequest } from "./useAuthRequest";
export default function ResendVerification({
  email,
  adapter,
  policy,
  initialRetryAfterSeconds,
}: {
  email?: string;
  adapter: AuthAdapter;
  policy: AuthPolicy;
  initialRetryAfterSeconds?: number;
}) {
  const [destination, setDestination] = useState(email ?? "");
  const [error, setError] = useState<string>();
  const [deadline, setDeadline] = useState<number | null>(() =>
    initialRetryAfterSeconds
      ? Date.now() + initialRetryAfterSeconds * 1000
      : null,
  );
  const [remaining, setRemaining] = useState(initialRetryAfterSeconds ?? 0);
  const request = useAuthRequest(adapter);
  const notify = useToast();
  useEffect(() => {
    if (deadline === null) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  const result =
    request.state.phase === "settled" ? request.state.result : undefined;
  const pending = request.state.phase === "submitting";
  return (
    <div className="uss-auth-resend">
      <h3>Didn't receive the email?</h3>
      <p>Check your spam folder, or request another verification email.</p>
      <form
        method="post"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending || remaining > 0) return;
          const errors = validateAuth("resend", { email: destination }, policy);
          setError(errors.email);
          if (errors.email) {
            (
              event.currentTarget.elements.namedItem(
                "resendEmail",
              ) as HTMLElement
            )?.focus();
            return;
          }
          const response = await request.submit("resend", {
            email: destination.trim(),
          });
          if (
            response &&
            "retryAfterSeconds" in response &&
            response.retryAfterSeconds !== undefined
          ) {
            setDeadline(Date.now() + response.retryAfterSeconds * 1000);
            setRemaining(response.retryAfterSeconds);
          }
          if (response?.state === "resend_sent")
            notify(
              "Verification email requested. Check your inbox.",
              "success",
            );
        }}
      >
        {!email && (
          <Field
            label="Email address"
            required
            hint="Use the email you registered with."
            error={error}
          >
            <Input
              name="resendEmail"
              type="email"
              autoComplete="email"
              value={destination}
              onChange={(event) => {
                setDestination(event.target.value);
                setError(undefined);
              }}
              placeholder="you@example.com"
              disabled={pending}
              required
            />
          </Field>
        )}
        <Button
          type="submit"
          variant="secondary"
          loading={pending}
          loadingLabel="Sending verification email…"
          disabled={remaining > 0}
        >
          Resend verification
        </Button>
        <div
          className="uss-auth-feedback"
          aria-live="polite"
          role={result?.state === "error" ? "alert" : "status"}
        >
          {result?.state === "error" && <p>{authMessages[result.code]}</p>}
          {result?.state === "resend_sent" && (
            <p>Verification email requested. Check your inbox.</p>
          )}
          {remaining > 0 && (
            <p>You can request another email in {remaining} seconds.</p>
          )}
        </div>
      </form>
    </div>
  );
}
