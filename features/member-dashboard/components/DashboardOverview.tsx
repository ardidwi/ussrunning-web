import { Badge, LinkButton } from "@/components/ui";
import { MemberAvatar } from "@/features/member-card/components/MemberAvatar";
import { completionGuidance, type DashboardMember } from "../model";
import { DashboardSection, DashboardUnavailable } from "./DashboardSection";
import { DashboardRegistrations } from "@/features/event-registration/components/DashboardRegistrations";
import type { HistoryResult } from "@/features/event-registration/model";
export function DashboardOverview({
  member,
  registrations,
}: {
  member: DashboardMember;
  registrations?: HistoryResult;
}) {
  return (
    <>
      <header className="uss-member-intro">
        <p className="uss-member-kicker">MY USS / YOUR CREW. YOUR NEXT RUN.</p>
        <h1>
          WELCOME BACK,
          <br />
          <span>{member.displayName}.</span>
        </h1>
        <p>
          Your USS home. Keep your profile current and find your membership
          details in one place.
        </p>
      </header>
      <div className="uss-member-grid">
        <section
          className="uss-member-panel uss-member-identity"
          aria-label="Member identity"
        >
          <p className="uss-member-kicker">MEMBER IDENTITY</p>
          <div className="uss-dashboard-person">
            <MemberAvatar
              avatar={member.avatar}
              displayName={member.displayName}
            />
            <div>
              <h2>{member.displayName}</h2>
              <Badge tone="success">Active · Email verified</Badge>
            </div>
          </div>
          <dl>
            <div>
              <dt>Member ID</dt>
              <dd>{member.memberId}</dd>
            </div>
          </dl>
          <p className="uss-dashboard-note">
            Your permanent community identity. Event registrations and passes
            are separate.
          </p>
          <LinkButton href="/dashboard/member-card" variant="secondary">
            View Member Card ↗
          </LinkButton>
        </section>
        <section
          className="uss-member-panel uss-member-completion"
          aria-label="Profile completion"
        >
          <div>
            <h2>Profile completion</h2>
            <strong>{member.completion.percentage}%</strong>
          </div>
          <progress
            value={member.completion.percentage}
            max={100}
            aria-label={`Profile ${member.completion.percentage}% complete`}
          />
          <p>{completionGuidance(member.completion)}</p>
          <LinkButton href="/dashboard/profile" variant="secondary">
            {member.completion.missingFields.length
              ? "Complete profile"
              : "Edit profile"}{" "}
            ↗
          </LinkButton>
        </section>
      </div>
      <div className="uss-member-grid">
        {registrations ? (
          <DashboardRegistrations initial={registrations} />
        ) : (
          <>
            <DashboardSection title="Upcoming registrations">
              <DashboardUnavailable
                title="Your next run, in one place."
                description="Registered event information is not available yet."
              />
              <LinkButton href="/dashboard/events" variant="text">
                Events overview ↗
              </LinkButton>
            </DashboardSection>
            <DashboardSection title="Registration history">
              <DashboardUnavailable
                title="Your running history will appear here."
                description="Registration history is not available yet."
              />
            </DashboardSection>
          </>
        )}
        <DashboardSection title="Event passes">
          <DashboardUnavailable
            title="A pass for each registered event."
            description="Event passes are not available yet. Your Member Card does not reserve a place or confirm attendance."
          />
        </DashboardSection>
        <DashboardSection title="Notifications">
          <DashboardUnavailable
            title="Updates from your USS community."
            description="Notifications are not available yet."
          />
        </DashboardSection>
      </div>
      <section className="uss-member-quick">
        <h2>Make it yours.</h2>
        <p>Update your details or explore your account preferences.</p>
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
