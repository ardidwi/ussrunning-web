"use client";

import { useState } from "react";
import { MemberCard } from "@/features/member-card/components/MemberCard";
import { MemberScanner } from "@/features/member-scanner/MemberScanner";
import { AvatarEditor } from "./AvatarEditor";
import { OnboardingDetails } from "./OnboardingDetails";
import type { MemberProfileDTO } from "@/lib/member/profile-types";
import type { MemberCardPresentationDTO } from "@/lib/member/member-card-types";

const barcode = "USS-11111111-1111-4111-8111-111111111111";
const photo = { id: "11111111-1111-4111-8111-111111111111", url: "/uss-logo.png", width: 512, height: 512, altText: "Fictional QA photo" };
const account = { id: photo.id, email: "runner@fixture.invalid", memberId: "USS-000123", status: "active", emailVerified: true, displayName: "Synthetic Runner" } as const;
const profile: MemberProfileDTO["profile"] = {
  fullName: null, phone: null, emergencyContactName: null, emergencyContactPhone: null, version: "1".repeat(64),
  birthDate: null, gender: null, city: null, instagramHandle: null, jerseySize: null, avatar: photo,
  marketingConsent: false, marketingConsentAt: null, privacyConsentAt: null, updatedAt: "2026-11-26T00:00:00Z",
  runningPreferences: {},
};
const card: MemberCardPresentationDTO = {
  displayName: account.displayName, memberId: account.memberId, status: account.status, avatar: photo,
  barcode: { value: barcode, formatVersion: 1 },
};

export function IdentityReference({ surface }: { surface: string | undefined }) {
  const [step, setStep] = useState(0);
  if (process.env.NODE_ENV !== "development") return null;
  if (surface === "scanner") return <MemberScanner lookup={async value => value === barcode
    ? { ok: true, data: { name: account.displayName, memberId: account.memberId, status: "active", photo: photo.url } }
    : { ok: false, code: "MEMBER_NOT_FOUND" }} />;
  if (surface === "card" || step === 2) return <MemberCard card={card} />;
  return (
    <section className="uss-member-panel">
      <h1>Set up your membership.</h1>
      <h2>{step === 0 ? "Add a profile photo" : "Add your contact details"}</h2>
      {step === 0 ? <AvatarEditor photo={null} name={account.displayName} version={profile.version}
        onSaved={() => setStep(1)} upload={async form => {
          const file = form.get("photo");
          if (file instanceof File && file.type === "image/jpeg" && file.size <= 900_000) return { ok: true, data: null };
          return { ok: false, code: "AVATAR_INVALID" };
        }} /> : <OnboardingDetails profile={profile} onCompleted={() => setStep(2)}
          update={async () => ({ ok: true, data: { account, profile, completion: { percentage: 100, missingFields: [] } } })} />}
    </section>
  );
}
