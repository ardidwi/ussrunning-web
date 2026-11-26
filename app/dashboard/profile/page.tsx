import MemberProfileForm from "@/components/dashboard/MemberProfileForm";
import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
import { AvatarEditor } from "@/features/member-onboarding/AvatarEditor";
import { loadOnboarding, redirectIncompleteMember } from "@/features/member-onboarding/server";

export const metadata = { title: "Profile — USS Running" };
export default async function ProfilePage() {
  await redirectIncompleteMember();
  const [result, identity] = await Promise.all([loadMember(), loadOnboarding()]);
  if (result.state !== "ready") return <MemberFeedback code={result.code} returnTo="/dashboard/profile" />;
  return (
    <>
      <MemberProfileForm key={result.profile.revision} profile={result.profile} />
      {identity.ok && (
        <section className="uss-member-panel" aria-labelledby="profile-photo">
          <h2 id="profile-photo">Profile photo</h2>
          <AvatarEditor key={identity.data.profile.version} photo={identity.data.profile.avatar}
            name={identity.data.profile.fullName ?? identity.data.account.memberId} version={identity.data.profile.version} />
        </section>
      )}
    </>
  );
}
