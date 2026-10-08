"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, type LoginState } from "@/app/login/actions";
import USSNotice from "@/components/auth/USSNotice";
import { Field, Input, PasswordInput, Button } from "@/components/ui";

const initialState: LoginState = {};

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState,
  );
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  useEffect(() => {
    if (state.status) setNoticeOpen(true);
  }, [state]);

  const success = state.status === "success";

  return (
    <>
      <form
        action={formAction}
        className="login-form-v3"
        noValidate
        onSubmit={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          const next = {
            email: !values.email.trim()
              ? "Email is required."
              : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
                ? "Enter a valid email address."
                : undefined,
            password: !values.password ? "Password is required." : undefined,
          };
          setErrors(next);
          if (next.email || next.password) {
            event.preventDefault();
            (
              event.currentTarget.elements.namedItem(
                next.email ? "email" : "password",
              ) as HTMLElement
            )?.focus();
          }
        }}
      >
        <Field
          label="Email address"
          error={errors.email}
          required
          hint="Use the active email associated with your USS account."
        >
          <Input
            type="email"
            name="email"
            value={values.email}
            onChange={(event) => {
              const value = event.target.value;
              setValues((current) => ({ ...current, email: value }));
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="you@email.com"
            autoComplete="email"
            required
            disabled={pending}
          />
        </Field>
        <Field
          label="Password"
          error={errors.password}
          required
          hint="Enter your account password. Use the eye button to check what you entered."
        >
          <PasswordInput
            name="password"
            value={values.password}
            onChange={(event) => {
              const value = event.target.value;
              setValues((current) => ({ ...current, password: value }));
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={pending}
          />
        </Field>
        <div className="login-form-meta-v3">
          <span>SECURE MEMBER ACCESS</span>
          <a href="mailto:hello@ussrunning.com">NEED HELP? ↗</a>
        </div>
        <Button type="submit" loading={pending} loadingLabel="Signing in…">
          LOG IN ↗
        </Button>
      </form>
      <USSNotice
        open={noticeOpen}
        kind={success ? "success" : "error"}
        eyebrow="MY USS"
        title={success ? "WELCOME BACK." : "ACCESS NOT CONFIRMED."}
        message={
          state.message ||
          (success
            ? "Your USS session is ready."
            : "Please check your email and password, then try again.")
        }
        primaryLabel={success ? "OPEN MY USS" : "TRY AGAIN"}
        onPrimary={() => {
          if (success) router.push("/dashboard");
          else setNoticeOpen(false);
        }}
        secondaryLabel={success ? "STAY HERE" : "CLOSE"}
        onClose={() => setNoticeOpen(false)}
      />
    </>
  );
}
