import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
import { getOwnDeletionStatus } from "@/lib/data-rights/data-rights-actions";
import { DataRightsSettings } from "@/features/member-dashboard/components/DataRightsSettings";
export const metadata = { title: "Settings — USS Running" };
/**
 * Data-subject rights stay reachable for incomplete profiles: a member without a photo must still
 * be able to export or delete their data, so this page does not redirect to onboarding.
 */
export default async function Page() {
  const [result, status] = await Promise.all([loadMember(), getOwnDeletionStatus()]);
  if (result.state === "error")
    return <MemberFeedback code={result.code} returnTo="/dashboard/settings" />;
  return (
    <>
      <p className="uss-member-kicker">MY USS / SETTINGS</p>
      <h1>SETTINGS.</h1>
      <p className="uss-dashboard-note">Your contact details live in Profile. Here you can take a copy of your data or ask us to delete your account.</p>
      <DataRightsSettings initial={status} />
    </>
  );
}
