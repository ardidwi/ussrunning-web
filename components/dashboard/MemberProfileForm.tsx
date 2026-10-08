"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateMemberProfile,
  type MemberActionState,
} from "@/app/dashboard/actions";
import USSNotice from "@/components/auth/USSNotice";
import {
  Field,
  Input,
  FormSection,
  FormActions,
  Button,
} from "@/components/ui";

const initialState: MemberActionState = {};

export default function MemberProfileForm({
  profile,
}: {
  profile: {
    first_name: string | null;
    last_name: string | null;
    mobile: string | null;
    city: string | null;
    instagram: string | null;
    emergency_contact_name: string | null;
    emergency_contact_mobile: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(
    updateMemberProfile,
    initialState,
  );
  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    if (state.error || state.ok) setNoticeOpen(true);
  }, [state]);

  const success = Boolean(state.ok);

  return (
    <>
      <form
        action={formAction}
        className="member-profile-form"
        noValidate
        onSubmit={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <FormSection
          title="PROFILE"
          description="Keep your community contact details current."
        >
          <div className="uss-form-grid">
            {[
              [
                "firstName",
                "First name",
                profile.first_name,
                "Use your real name for your membership profile.",
                "text",
                true,
              ],
              [
                "lastName",
                "Last name",
                profile.last_name,
                "Add your family name if you use one.",
                "text",
                false,
              ],
              [
                "mobile",
                "Mobile number",
                profile.mobile,
                "A number where the team can reach you about your runs.",
                "tel",
                true,
              ],
              [
                "city",
                "City",
                profile.city,
                "Your current city for your community profile.",
                "text",
                true,
              ],
              [
                "instagram",
                "Instagram",
                profile.instagram,
                "Enter your Instagram username, for example @username.",
                "text",
                true,
              ],
            ].map(([name, label, value, hint, type, required]) => (
              <Field
                key={String(name)}
                label={String(label)}
                hint={String(hint)}
                required={Boolean(required)}
              >
                <Input
                  name={String(name)}
                  type={String(type)}
                  defaultValue={String(value ?? "")}
                  required={Boolean(required)}
                  disabled={pending}
                />
              </Field>
            ))}
          </div>
        </FormSection>
        <FormSection
          title="EMERGENCY CONTACT"
          description="Someone the team can contact if you need help during a run."
        >
          <div className="uss-form-grid">
            <Field
              label="Contact name"
              required
              hint="Enter your emergency contact's full name."
            >
              <Input
                name="emergencyContactName"
                defaultValue={profile.emergency_contact_name || ""}
                required
                disabled={pending}
              />
            </Field>
            <Field
              label="Contact number"
              required
              hint="Use an active phone number for this contact."
            >
              <Input
                name="emergencyContactMobile"
                type="tel"
                defaultValue={profile.emergency_contact_mobile || ""}
                required
                disabled={pending}
              />
            </Field>
          </div>
        </FormSection>
        <FormActions>
          <Button type="submit" loading={pending} loadingLabel="Saving…">
            SAVE PROFILE ↗
          </Button>
        </FormActions>
      </form>
      <USSNotice
        open={noticeOpen}
        kind={success ? "success" : "error"}
        eyebrow="MY USS / PROFILE"
        title={success ? "PROFILE UPDATED." : "PROFILE NOT SAVED."}
        message={state.ok || state.error || "Please try again."}
        primaryLabel={success ? "DONE" : "BACK TO PROFILE"}
        onPrimary={() => setNoticeOpen(false)}
        secondaryLabel="CLOSE"
        onClose={() => setNoticeOpen(false)}
      />
    </>
  );
}
