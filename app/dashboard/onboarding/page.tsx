import { redirect } from "next/navigation";
import { AvatarEditor } from "@/features/member-onboarding/AvatarEditor";
import { OnboardingDetails } from "@/features/member-onboarding/OnboardingDetails";
import { loadOnboarding } from "@/features/member-onboarding/server";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";

export const metadata = { title: "Set up your membership — USS Running" };

export default async function OnboardingPage() {
  const result = await loadOnboarding();
  if (!result.ok) return <ServiceFeedback code={result.code} returnTo="/dashboard/onboarding" />;
  const { account, profile, completion } = result.data;
  if (!completion.missingFields.length) redirect("/dashboard/member-card");
  const needsPhoto = completion.missingFields.includes("avatar");
  return (
    <>
      <header className="uss-member-intro">
        <h1>Set up your membership.</h1>
        <p>Complete your profile to open your Member Card and RSVP to USS events. You can come back anytime.</p>
      </header>
      <section className="uss-member-panel" aria-labelledby="onboarding-step">
        <h2 id="onboarding-step">{needsPhoto ? "1 of 2 · Add a profile photo" : "2 of 2 · Add your contact details"}</h2>
        {needsPhoto ? (
          <>
            <p>Use a clear photo of your face so USS staff can confirm your identity when you show your Member Card.</p>
            {profile.avatarStatus === "rejected" && <p role="status">Your photo needs replacing. {profile.avatarRejectionReason}</p>}
            <AvatarEditor key={profile.version} photo={profile.avatar} name={profile.fullName ?? account.memberId} version={profile.version} />
          </>
        ) : <OnboardingDetails key={profile.version} profile={{ fullName: profile.fullName, phone: profile.phone,
          emergencyContactName: profile.emergencyContactName, emergencyContactPhone: profile.emergencyContactPhone,
          version: profile.version }} />}
      </section>
    </>
  );
}
