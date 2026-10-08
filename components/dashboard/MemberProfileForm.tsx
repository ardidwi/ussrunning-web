"use client";
import { startTransition, useEffect, useRef, useState } from "react";
import {
  Field,
  Input,
  Button,
  LinkButton,
  FormSection,
  FormActions,
  useToast,
} from "@/components/ui";
import { authMessages } from "@/lib/auth/auth-errors";
import {
  decodeMemberResult,
  profileFields,
  profileLabels,
  type MemberProfile,
  type ProfileValues,
  type ProfileField,
  type ProfileAdapter,
  type MemberResult,
} from "@/lib/member/contract";
import { validateProfile } from "@/lib/member/validation";
import { saveProfile } from "@/lib/member/profile-action";
import { useMemberDirty } from "./MemberNavigationGuard";
import ProfileCompletion from "./ProfileCompletion";
import MemberFeedback from "./MemberFeedback";
type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "settled"; result: MemberResult };
const hints: Record<ProfileField, string> = {
  fullName: "Use your real name for your USS Running membership profile.",
  phone: "Used only when needed for account or event communication.",
  city: "Your current city or primary area.",
  instagram: "Your public Instagram handle, if you'd like to share it.",
  emergencyContactName:
    "Someone we can contact if needed during USS Running activities.",
  emergencyContactPhone: "Add a reachable number for your emergency contact.",
};
export default function MemberProfileForm({
  profile: initial,
  adapter = saveProfile,
}: {
  profile: MemberProfile;
  adapter?: ProfileAdapter;
}) {
  const [profile, setProfile] = useState(initial),
    [values, setValues] = useState(initial.values);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>(
    {},
  );
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const busy = useRef(false),
    mounted = useRef(true),
    form = useRef<HTMLFormElement>(null);
  const setDirty = useMemberDirty(),
    toast = useToast();
  const dirty = profileFields.some((f) => values[f] !== profile.values[f]);
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const saving = state.phase === "saving";
  const result = state.phase === "settled" ? state.result : undefined;
  const restricted =
    result?.state === "error" &&
    [
      "UNAUTHENTICATED",
      "EMAIL_NOT_VERIFIED",
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_DEACTIVATED",
      "ACCOUNT_NOT_PROVISIONED",
    ].includes(result.code);
  if (restricted && result?.state === "error")
    return <MemberFeedback code={result.code} returnTo="/dashboard/profile" />;
  const control = (field: ProfileField) => (
    <Field
      key={field}
      id={`profile-${field}`}
      label={profileLabels[field]}
      hint={hints[field]}
      required={profile.policy.required.includes(field)}
      error={errors[field]}
    >
      <Input
        name={field}
        value={values[field]}
        required={profile.policy.required.includes(field)}
        disabled={saving}
        type={field.toLowerCase().includes("phone") ? "tel" : "text"}
        autoComplete={
          field === "fullName"
            ? "name"
            : field === "phone"
              ? "tel"
              : field === "city"
                ? "address-level2"
                : "off"
        }
        maxLength={profile.policy.maxLengths[field]}
        placeholder={
          field === "phone" || field === "emergencyContactPhone"
            ? "+62 812 3456 7890"
            : field === "city"
              ? "Jakarta"
              : field === "instagram"
                ? "@yourhandle"
                : undefined
        }
        onChange={(event) => {
          const next = { ...values, [field]: event.target.value };
          setValues(next);
          if (errors[field])
            setErrors((current) => ({
              ...current,
              [field]: validateProfile(next, profile.policy)[field],
            }));
          if (state.phase === "settled") setState({ phase: "idle" });
        }}
        onBlur={() =>
          setErrors((current) => ({
            ...current,
            [field]: validateProfile(values, profile.policy)[field],
          }))
        }
      />
    </Field>
  );
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">MY USS / PROFILE</p>
        <h1>
          YOUR DETAILS.
          <br />
          YOUR NEXT STEP.
        </h1>
        <p>
          Keep your profile ready for USS Running activities. Optional fields
          can be added later.
        </p>
      </header>
      <div className="uss-member-panel">
        <ProfileCompletion completion={profile.completion} />
      </div>
      <form
        ref={form}
        className="uss-member-profile"
        method="post"
        noValidate
        aria-busy={saving}
        onSubmit={(event) => {
          event.preventDefault();
          if (busy.current) return;
          const validation = validateProfile(values, profile.policy);
          setErrors(validation);
          if (Object.keys(validation).length) {
            form.current
              ?.querySelector<HTMLInputElement>(
                `[name="${profileFields.find((f) => validation[f])}"]`,
              )
              ?.focus();
            return;
          }
          busy.current = true;
          setState({ phase: "saving" });
          startTransition(async () => {
            let response: MemberResult;
            try {
              response = decodeMemberResult(
                await adapter(values, profile.revision),
              );
            } catch {
              response = { state: "error", code: "NETWORK_ERROR" };
            } finally {
              busy.current = false;
            }
            if (!mounted.current) return;
            setState({ phase: "settled", result: response });
            if (response.state === "ready") {
              setProfile(response.profile);
              setValues(response.profile.values);
              setDirty(false);
              toast("Profile updated.", "success");
            } else if (response.fields) {
              setErrors(response.fields);
              const first = profileFields.find((f) => response.fields?.[f]);
              if (first)
                form.current
                  ?.querySelector<HTMLInputElement>(`[name="${first}"]`)
                  ?.focus();
            }
          });
        }}
      >
        <FormSection
          title="PERSONAL INFORMATION"
          description="Basic identity and contact details for your USS Running profile."
        >
          <div className="uss-member-fields">
            {["fullName", "phone", "city"].map((f) =>
              control(f as ProfileField),
            )}
          </div>
        </FormSection>
        <FormSection
          title="RUNNING PROFILE"
          description="Share your connection to the running community."
        >
          {control("instagram")}
        </FormSection>
        <FormSection
          title="EMERGENCY CONTACT"
          description="Add both a name and a phone number, or leave both empty when optional."
        >
          <div className="uss-member-fields">
            {control("emergencyContactName")}
            {control("emergencyContactPhone")}
          </div>
        </FormSection>
        <div
          className="uss-member-save-feedback"
          role={result?.state === "error" ? "alert" : "status"}
          aria-live="polite"
          tabIndex={result?.state === "error" ? 0 : undefined}
        >
          {saving
            ? "Saving your profile…"
            : result?.state === "ready"
              ? "Profile updated."
              : result?.state === "error"
                ? result.code === "PROFILE_CONFLICT"
                  ? "Your profile changed since you opened it. Your edits are still here. Return to the overview and reopen your profile to load the latest details."
                  : result.code === "PROFILE_UNAVAILABLE"
                    ? "We couldn't save your profile right now. Your edits are still here. Try again later."
                    : authMessages[result.code as keyof typeof authMessages]
                : dirty
                  ? "You have unsaved changes."
                  : "Your changes will be saved when you choose Save changes."}
        </div>
        <FormActions
          cancel={
            <LinkButton href="/dashboard" variant="secondary">
              Cancel
            </LinkButton>
          }
        >
          <Button
            type="submit"
            loading={saving}
            loadingLabel="Saving changes…"
            disabled={!dirty}
          >
            Save changes
          </Button>
        </FormActions>
        <p className="uss-member-privacy">
          Your profile details are used for USS Running membership and
          activities. Read our <a href="/privacy">privacy policy</a>.
        </p>
      </form>
    </>
  );
}
