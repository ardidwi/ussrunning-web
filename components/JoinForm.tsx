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
import {
  Field,
  Input,
  PasswordInput,
  Checkbox,
  FormSection,
  Button,
} from "@/components/ui";

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
  const [state, formAction, pending] = useActionState(
    createMember,
    initialState,
  );
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({
    city: "Jakarta",
  });
  const [clientErrors, setClientErrors] = useState<
    Partial<Record<JoinField, string>>
  >({});
  const [editedFields, setEditedFields] = useState<
    Partial<Record<JoinField, boolean>>
  >({});

  useEffect(() => {
    if (state.status) {
      setNoticeOpen(true);
      setEditedFields({});
      setClientErrors({});
    }
  }, [state]);

  const success = state.status === "success";
  const serverErrors = state.fieldErrors || {};

  const errorFor = useMemo(
    () => (field: JoinField) =>
      clientErrors[field] ||
      (!editedFields[field] ? serverErrors[field] : undefined),
    [clientErrors, editedFields, serverErrors],
  );

  function validateField(
    field: JoinField,
    value: string,
    form?: HTMLFormElement,
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
      const password = form?.elements.namedItem(
        "password",
      ) as HTMLInputElement | null;
      if (!value) return "Confirm your password.";
      if (password && value !== password.value) {
        return "Password confirmation does not match.";
      }
    }

    if (field === "acceptLegal") {
      const legal = form?.elements.namedItem(
        "acceptLegal",
      ) as HTMLInputElement | null;
      if (!legal?.checked)
        return "Please accept the Privacy Policy and Terms of Use.";
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
    const value = event.currentTarget.value;
    setValues((current) => ({ ...current, [field]: value }));
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
    if (pending) {
      event.preventDefault();
      return;
    }
    const errors = validateForm(event.currentTarget);
    if (Object.keys(errors).length === 0) return;

    event.preventDefault();
    setClientErrors(errors);
    setEditedFields(
      Object.keys(errors).reduce<Partial<Record<JoinField, boolean>>>(
        (acc, key) => {
          acc[key as JoinField] = true;
          return acc;
        },
        {},
      ),
    );

    const firstField = Object.keys(errors)[0];
    const target = event.currentTarget.elements.namedItem(
      firstField,
    ) as HTMLElement | null;
    target?.focus();
  }

  const details: {
    name: JoinField;
    label: string;
    hint: string;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
    defaultValue?: string;
    maxLength?: number;
  }[] = [
    {
      name: "firstName",
      label: "First name",
      hint: "Use your real name for your USS Running membership profile.",
      autoComplete: "given-name",
      required: true,
      maxLength: validation.maximumNameLength,
    },
    {
      name: "lastName",
      label: "Last name",
      hint: "Add your family name if you use one.",
      autoComplete: "family-name",
      maxLength: validation.maximumNameLength,
    },
    {
      name: "email",
      label: "Email address",
      hint: "Use an active email. Account verification will be sent here.",
      type: "email",
      autoComplete: "email",
      placeholder: "you@email.com",
      required: true,
    },
    {
      name: "mobile",
      label: "Mobile number",
      hint: "A number where the USS team can reach you about your runs.",
      type: "tel",
      autoComplete: "tel",
      placeholder: "+62…",
      required: true,
    },
    {
      name: "city",
      label: "City",
      hint: "Your current city, used for your community profile.",
      autoComplete: "address-level2",
      defaultValue: "Jakarta",
      required: true,
      maxLength: validation.maximumCityLength,
    },
    {
      name: "instagram",
      label: "Instagram",
      hint: "Enter your Instagram username, for example @username.",
      placeholder: "@username",
      required: true,
      maxLength: validation.maximumInstagramLength + 1,
    },
    {
      name: "emergencyContactName",
      label: "Contact name",
      hint: "Someone the team can contact in an emergency during a run.",
      required: true,
      maxLength: validation.maximumNameLength,
    },
    {
      name: "emergencyContactMobile",
      label: "Contact number",
      hint: "Use an active phone number for your emergency contact.",
      type: "tel",
      placeholder: "+62…",
      required: true,
    },
  ];

  function renderDetail(field: (typeof details)[number]) {
    return (
      <Field
        key={field.name}
        label={field.label}
        hint={field.hint}
        required={field.required}
        error={errorFor(field.name)}
      >
        <Input
          name={field.name}
          type={field.type}
          autoComplete={field.autoComplete ?? "off"}
          placeholder={field.placeholder}
          value={values[field.name] ?? field.defaultValue ?? ""}
          maxLength={field.maxLength}
          required={field.required}
          onBlur={handleBlur}
          onChange={handleChange}
          disabled={pending}
        />
      </Field>
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
        <FormSection
          title="YOUR DETAILS"
          description="Basic information for your USS member profile."
        >
          <div className="uss-form-grid">
            {details.slice(0, 6).map(renderDetail)}
          </div>
        </FormSection>
        <FormSection
          title="EMERGENCY CONTACT"
          description="Help the team reach someone if you need support during a run."
        >
          <div className="uss-form-grid">
            {details.slice(6).map(renderDetail)}
          </div>
        </FormSection>
        <FormSection
          title="PASSWORD"
          description="Create your login credentials."
        >
          <div className="uss-form-grid">
            <Field
              label="Password"
              hint={`Use a secure password with ${validation.minimumPasswordLength}–${validation.maximumPasswordLength} characters.`}
              required
              error={errorFor("password")}
            >
              <PasswordInput
                name="password"
                value={values.password ?? ""}
                autoComplete="new-password"
                required
                minLength={validation.minimumPasswordLength}
                maxLength={validation.maximumPasswordLength}
                onBlur={handleBlur}
                onChange={handleChange}
                disabled={pending}
              />
            </Field>
            <Field
              label="Confirm password"
              hint="Enter the same password again to confirm it."
              required
              error={errorFor("confirmPassword")}
            >
              <PasswordInput
                name="confirmPassword"
                value={values.confirmPassword ?? ""}
                autoComplete="new-password"
                required
                maxLength={validation.maximumPasswordLength}
                onBlur={handleBlur}
                onChange={handleChange}
                disabled={pending}
              />
            </Field>
          </div>
        </FormSection>
        <FormSection
          title="CONSENT"
          description="Review the policies before registering. Fields marked * are required."
        >
          <Checkbox
            name="acceptLegal"
            required
            disabled={pending}
            onBlur={handleBlur}
            onChange={handleChange}
            error={errorFor("acceptLegal") ?? ""}
            label={
              <>
                I have read and understood the{" "}
                <Link href="/privacy" target="_blank">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="/terms" target="_blank">
                  Terms of Use
                </Link>
                , and I agree to the processing of my personal data for USS
                membership, event registration, run passes and community
                administration.
              </>
            }
          />
          <Checkbox
            name="marketingConsent"
            disabled={pending}
            hint="Optional. You can unsubscribe at any time."
            label="I would also like to receive USS Running community news, event updates and selected announcements by email."
          />
        </FormSection>
        <Button type="submit" loading={pending} loadingLabel="Creating USS ID…">
          CREATE USS ID ↗
        </Button>
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
