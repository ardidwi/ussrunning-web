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
    <form action={formAction} className="login-form-v2">
      <label>
        <span>EMAIL</span>
        <input
          type="email"
          name="email"
          placeholder="you@email.com"
          autoComplete="email"
          required
        />
      </label>

      <label>
        <span>PASSWORD</span>
        <input
          type="password"
          name="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </label>

      <div className="login-form-options">
        <label className="login-remember">
          <input type="checkbox" name="remember" />
          <span>KEEP ME SIGNED IN</span>
        </label>
        <span className="login-help">NEED HELP? CONTACT USS</span>
      </div>

      {state.error ? (
        <p className="auth-form-error" role="alert">{state.error}</p>
      ) : null}

      <button className="login-primary" type="submit" disabled={pending}>
        {pending ? "SIGNING IN..." : "LOG IN"} <span>↗</span>
      </button>
    </form>
  );
}
