"use client";

import { useActionState } from "react";
import { signInWithEmail, type LoginState } from "@/app/login/actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState
  );

  return (
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

      {state.error ? (
        <p className="auth-form-error" role="alert">{state.error}</p>
      ) : null}

      <button className="login-primary login-primary-v3" type="submit" disabled={pending}>
        <span>{pending ? "SIGNING IN..." : "LOG IN"}</span>
        <b>↗</b>
      </button>
    </form>
  );
}
