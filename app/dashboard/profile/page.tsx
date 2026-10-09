import MemberProfileForm from "@/components/dashboard/MemberProfileForm";
import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
export const metadata = { title: "Profile — USS Running" };
export default async function ProfilePage() {
  const result = await loadMember();
  return result.state === "ready" ? (
    <MemberProfileForm profile={result.profile} />
  ) : (
    <MemberFeedback code={result.code} returnTo="/dashboard/profile" />
  );
}
