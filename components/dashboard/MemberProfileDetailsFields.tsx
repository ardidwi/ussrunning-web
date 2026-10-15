"use client";
import Link from "next/link";
import { Checkbox, Field, FieldError, FormSection, Input, Select } from "@/components/ui";
import { PROFILE_POLICY } from "@/lib/member/profile-policy";
import type { ProfileDetails, ProfileIssueField } from "@/lib/member/contract";
export function MemberProfileDetailsFields({ details, onChange, disabled, errors, maximumBirthDate }: { details:ProfileDetails; onChange:(value:ProfileDetails)=>void; disabled:boolean; errors:Partial<Record<ProfileIssueField,string>>; maximumBirthDate?:string }) {
  return <>
    <FormSection title="PERSONAL DETAILS" description="Optional details used for your membership profile; they do not affect account activation.">
      <div className="uss-member-fields">
        <Field id="profile-birthDate" label="Birth date" hint="Your calendar date of birth. It is saved as a date, without timezone conversion." error={errors.birthDate}><Input name="birthDate" type="date" max={maximumBirthDate} value={details.birthDate} disabled={disabled} onChange={e=>onChange({...details,birthDate:e.target.value})} /></Field>
        <Field id="profile-gender" label="Gender" hint="Optional. Choose the option you prefer to share." error={errors.gender}><Select name="gender" value={details.gender} disabled={disabled} onChange={e=>onChange({...details,gender:e.target.value})}><option value="">Not supplied</option>{PROFILE_POLICY.genderValues.map(value=><option key={value} value={value}>{value.replaceAll("_"," ")}</option>)}</Select></Field>
        <Field id="profile-jerseySize" label="Jersey size" hint="Used for event or merchandise sizing when applicable." error={errors.jerseySize}><Select name="jerseySize" value={details.jerseySize} disabled={disabled} onChange={e=>onChange({...details,jerseySize:e.target.value})}><option value="">Not supplied</option>{PROFILE_POLICY.jerseySizes.map(value=><option key={value}>{value}</option>)}</Select></Field>
      </div>
    </FormSection>
    <FormSection title="RUNNING PREFERENCES" description="Optional preferred running days. Existing distances and goals remain preserved.">
      <div role="group" id="profile-runningPreferences" tabIndex={-1} aria-describedby="profile-runningPreferences-error" aria-label="Preferred running days" className="uss-member-day-choices">{PROFILE_POLICY.days.map(day=><Checkbox key={day} id={`profile-day-${day}`} label={day.toUpperCase()} checked={details.runningPreferences.days?.includes(day)??false} disabled={disabled} onChange={e=>onChange({...details,runningPreferences:{...details.runningPreferences,days:e.target.checked?[...(details.runningPreferences.days??[]),day]:(details.runningPreferences.days??[]).filter(value=>value!==day)}})} />)}</div>
      <FieldError id="profile-runningPreferences-error">{errors.runningPreferences}</FieldError>
    </FormSection>
    <FormSection title="PRIVACY & COMMUNICATION" description="Legal acknowledgment is separate from optional marketing communication.">
      {details.privacyAccepted?<p>Privacy acknowledgment recorded.</p>:<Checkbox name="privacyConsent" label={<>I acknowledge the <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.</>} hint="An acknowledgment is recorded only when you explicitly choose it. Existing consent cannot be withdrawn through this form." checked={details.privacyConsent===true} disabled={disabled} error={errors.privacyConsent} onChange={e=>onChange({...details,privacyConsent:e.target.checked})} />}
      <Checkbox name="marketingConsent" label="Receive marketing and community updates" hint="Optional. Change this without affecting your membership or verification." checked={details.marketingConsent} disabled={disabled} error={errors.marketingConsent} onChange={e=>onChange({...details,marketingConsent:e.target.checked})} />
    </FormSection>
  </>;
}
