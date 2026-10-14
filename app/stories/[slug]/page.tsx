import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPublicStoryBySlug } from "@/lib/stories/story-actions";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicStoryBySlug(slug);

  if (!result.ok) {
    if (result.code === "STORY_NOT_FOUND") notFound();
    throw new Error("Story is temporarily unavailable.");
  }

  const story = result.data;
  const cover =
    story.cover?.deliveryAvailable && story.cover.url ? story.cover.url : null;

  return (
    <main className="page-black">
      <SiteHeader />

      <article className="cms-article">
        <span className="kicker">{story.contentType || "USS JOURNAL"}</span>
        <h1>{story.title}</h1>
        {story.excerpt ? <p>{story.excerpt}</p> : null}
        {cover ? <img src={cover} alt={story.cover?.altText || ""} /> : null}
        <div>
          {story.body.length ? (
            story.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)
          ) : (
            <p>Full story coming soon.</p>
          )}
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
