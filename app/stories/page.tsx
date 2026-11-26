import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LinkButton } from "@/components/ui/Button";
import { listPublicStories } from "@/lib/stories/story-actions";
import { deliverableUrl } from "@/features/public-site/media";
import { publicDate } from "@/features/public-site/format";
import { pageMetadata } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export const metadata: Metadata = pageMetadata({
  path: "/stories",
  title: "Stories",
  description:
    "Stories from the USS Running community: the people, the city, race-week moments and everything around the run.",
});

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { cursor: rawCursor } = await searchParams;
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;
  const result = await listPublicStories({ limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
  const stories = result.ok ? result.data.items : [];
  // An invalid or stale cursor is a client problem, not an outage.
  const invalidCursor = !result.ok && Boolean(cursor) && result.code === "STORY_INVALID_INPUT";

  return (
    <main className="page-black">
      <SiteHeader />

      <PageHero
        kicker={<>USS JOURNAL / PEOPLE / CITY / MILES</>}
        title={
          <>
            THE STORIES
            <br />
            AROUND THE RUN.
          </>
        }
        description={
          <>
            The run is one part of it. The people, meals, cheering, race-week
            nerves, collaborations and city moments are part of USS too.
          </>
        }
      />

      <section className="section">
        <div className="content-frame">
          {stories.length ? (
            <ul className="uss-story-grid" aria-label="Published stories">
              {stories.map((story) => {
                const cover = deliverableUrl(story.cover);
                return (
                  <li key={story.slug}>
                    <article className="story-card uss-story-card">
                      {cover ? (
                        <img src={cover} alt={story.cover?.altText || ""} loading="lazy" />
                      ) : null}
                      <div className="uss-story-card-meta">
                        <span className="kicker">{story.contentType || "USS JOURNAL"}</span>
                        <time dateTime={story.publishedAt}>{publicDate(story.publishedAt)}</time>
                      </div>
                      <h2>
                        <Link href={`/stories/${encodeURIComponent(story.slug)}`}>{story.title}</Link>
                      </h2>
                      {story.excerpt ? <p>{story.excerpt}</p> : null}
                      <span className="arrow-link" aria-hidden="true">
                        READ STORY ↗
                      </span>
                    </article>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {result.ok
                  ? cursor
                    ? "You've reached the end of the published stories."
                    : "No stories are published yet. Community stories will appear here as soon as the USS team publishes them."
                  : invalidCursor
                    ? "This page of stories is no longer available."
                    : "Stories are temporarily unavailable. Please try again soon."}
              </p>
            </div>
          )}

          <nav className="uss-pagination" aria-label="Stories pages">
            {result.ok && result.data.nextCursor ? (
              <LinkButton
                href={`/stories?cursor=${encodeURIComponent(result.data.nextCursor)}`}
                variant="secondary"
              >
                More stories ↗
              </LinkButton>
            ) : null}
            {cursor ? (
              <LinkButton href="/stories" variant="text">
                Latest stories ↗
              </LinkButton>
            ) : null}
          </nav>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
