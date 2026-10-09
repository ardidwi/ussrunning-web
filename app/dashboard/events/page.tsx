import { EmptyState, LinkButton } from "@/components/ui";
import MemberFeedback from "@/components/dashboard/MemberFeedback";
import { loadMember } from "@/lib/member/server";
export const metadata = { title: "Events — USS Running" };
export default async function Page() {
  const result = await loadMember();
  if (result.state === "error")
    return <MemberFeedback code={result.code} returnTo="/dashboard/events" />;
  return (
    <>
      <p className="uss-member-kicker">MY USS / EVENTS</p>
      <h1>EVENTS.</h1>
      <div className="uss-member-panel">
        <EmptyState
          title="Events is coming next."
          description="Your registered events and running history will be available here."
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
