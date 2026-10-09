import { EmptyState, LinkButton } from "@/components/ui";
import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
export const metadata = { title: "Settings — USS Running" };
export default async function Page() {
  const result = await loadMember();
  if (result.state === "error")
    return <MemberFeedback code={result.code} returnTo="/dashboard/settings" />;
  return (
    <>
      <p className="uss-member-kicker">MY USS / SETTINGS</p>
      <h1>SETTINGS.</h1>
      <div className="uss-member-panel">
        <EmptyState
          title="Settings is coming next."
          description="Account preferences will be available here. You can update your contact details in Profile."
          action={
            <LinkButton href="/dashboard" variant="secondary">
              Back to overview ↗
            </LinkButton>
          }
        />
      </div>
    </>
  );
}
