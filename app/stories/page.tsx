import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { listPublicStories } from "@/lib/stories/story-actions";
import { STARTER_STORIES } from "@/lib/stories/story-starter";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const result = await listPublicStories({ limit: 20 });
  const unavailable = !result.ok;
  const cmsStories = result.ok ? result.data.items : [];
  const useStarterStories = result.ok && cmsStories.length === 0;

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
      ></PageHero>

      <section className="stories-grid stories-grid-expanded section">
        {cmsStories.map((story) => {
          const cover =
            story.cover?.deliveryAvailable && story.cover.url
              ? story.cover.url
              : null;

          return (
            <article className="story-card" key={story.slug}>
              {cover ? <img src={cover} alt={story.cover?.altText || ""} /> : null}
              <span className="kicker">{story.contentType || "USS JOURNAL"}</span>
              <h2>{story.title}</h2>
              {story.excerpt ? <p>{story.excerpt}</p> : null}
              <Link href={`/stories/${story.slug}`} className="arrow-link">
                READ STORY ↗
              </Link>
            </article>
          );
        })}

        {useStarterStories
          ? STARTER_STORIES.map((story) => (
              <article className="story-card" key={story.slug}>
                <span className="kicker">{story.contentType}</span>
                <h2>{story.title}</h2>
                <p>{story.excerpt}</p>
                <Link href={`/stories/${story.slug}`} className="arrow-link">
                  READ STORY ↗
                </Link>
              </article>
            ))
          : null}

        {unavailable ? (
          <div className="cms-empty-state" role="status">
            <p>Stories are temporarily unavailable. Please try again soon.</p>
          </div>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}
