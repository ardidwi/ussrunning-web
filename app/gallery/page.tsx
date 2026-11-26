import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { LinkButton } from "@/components/ui/Button";
import { listPublicGalleries } from "@/lib/gallery/gallery-actions";
import { deliverableUrl } from "@/features/public-site/media";
import { publicDate } from "@/features/public-site/format";
import { pageMetadata } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export const metadata: Metadata = pageMetadata({
  path: "/gallery",
  title: "Gallery",
  description:
    "Photo galleries from USS Running community runs, race weeks, cheering zones and collaborations in Jakarta.",
});

export default async function GalleryIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { cursor: rawCursor } = await searchParams;
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;
  const result = await listPublicGalleries({ limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) });
  const galleries = result.ok ? result.data.items : [];
  const invalidCursor = !result.ok && Boolean(cursor) && result.code === "GALLERY_INVALID_INPUT";

  return (
    <main className="page-black">
      <SiteHeader />
      <PageHero
        kicker={<>COMMUNITY GALLERY / ROAD / CITY / PEOPLE</>}
        title={
          <>
            SEEN ON
            <br />
            THE ROAD.
          </>
        }
        description={
          <>
            Start lines, cheering zones, carb loading and the moments after the
            finish, collected from across the USS community.
          </>
        }
      />

      <section className="section">
        <div className="content-frame">
          {galleries.length ? (
            <ul className="uss-gallery-index" aria-label="Published galleries">
              {galleries.map((gallery) => {
                const cover = deliverableUrl(gallery.cover);
                return (
                  <li key={gallery.slug}>
                    <Link href={`/gallery/${encodeURIComponent(gallery.slug)}`} className="uss-gallery-card">
                      <div className="uss-gallery-card-media">
                        {cover ? (
                          <img src={cover} alt={gallery.cover?.altText || ""} loading="lazy" />
                        ) : (
                          <span aria-hidden="true">USS</span>
                        )}
                      </div>
                      <span className="kicker">{publicDate(gallery.publishedAt)}</span>
                      <h2>{gallery.title}</h2>
                      {gallery.description ? <p>{gallery.description}</p> : null}
                      <span className="arrow-link" aria-hidden="true">
                        VIEW GALLERY ↗
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {result.ok
                  ? cursor
                    ? "You've reached the end of the published galleries."
                    : "No galleries are published yet. Community photos will appear here once the USS team publishes them."
                  : invalidCursor
                    ? "This page of galleries is no longer available."
                    : "The gallery is temporarily unavailable. Please try again soon."}
              </p>
            </div>
          )}

          <nav className="uss-pagination" aria-label="Gallery pages">
            {result.ok && result.data.nextCursor ? (
              <LinkButton
                href={`/gallery?cursor=${encodeURIComponent(result.data.nextCursor)}`}
                variant="secondary"
              >
                More galleries ↗
              </LinkButton>
            ) : null}
            {cursor ? (
              <LinkButton href="/gallery" variant="text">
                Latest galleries ↗
              </LinkButton>
            ) : null}
          </nav>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
