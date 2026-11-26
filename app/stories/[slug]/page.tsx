import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPublicStoryBySlug } from "@/lib/stories/story-actions";
import { deliverableUrl } from "@/features/public-site/media";
import { publicDate } from "@/features/public-site/format";
import { PublicUnavailable } from "@/features/public-site/PublicUnavailable";
import { JsonLd } from "@/features/seo/JsonLd";
import { pageMetadata, SITE_NAME, siteUrl } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

/** One BE-12 read per request, shared by metadata and the page. */
const readStory = cache((slug: string) => getPublicStoryBySlug(slug));

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const result = await readStory(slug);
  if (!result.ok) return pageMetadata({ path: `/stories/${encodeURIComponent(slug)}`, title: "Story", noIndex: true });
  const story = result.data;
  const cover = story.cover && deliverableUrl(story.cover) ? story.cover : null;
  return pageMetadata({
    path: `/stories/${encodeURIComponent(story.slug)}`,
    title: story.title,
    description: story.excerpt || story.body[0],
    type: "article",
    publishedTime: story.publishedAt,
    image: cover
      ? { url: cover.url!, alt: cover.altText || story.title, width: cover.width, height: cover.height }
      : undefined,
  });
}

export default async function StoryPage({ params }: Params) {
  const { slug } = await params;
  const result = await readStory(slug);

  if (!result.ok) {
    if (result.code === "STORY_NOT_FOUND" || result.code === "STORY_INVALID_INPUT") notFound();
    return (
      <main className="page-black">
        <SiteHeader />
        <PublicUnavailable
          kicker="USS JOURNAL"
          message="This story is temporarily unavailable. Please try again soon."
          backHref="/stories"
          backLabel="All stories"
        />
        <SiteFooter />
      </main>
    );
  }

  const story = result.data;
  const cover = deliverableUrl(story.cover);
  const canonical = new URL(`/stories/${encodeURIComponent(story.slug)}`, siteUrl()).toString();

  return (
    <main className="page-black">
      <SiteHeader />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: story.title,
          description: story.excerpt ?? undefined,
          datePublished: story.publishedAt,
          image: cover ? [cover] : undefined,
          author: story.author.displayName
            ? { "@type": "Person", name: story.author.displayName }
            : { "@type": "Organization", name: SITE_NAME },
          publisher: { "@type": "Organization", name: SITE_NAME },
          mainEntityOfPage: canonical,
        }}
      />

      <article className="cms-article uss-article">
        <nav aria-label="Breadcrumb" className="uss-article-breadcrumb">
          <Link href="/stories">STORIES ↖</Link>
        </nav>
        <span className="kicker">{story.contentType || "USS JOURNAL"}</span>
        <h1>{story.title}</h1>
        <p className="uss-article-byline">
          <time dateTime={story.publishedAt}>{publicDate(story.publishedAt)}</time>
          {story.author.displayName ? <span>BY {story.author.displayName.toUpperCase()}</span> : null}
        </p>
        {story.excerpt ? <p className="uss-article-excerpt">{story.excerpt}</p> : null}
        {cover ? (
          <figure className="uss-article-cover">
            <img
              src={cover}
              alt={story.cover?.altText || ""}
              width={story.cover?.width ?? undefined}
              height={story.cover?.height ?? undefined}
            />
            {story.cover?.caption ? <figcaption>{story.cover.caption}</figcaption> : null}
          </figure>
        ) : null}
        <div className="uss-article-body">
          {story.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <Link href="/stories" className="arrow-link">
          MORE STORIES ↗
        </Link>
      </article>

      <SiteFooter />
    </main>
  );
}
