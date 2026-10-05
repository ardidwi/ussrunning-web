"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createMember, type JoinState } from "@/app/join/actions";
import USSNotice from "@/components/auth/USSNotice";

const initialState: JoinState = {};

function RequiredMark() {
  return <span className="join-required" aria-hidden="true">*</span>;
}

export default function JoinForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createMember, initialState);
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    if (state.status) setNoticeOpen(true);
  }, [state]);

  const success = state.status === "success";

  return (
    <>
      <form action={formAction} className="join-form join-form-v3">
        <section className="join-form-section">
          <div className="join-form-section-head">
            <span>01</span>
            <div>
              <strong>YOUR DETAILS</strong>
              <small>Basic information for your USS member profile.</small>
            </div>
          </div>

          <div className="join-form-grid">
            <label>FIRST NAME <RequiredMark /><input name="firstName" autoComplete="given-name" required /></label>
            <label>LAST NAME<input name="lastName" autoComplete="family-name" /></label>
            <label>EMAIL <RequiredMark /><input name="email" type="email" placeholder="you@email.com" autoComplete="email" required /></label>
            <label>MOBILE NUMBER <RequiredMark /><input name="mobile" type="tel" placeholder="+62..." autoComplete="tel" required /></label>
            <label>CITY <RequiredMark /><input name="city" defaultValue="Jakarta" required /></label>
            <label>INSTAGRAM <RequiredMark /><input name="instagram" placeholder="@username" autoComplete="off" required /></label>
          </div>
        </section>

        <section className="join-form-section join-safety-section">
          <div className="join-form-section-head">
            <span>02</span>
            <div>
              <strong>EMERGENCY CONTACT</strong>
              <small>Someone we can contact if support is needed during a USS activity.</small>
            </div>
          </div>

          <div className="join-form-grid">
            <label>CONTACT NAME <RequiredMark /><input name="emergencyContactName" placeholder="Full name" autoComplete="off" required /></label>
            <label>CONTACT NUMBER <RequiredMark /><input name="emergencyContactMobile" type="tel" placeholder="+62..." autoComplete="off" required /></label>
          </div>
        </section>

        <section className="join-form-section">
          <div className="join-form-section-head">
            <span>03</span>
            <div>
              <strong>SECURITY</strong>
              <small>Use at least 8 characters for your password.</small>
            </div>
          </div>

          <div className="join-form-grid">
            <label>PASSWORD <RequiredMark /><input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
            <label>CONFIRM PASSWORD <RequiredMark /><input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required /></label>
          </div>
        </section>

        <div className="join-required-note"><RequiredMark /> REQUIRED INFORMATION</div>

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

        <button className="button button-dark full-button join-submit join-submit-v3" type="submit" disabled={pending}>
          <span>{pending ? "CREATING USS ID..." : "CREATE USS ID"}</span>
          <b aria-hidden="true">↗</b>
        </button>

        <div className="join-login-link">
          <span>ALREADY A MEMBER?</span>
          <Link href="/login">LOG IN ↗</Link>
        </div>
      </form>

      <USSNotice
        open={noticeOpen}
        kind={success ? "success" : "error"}
        eyebrow="USS MEMBERSHIP"
        title={success ? "USS ID CREATED." : "WE COULDN'T CREATE IT."}
        message={
          state.message ||
          (success
            ? "Your USS account is ready."
            : "Please review your information and try again.")
        }
        detail={success && state.memberCode ? state.memberCode : undefined}
        primaryLabel={success ? "OPEN MY USS" : "BACK TO FORM"}
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
