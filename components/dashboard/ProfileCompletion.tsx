import { LinkButton } from "@/components/ui";
import { profileLabels, type MemberProfile } from "@/lib/member/contract";
export default function ProfileCompletion({
  completion,
  action = false,
}: {
  completion: MemberProfile["completion"];
  action?: boolean;
}) {
  return (
    <section className="uss-member-completion" aria-label="Profile completion">
      <div>
        <h2>Profile completion</h2>
        <strong>{completion.percentage}%</strong>
      </div>
      <progress
        value={completion.percentage}
        max={100}
        aria-label={`Profile ${completion.percentage}% complete`}
      />
      <p>
        {completion.missingFields.length
          ? `Next, add ${completion.missingFields.map((f) => profileLabels[f].toLowerCase()).join(", ")}.`
          : "Your profile is up to date. You're ready for the next run."}
      </p>
      {action && (
        <LinkButton href="/dashboard/profile" variant="secondary">
          {completion.missingFields.length
            ? "Complete profile"
            : "Edit profile"}{" "}
          ↗
        </LinkButton>
      )}
    </section>
  );
}
