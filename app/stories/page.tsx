import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getStories } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const stories = await getStories();

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
        {stories.map((story) => (
          <article className="story-card" key={story.slug}>
            {story.image ? <img src={story.image} alt="" /> : null}
            <span className="kicker">{story.eyebrow}</span>
            <h2>{story.title}</h2>
            <p>{story.excerpt}</p>
            <span className="cms-sample-label">USS Journal</span>
          </article>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
