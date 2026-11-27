import { LinkButton } from "@/components/ui";
import { listAvatarReviewQueue } from "@/lib/admin-users/avatar-queue-actions";
import { text, type Query } from "@/features/history/query";
import { ServiceFeedback } from "@/features/shared/ServiceFeedback";
import { AvatarReviewQueue } from "./AvatarReviewQueue";

export async function ModerationWorkspace({ query }: { query: Query }) {
  const cursor = text(query, "cursor");
  const result = await listAvatarReviewQueue(cursor ? { cursor } : {});
  if (!result.ok) {
    if (result.code === "USER_FORBIDDEN") return <ServiceFeedback code="INSUFFICIENT_PERMISSION" returnTo="/admin?module=moderation" />;
    if (result.code !== "USER_SEARCH_INVALID" && result.code !== "USER_UNAVAILABLE") return <ServiceFeedback code={result.code} returnTo="/admin?module=moderation" />;
    return (
      <section className="uss-member-panel" role="alert">
        <h2>{result.code === "USER_SEARCH_INVALID" ? "This page link expired." : "Photo review unavailable."}</h2>
        <p>{result.code === "USER_SEARCH_INVALID" ? "Start again from the oldest photos." : "The review queue could not be loaded. No photos were changed."}</p>
        <LinkButton href="/admin?module=moderation" variant="secondary">Reload queue</LinkButton>
      </section>
    );
  }
  return <AvatarReviewQueue key={cursor || "first"} initial={result.data} cursor={cursor} />;
}
