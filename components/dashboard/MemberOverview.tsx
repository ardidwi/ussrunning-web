import { Badge, EmptyState, LinkButton } from "@/components/ui";
import type { MemberResult } from "@/lib/member/contract";
import MemberFeedback from "./MemberFeedback";
import ProfileCompletion from "./ProfileCompletion";
export default function MemberOverview({ result }: { result: MemberResult }) {
  if (result.state === "error")
    return (
      <>
        <p className="uss-member-kicker">MY USS / OVERVIEW</p>
        <MemberFeedback code={result.code} />
      </>
    );
  const { profile } = result;
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">YOUR CREW. YOUR NEXT RUN.</p>
        <h1>
          WELCOME BACK,
          <br />
          <span>{profile.values.fullName || "RUNNER"}.</span>
        </h1>
        <p>
          Your home for USS Running. Keep your details current and stay ready to
          move.
        </p>
      </header>
      <div className="uss-member-grid">
        <section className="uss-member-panel uss-member-identity">
          <p className="uss-member-kicker">MEMBER IDENTITY</p>
          <Badge tone="success">Active · Email verified</Badge>
          <h2>{profile.values.fullName || "USS Runner"}</h2>
          <dl>
            <div>
              <dt>Member ID</dt>
              <dd>{profile.memberId}</dd>
            </div>
          </dl>
          <LinkButton href="/dashboard/member-card" variant="secondary">
            View Member Card ↗
          </LinkButton>
        </section>
        <div className="uss-member-panel">
          <ProfileCompletion completion={profile.completion} action />
        </div>
      </div>
      <div className="uss-member-grid">
        <section className="uss-member-panel">
          <p className="uss-member-kicker">UPCOMING EVENTS</p>
          <EmptyState
            title="Your upcoming events will appear here."
            description="Registered event information is not available yet."
            action={
              <LinkButton href="/dashboard/events" variant="text">
                View all events ↗
              </LinkButton>
            }
          />
        </section>
        <section className="uss-member-panel">
          <p className="uss-member-kicker">REGISTRATION HISTORY</p>
          <EmptyState
            title="Your running history, in one place."
            description="Registration history is not available yet."
            action={
              <LinkButton href="/dashboard/events" variant="text">
                View all events ↗
              </LinkButton>
            }
          />
        </section>
      </div>
      <section className="uss-member-quick">
        <h2>Make it yours.</h2>
        <p>Update your profile or explore your account preferences.</p>
        <div>
          <LinkButton href="/dashboard/profile">Edit profile ↗</LinkButton>
          <LinkButton href="/dashboard/settings" variant="secondary">
            Account settings ↗
          </LinkButton>
        </div>
      </section>
    </>
  );
}
