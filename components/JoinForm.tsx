"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createMember, type JoinState } from "@/app/join/actions";

const initialState: JoinState = {};

export default function JoinForm() {
  const [state, formAction, pending] = useActionState(
    createMember,
    initialState
  );

  return (
    <form action={formAction} className="join-form">
      <div className="join-form-grid">
        <label>FIRST NAME<input name="firstName" required /></label>
        <label>LAST NAME<input name="lastName" /></label>
        <label>EMAIL<input name="email" type="email" placeholder="you@email.com" autoComplete="email" required /></label>
        <label>MOBILE NUMBER<input name="mobile" type="tel" placeholder="+62..." required /></label>
        <label>CITY<input name="city" defaultValue="Jakarta" required /></label>
        <label>INSTAGRAM <span>(OPTIONAL)</span><input name="instagram" placeholder="@username" /></label>
        <label>PASSWORD<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <label>CONFIRM PASSWORD<input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label>
      </div>

      <div className="consent-stack">
        <label className="consent-check">
          <input type="checkbox" name="acceptLegal" required />
          <span>
            I have read and understood the <Link href="/privacy" target="_blank">Privacy Policy</Link> and
            <Link href="/terms" target="_blank"> Terms of Use</Link>, and I agree to the processing of my personal data
            for USS membership, event registration, run passes and community administration.
          </span>
        </label>

        <label className="consent-check consent-optional">
          <input type="checkbox" name="marketingConsent" />
          <span>
            I would also like to receive USS Running community news, event updates and selected announcements by email.
            I can unsubscribe at any time.
          </span>
        </label>
      </div>

      {state.error ? (
        <p className="auth-form-error" role="alert">{state.error}</p>
      ) : null}

      <button className="button button-dark full-button join-submit" type="submit" disabled={pending}>
        {pending ? "CREATING USS ID..." : "CREATE FREE USS ID"}
      </button>
      <small>
        ALREADY A MEMBER? <Link href="/login">LOG IN ↗</Link>
      </small>
    </form>
  );
}
