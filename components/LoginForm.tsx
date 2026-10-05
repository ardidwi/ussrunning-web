"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail, type LoginState } from "@/app/login/actions";
import USSNotice from "@/components/auth/USSNotice";

const initialState: LoginState = {};

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState
  );
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    if (state.status) setNoticeOpen(true);
  }, [state]);

  const success = state.status === "success";

  return (
    <>
      <form action={formAction} className="login-form-v3">
        <label className="login-field-v3">
          <span className="login-field-head">
            <b>EMAIL</b>
            <small>01</small>
          </span>
          <input
            type="email"
            name="email"
            placeholder="you@email.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="login-field-v3">
          <span className="login-field-head">
            <b>PASSWORD</b>
            <small>02</small>
          </span>
          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        <div className="login-form-meta-v3">
          <span>SECURE MEMBER ACCESS</span>
          <a href="mailto:hello@ussrunning.com">NEED HELP? ↗</a>
        </div>

        <button className="login-primary login-primary-v3" type="submit" disabled={pending}>
          <span>{pending ? "SIGNING IN..." : "LOG IN"}</span>
          <b>↗</b>
        </button>
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
