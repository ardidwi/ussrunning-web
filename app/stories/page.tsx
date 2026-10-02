import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getStories } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function StoriesPage() {
  const stories = await getStories();

  return (
    <main className="page-black">
      <SiteHeader />

      <section className="page-hero crew-page-hero">
        <div className="content-frame">
          <span className="kicker">USS JOURNAL / PEOPLE / CITY / MILES</span>
          <h1>THE STORIES<br />AROUND THE RUN.</h1>
          <p>
            The run is one part of it. The people, meals, cheering, race-week
            nerves, collaborations and city moments are part of USS too.
          </p>
        </div>
      </section>

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
