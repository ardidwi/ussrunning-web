import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { listPublicStories } from "@/lib/stories/story-actions";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const result = await listPublicStories({ limit: 20 });
  const stories = result.ok ? result.data.items : [];

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
        {stories.map((story) => {
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

        {!stories.length ? (
          <div className="cms-empty-state">
            <p>Stories are being prepared. Check back soon.</p>
          </div>
        ) : null}
      </section>

      <SiteFooter />
    </main>
  );
}
