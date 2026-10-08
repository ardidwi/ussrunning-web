import { EmptyState, LinkButton } from "@/components/ui";
import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
export const metadata = { title: "Member Card — USS Running" };
export default async function Page() {
  const result = await loadMember();
  if (result.state === "error")
    return (
      <MemberFeedback code={result.code} returnTo="/dashboard/member-card" />
    );
  return (
    <>
      <p className="uss-member-kicker">MY USS / MEMBER CARD</p>
      <h1>MEMBER CARD.</h1>
      <div className="uss-member-panel">
        <EmptyState
          title="Member Card is coming next."
          description="Your USS Member Card will be available here. Your member identity appears on the overview."
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
