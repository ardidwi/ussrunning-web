import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

type StoryRow = {
  slug: string;
  eyebrow: string | null;
  title: string;
  excerpt: string | null;
  body: unknown;
  published_at: string | null;
  image: string | null;
};

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await query<StoryRow>(
    `SELECT
       s.slug,
       s.eyebrow,
       s.title,
       s.excerpt,
       s.body,
       s.published_at::text,
       m.public_url AS image
     FROM public.stories s
     LEFT JOIN public.media_assets m ON m.id=s.cover_media_id
     WHERE s.slug=$1 AND s.status='published'
     LIMIT 1`,
    [slug]
  );

  const story = rows[0];
  if (!story) notFound();

  const paragraphs = Array.isArray(story.body)
    ? story.body.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <main className="page-black">
      <SiteHeader />

      <article className="cms-article">
        <span className="kicker">{story.eyebrow || "USS JOURNAL"}</span>
        <h1>{story.title}</h1>
        {story.excerpt ? <p>{story.excerpt}</p> : null}
        {story.image ? <img src={story.image} alt="" /> : null}
        <div>
          {paragraphs.length
            ? paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
            : <p>Full story coming soon.</p>}
        </div>
      </article>

      <SiteFooter />
    </main>
  );
}
