"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createMember,
  type JoinField,
  type JoinState,
} from "@/app/join/actions";
import USSNotice from "@/components/auth/USSNotice";

const initialState: JoinState = {};

type JoinValidationConfig = {
  minimumPasswordLength: number;
  maximumPasswordLength: number;
  maximumNameLength: number;
  maximumCityLength: number;
  maximumInstagramLength: number;
  minimumPhoneDigits: number;
  maximumPhoneDigits: number;
};

type Props = {
  validation: JoinValidationConfig;
};

function RequiredMark() {
  return (
    <span className="join-required" aria-hidden="true">
      *
    </span>
  );
}

function normalizeInstagram(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .replace(/^@+/, "");
}

function phoneDigits(value: string) {
  return value.replace(/\D/g, "").length;
}

export default function JoinForm({ validation }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createMember, initialState);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<JoinField, string>>
  >({});
  const [editedFields, setEditedFields] = useState<Partial<Record<JoinField, boolean>>>({});

  useEffect(() => {
    if (state.status) setNoticeOpen(true);
  }, [state]);

  const success = state.status === "success";
  const serverErrors = state.fieldErrors || {};

  const errorFor = useMemo(
    () =>
      (field: JoinField) =>
        clientErrors[field] || (!editedFields[field] ? serverErrors[field] : undefined),
    [clientErrors, editedFields, serverErrors]
  );

  function validateField(
    field: JoinField,
    value: string,
    form?: HTMLFormElement
  ): string | undefined {
    const cleaned = value.trim();

    if (field === "firstName") {
      if (!cleaned) return "First name is required.";
      if (cleaned.length > validation.maximumNameLength) {
        return `Use ${validation.maximumNameLength} characters or fewer.`;
      }
    }

    if (field === "lastName" && cleaned.length > validation.maximumNameLength) {
      return `Use ${validation.maximumNameLength} characters or fewer.`;
    }

    if (field === "email") {
      if (!cleaned) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        return "Enter a valid email address.";
      }
    }

    if (field === "mobile" || field === "emergencyContactMobile") {
      if (!cleaned) {
        return field === "mobile"
          ? "Mobile number is required."
          : "Emergency contact number is required.";
      }
      const length = phoneDigits(cleaned);
      if (
        length < validation.minimumPhoneDigits ||
        length > validation.maximumPhoneDigits
      ) {
        return "Enter a valid phone number.";
      }
    }

    if (field === "city") {
      if (!cleaned) return "City is required.";
      if (cleaned.length > validation.maximumCityLength) {
        return `Use ${validation.maximumCityLength} characters or fewer.`;
      }
    }

    if (field === "instagram") {
      const username = normalizeInstagram(cleaned);
      if (!username) return "Instagram is required.";
      if (
        username.length > validation.maximumInstagramLength ||
        !/^[A-Za-z0-9._]+$/.test(username)
      ) {
        return "Use a valid Instagram username.";
      }
    }

    if (field === "emergencyContactName") {
      if (!cleaned) return "Emergency contact name is required.";
      if (cleaned.length > validation.maximumNameLength) {
        return `Use ${validation.maximumNameLength} characters or fewer.`;
      }
    }

    if (field === "password") {
      if (
        value.length < validation.minimumPasswordLength ||
        value.length > validation.maximumPasswordLength
      ) {
        return `Password must be ${validation.minimumPasswordLength}-${validation.maximumPasswordLength} characters.`;
      }
    }

    if (field === "confirmPassword") {
      const password = form?.elements.namedItem("password") as HTMLInputElement | null;
      if (!value) return "Confirm your password.";
      if (password && value !== password.value) {
        return "Password confirmation does not match.";
      }
    }

    if (field === "acceptLegal") {
      const legal = form?.elements.namedItem("acceptLegal") as HTMLInputElement | null;
      if (!legal?.checked) return "Please accept the Privacy Policy and Terms of Use.";
    }

    return undefined;
  }

  function validateForm(form: HTMLFormElement) {
    const fields: JoinField[] = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "city",
      "instagram",
      "emergencyContactName",
      "emergencyContactMobile",
      "password",
      "confirmPassword",
      "acceptLegal",
    ];

    const errors: Partial<Record<JoinField, string>> = {};

    fields.forEach((field) => {
      const element = form.elements.namedItem(field) as HTMLInputElement | null;
      const message = validateField(field, element?.value || "", form);
      if (message) errors[field] = message;
    });

    return errors;
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    const field = event.currentTarget.name as JoinField;
    const form = event.currentTarget.form || undefined;
    const message = validateField(field, event.currentTarget.value, form);

    setEditedFields((current) => ({ ...current, [field]: true }));
    setClientErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget.name as JoinField;
    setEditedFields((current) => ({ ...current, [field]: true }));

    if (clientErrors[field]) {
      setClientErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const errors = validateForm(event.currentTarget);
    if (Object.keys(errors).length === 0) return;

    event.preventDefault();
    setClientErrors(errors);
    setEditedFields(
      Object.keys(errors).reduce<Partial<Record<JoinField, boolean>>>((acc, key) => {
        acc[key as JoinField] = true;
        return acc;
      }, {})
    );

    const firstField = Object.keys(errors)[0];
    const target = event.currentTarget.elements.namedItem(firstField) as HTMLElement | null;
    target?.focus();
  }

  function fieldMessage(field: JoinField) {
    const message = errorFor(field);
    return (
      <span className={`join-field-message ${message ? "is-error" : ""}`} aria-live="polite">
        {message || "\u00A0"}
      </span>
    );
  }

  return (
    <>
      <form
        action={formAction}
        className="join-form join-form-v3"
        noValidate
        onSubmit={handleSubmit}
      >
        <section className="join-form-section">
          <div className="join-form-section-head">
            <span>01</span>
            <div>
              <strong>YOUR DETAILS</strong>
              <small>Basic information for your USS member profile.</small>
            </div>
          </div>

          <div className="join-form-grid">
            <label>
              <span className="join-field-label">FIRST NAME <RequiredMark /></span>
              <input
                name="firstName"
                autoComplete="given-name"
                maxLength={validation.maximumNameLength}
                aria-invalid={Boolean(errorFor("firstName"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("firstName")}
            </label>

            <label>
              <span className="join-field-label">LAST NAME</span>
              <input
                name="lastName"
                autoComplete="family-name"
                maxLength={validation.maximumNameLength}
                aria-invalid={Boolean(errorFor("lastName"))}
                onBlur={handleBlur}
                onChange={handleChange}
              />
              {fieldMessage("lastName")}
            </label>

            <label>
              <span className="join-field-label">EMAIL <RequiredMark /></span>
              <input
                name="email"
                type="email"
                placeholder="you@email.com"
                autoComplete="email"
                inputMode="email"
                aria-invalid={Boolean(errorFor("email"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("email")}
            </label>

            <label>
              <span className="join-field-label">MOBILE NUMBER <RequiredMark /></span>
              <input
                name="mobile"
                type="tel"
                placeholder="+62..."
                autoComplete="tel"
                inputMode="tel"
                aria-invalid={Boolean(errorFor("mobile"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("mobile")}
            </label>

            <label>
              <span className="join-field-label">CITY <RequiredMark /></span>
              <input
                name="city"
                defaultValue="Jakarta"
                maxLength={validation.maximumCityLength}
                aria-invalid={Boolean(errorFor("city"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("city")}
            </label>

            <label>
              <span className="join-field-label">INSTAGRAM <RequiredMark /></span>
              <input
                name="instagram"
                placeholder="@username"
                autoComplete="off"
                maxLength={validation.maximumInstagramLength + 1}
                aria-invalid={Boolean(errorFor("instagram"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("instagram")}
            </label>
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
            <label>
              <span className="join-field-label">CONTACT NAME <RequiredMark /></span>
              <input
                name="emergencyContactName"
                placeholder="Full name"
                autoComplete="off"
                maxLength={validation.maximumNameLength}
                aria-invalid={Boolean(errorFor("emergencyContactName"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("emergencyContactName")}
            </label>

            <label>
              <span className="join-field-label">CONTACT NUMBER <RequiredMark /></span>
              <input
                name="emergencyContactMobile"
                type="tel"
                placeholder="+62..."
                autoComplete="off"
                inputMode="tel"
                aria-invalid={Boolean(errorFor("emergencyContactMobile"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("emergencyContactMobile")}
            </label>
          </div>
        </section>

        <section className="join-form-section">
          <div className="join-form-section-head">
            <span>03</span>
            <div>
              <strong>SECURITY</strong>
              <small>Use at least {validation.minimumPasswordLength} characters for your password.</small>
            </div>
          </div>

          <div className="join-form-grid">
            <label>
              <span className="join-field-label">PASSWORD <RequiredMark /></span>
              <input
                name="password"
                type="password"
                minLength={validation.minimumPasswordLength}
                maxLength={validation.maximumPasswordLength}
                autoComplete="new-password"
                aria-invalid={Boolean(errorFor("password"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("password")}
            </label>

            <label>
              <span className="join-field-label">CONFIRM PASSWORD <RequiredMark /></span>
              <input
                name="confirmPassword"
                type="password"
                minLength={validation.minimumPasswordLength}
                maxLength={validation.maximumPasswordLength}
                autoComplete="new-password"
                aria-invalid={Boolean(errorFor("confirmPassword"))}
                onBlur={handleBlur}
                onChange={handleChange}
                required
              />
              {fieldMessage("confirmPassword")}
            </label>
          </div>
        </section>

        <div className="join-required-note">
          <RequiredMark /> REQUIRED INFORMATION
        </div>

        <div className="consent-stack">
          <label className={`consent-check ${errorFor("acceptLegal") ? "is-error" : ""}`}>
            <input
              type="checkbox"
              name="acceptLegal"
              required
              onBlur={handleBlur}
              onChange={handleChange}
              aria-invalid={Boolean(errorFor("acceptLegal"))}
            />
            <span>
              I have read and understood the <Link href="/privacy" target="_blank">Privacy Policy</Link> and
              <Link href="/terms" target="_blank"> Terms of Use</Link>, and I agree to the processing of my personal data
              for USS membership, event registration, run passes and community administration.
            </span>
          </label>
          <span className={`join-consent-message ${errorFor("acceptLegal") ? "is-error" : ""}`} aria-live="polite">
            {errorFor("acceptLegal") || "\u00A0"}
          </span>

          <label className="consent-check consent-optional">
            <input type="checkbox" name="marketingConsent" />
            <span>
              I would also like to receive USS Running community news, event updates and selected announcements by email.
              I can unsubscribe at any time.
            </span>
          </label>
        </div>

        <button
          className="button button-dark full-button join-submit join-submit-v3"
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
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
