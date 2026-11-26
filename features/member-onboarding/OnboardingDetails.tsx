"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { updateOwnMemberProfile } from "@/lib/member/profile-actions";
import type { MemberProfileDTO } from "@/lib/member/profile-types";

const fields = [
  { key: "fullName", label: "Full name", autoComplete: "name", type: "text" },
  { key: "phone", label: "Mobile number", autoComplete: "tel", type: "tel" },
  { key: "emergencyContactName", label: "Emergency contact name", autoComplete: "off", type: "text" },
  { key: "emergencyContactPhone", label: "Emergency contact number", autoComplete: "off", type: "tel" },
] as const;

export function OnboardingDetails({ profile, update = updateOwnMemberProfile, onCompleted }: {
  profile: Pick<MemberProfileDTO["profile"], typeof fields[number]["key"] | "version">;
  update?: typeof updateOwnMemberProfile;
  onCompleted?: () => void;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    const changes = Object.fromEntries(fields.map(({ key }) => [key, String(form.get(key) ?? "").trim()]));
    if ([changes.fullName, changes.emergencyContactName].some(name => name.length < 2) ||
        [changes.phone, changes.emergencyContactPhone].some(phone => !/^\+?[0-9]{7,15}$/.test(phone.replace(/[ ()-]/g, "")))) {
      setMessage("Enter both full names and two phone numbers with 7 to 15 digits.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await update({ expectedVersion: profile.version, changes });
      if (!result.ok) {
        setMessage(result.code === "CONFLICT"
          ? "Your profile changed. Reload the page before saving again."
          : "Your details could not be saved. Check the fields and try again.");
        return;
      }
      if (result.data.completion.missingFields.length) router.refresh();
      else if (onCompleted) onCompleted();
      else router.replace("/dashboard/member-card");
    } catch {
      setMessage("Your details could not be saved. Try again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <form className="uss-avatar-editor" onSubmit={save}>
      <div className="uss-onboarding-fields">
        {fields.map(({ key, label, autoComplete, type }) => (
          <Field key={key} id={`onboarding-${key}`} label={label} required>
            <Input id={`onboarding-${key}`} name={key} type={type} autoComplete={autoComplete}
              defaultValue={profile[key] ?? ""} maxLength={type === "tel" ? 40 : 120} required disabled={busy} />
          </Field>
        ))}
      </div>
      {message && <p role="alert">{message}</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving details…" : "Save details and open card"}</Button>
    </form>
  );
}
