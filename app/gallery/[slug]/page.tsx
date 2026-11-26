import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { PageHero } from "@/components/layout/PageHero";
import { LinkButton } from "@/components/ui/Button";
import { getPublicGalleryBySlug, listPublicGalleryItems } from "@/lib/gallery/gallery-actions";
import { deliverableUrl } from "@/features/public-site/media";
import { publicDate } from "@/features/public-site/format";
import { PublicUnavailable } from "@/features/public-site/PublicUnavailable";
import { pageMetadata } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

const readGallery = cache((slug: string) => getPublicGalleryBySlug(slug));

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params;
  const result = await readGallery(slug);
  const path = `/gallery/${encodeURIComponent(slug)}`;
  if (!result.ok) return pageMetadata({ path, title: "Gallery", noIndex: true });
  const gallery = result.data;
  const cover = gallery.cover && deliverableUrl(gallery.cover) ? gallery.cover : null;
  return pageMetadata({
    path,
    title: gallery.title,
    description: gallery.description,
    image: cover
      ? { url: cover.url!, alt: cover.altText || gallery.title, width: cover.width, height: cover.height }
      : undefined,
  });
}

export default async function GalleryPage({ params, searchParams }: Props) {
  const [{ slug }, { cursor: rawCursor }] = await Promise.all([params, searchParams]);
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;
  const [gallery, items] = await Promise.all([
    readGallery(slug),
    listPublicGalleryItems({ slug, limit: PAGE_SIZE, ...(cursor ? { cursor } : {}) }),
  ]);

  if (!gallery.ok) {
    if (gallery.code === "GALLERY_NOT_FOUND" || gallery.code === "GALLERY_INVALID_INPUT") notFound();
    return (
      <main className="page-black">
        <SiteHeader />
        <PublicUnavailable
          kicker="COMMUNITY GALLERY"
          message="This gallery is temporarily unavailable. Please try again soon."
          backHref="/gallery"
          backLabel="All galleries"
        />
        <SiteFooter />
      </main>
    );
  }

  const photos = items.ok ? items.data.items.filter((item) => deliverableUrl(item.media)) : [];

  return (
    <main className="page-black">
      <SiteHeader />
      <PageHero
        kicker={
          <>
            <Link href="/gallery">GALLERY</Link> / {publicDate(gallery.data.publishedAt)}
          </>
        }
        title={gallery.data.title}
        description={gallery.data.description ?? undefined}
      />

      <section className="section">
        <div className="content-frame">
          {photos.length ? (
            <ul className="uss-gallery-photos" aria-label={`${gallery.data.title} photos`}>
              {photos.map((item) => (
                <li key={item.id}>
                  <figure>
                    <img
                      src={item.media.url!}
                      alt={item.altTextOverride || item.media.altText || ""}
                      width={item.media.width ?? undefined}
                      height={item.media.height ?? undefined}
                      loading="lazy"
                    />
                    {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                  </figure>
                </li>
              ))}
            </ul>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {items.ok
                  ? cursor
                    ? "You've reached the end of this gallery."
                    : "Photos for this gallery are being prepared."
                  : "Photos are temporarily unavailable. Please try again soon."}
              </p>
            </div>
          )}

          <nav className="uss-pagination" aria-label="Gallery photo pages">
            {items.ok && items.data.nextCursor ? (
              <LinkButton
                href={`/gallery/${encodeURIComponent(slug)}?cursor=${encodeURIComponent(items.data.nextCursor)}`}
                variant="secondary"
              >
                More photos ↗
              </LinkButton>
            ) : null}
            <LinkButton href="/gallery" variant="text">
              All galleries ↗
            </LinkButton>
          </nav>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
