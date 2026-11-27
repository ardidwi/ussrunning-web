import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LinkButton } from "@/components/ui/Button";
import { cachedPublicCategories, cachedPublicStories } from "@/lib/stories/story-cache";
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
  searchParams: Promise<{ cursor?: string | string[]; category?: string | string[] }>;
}) {
  const { cursor: rawCursor, category: rawCategory } = await searchParams;
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;
  const category = typeof rawCategory === "string" && rawCategory ? rawCategory : undefined;
  const [result, categoryResult] = await Promise.all([
    cachedPublicStories({ limit: PAGE_SIZE, ...(cursor ? { cursor } : {}), ...(category ? { category } : {}) }),
    cachedPublicCategories(),
  ]);
  const categories = categoryResult.ok ? categoryResult.data : [];
  const activeCategory = categories.find((c) => c.slug === category);
  const href = (params: { category?: string; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params.category) q.set("category", params.category);
    if (params.cursor) q.set("cursor", params.cursor);
    const s = q.toString();
    return s ? `/stories?${s}` : "/stories";
  };
  const stories = result.ok ? result.data.items : [];
  // An invalid or stale cursor is a client problem, not an outage.
  const invalidCursor = !result.ok && Boolean(cursor || category) && result.code === "STORY_INVALID_INPUT";

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
          {categories.length ? (
            <nav className="uss-story-category-filter" aria-label="Filter stories by category">
              <Link href="/stories" aria-current={!category ? "page" : undefined}>ALL</Link>
              {categories.map((c) => (
                <Link key={c.slug} href={href({ category: c.slug })} aria-current={c.slug === category ? "page" : undefined}>
                  {c.name.toUpperCase()}
                </Link>
              ))}
            </nav>
          ) : null}
          {category && activeCategory ? <p className="uss-story-filter-note" role="status">Showing {activeCategory.name} stories.</p> : null}
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
                        <span className="kicker">{story.category?.name ?? story.contentType ?? "USS JOURNAL"}</span>
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
                    : category
                    ? "No published stories in this category yet."
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
                href={href({ category, cursor: result.data.nextCursor })}
                variant="secondary"
              >
                More stories ↗
              </LinkButton>
            ) : null}
            {cursor ? (
              <LinkButton href={href({ category })} variant="text">
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
