import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import CommunityStats from "@/components/CommunityStats";
import HomeMotionExperience from "@/components/HomeMotionExperience";
import { getPublicSiteContent } from "@/lib/site-content/site-service";
import { SITE_DEFAULTS } from "@/lib/site-content/site-defaults";
import { SECTION_IDS, type SectionId } from "@/lib/site-content/site-types";
import { listPublicStories } from "@/lib/stories/story-actions";
import { listPublicPartners } from "@/lib/partners/partner-actions";
import { listPublicGalleryItems } from "@/lib/gallery/gallery-actions";
import { loadUpcomingPublicEvents } from "@/features/public-events/server";
import { deliverableUrl, firstDeliverable } from "@/features/public-site/media";
import { pageMetadata } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

/** CMS gallery slug rendered on the homepage (application constant). */
const HOME_GALLERY_SLUG = "home-gallery";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getPublicSiteContent("homepage.hero");
  const media = firstDeliverable(hero.media, hero.payload?.desktopMediaId);
  return pageMetadata({
    path: "/",
    title: null,
    description: hero.payload?.enabled ? hero.payload.description : undefined,
    image: media ? { url: media.url!, alt: media.altText || "USS Running" } : undefined,
  });
}

function kicker(index: number, label: string) {
  return `${String(index + 1).padStart(2, "0")} / ${label}`;
}

export default async function HomePage() {
  const [
    events,
    storiesResult,
    partnersResult,
    galleryResult,
    heroSlot,
    marqueeSlot,
    manifestoSlot,
    membershipSlot,
    sectionsSlot,
  ] = await Promise.all([
    loadUpcomingPublicEvents(2),
    listPublicStories({ limit: 1 }),
    listPublicPartners({ limit: 20 }),
    listPublicGalleryItems({ slug: HOME_GALLERY_SLUG, limit: 6 }),
    getPublicSiteContent("homepage.hero"),
    getPublicSiteContent("homepage.marquee"),
    getPublicSiteContent("homepage.manifesto"),
    getPublicSiteContent("homepage.membership"),
    getPublicSiteContent("homepage.sections"),
  ]);

  // Site-content returns the approved typed default when a slot is missing;
  // `null` only when even that failed, so fall back to the same typed default.
  const hero = heroSlot.payload ?? SITE_DEFAULTS["homepage.hero"];
  const marquee = marqueeSlot.payload ?? SITE_DEFAULTS["homepage.marquee"];
  const manifesto = manifestoSlot.payload ?? SITE_DEFAULTS["homepage.manifesto"];
  const membership = membershipSlot.payload ?? SITE_DEFAULTS["homepage.membership"];
  const order = (sectionsSlot.payload ?? SITE_DEFAULTS["homepage.sections"]).order.filter(
    (id): id is SectionId => (SECTION_IDS as readonly string[]).includes(id),
  );

  // The stats band carries no number; editorial kickers ("02 / OUR MOVEMENT",
  // "04 / MEMBERSHIP") are numbered by position among the remaining sections.
  const numberedSections: SectionId[] = order.filter((id) => id !== "stats");

  const heroImage = deliverableUrl(firstDeliverable(heroSlot.media, hero.desktopMediaId));
  const membershipImage = firstDeliverable(membershipSlot.media, membership.imageMediaId);
  const featuredStory = storiesResult.ok ? storiesResult.data.items[0] ?? null : null;
  const partners = partnersResult.ok ? partnersResult.data.items : [];
  const gallery = galleryResult.ok
    ? galleryResult.data.items.filter((item) => deliverableUrl(item.media))
    : [];

  const sections: Record<SectionId, (index: number) => ReactNode> = {
    next_runs: (index) => (
      <section className="section next-section" id="uss-next-runs" key="next_runs">
        <div className="content-frame">
          <div className="section-heading">
            <div>
              <span className="kicker">{kicker(index, "NEXT UP")}</span>
              <h2>
                MEET US
                <br />
                ON THE ROAD.
              </h2>
            </div>
            <Link href="/runs" className="arrow-link">
              VIEW ALL RUNS ↗
            </Link>
          </div>
          {events.ok && events.items.length ? (
            <div className="event-grid">
              {events.items.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {events.ok
                  ? "No upcoming runs are published yet. New sessions appear here as soon as they are announced."
                  : "Run listings are temporarily unavailable. Please check back soon."}
              </p>
            </div>
          )}
        </div>
      </section>
    ),
    manifesto: () =>
      manifesto.enabled ? (
        <section className="manifesto section-invert" key="manifesto">
          <div className="content-frame">
            <div className="manifesto-label">{manifesto.label}</div>
            <p className="manifesto-copy">
              {manifesto.paragraphs.map((paragraph, index, values) => (
                <span key={`${index}-${paragraph}`}>
                  {paragraph}
                  {index < values.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
            <div className="manifesto-foot">
              <span>{manifesto.footnote}</span>
              {manifesto.cta ? (
                <Link href={manifesto.cta.href}>{manifesto.cta.label} ↗</Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null,
    stats: () => <CommunityStats key="stats" />,
    partners: (index) => (
      <section className="collaborations-section" key="partners">
        <div className="content-frame">
          <div className="collaborations-head">
            <span className="kicker">{kicker(index, "SELECTED COLLABORATIONS")}</span>
            <h2>
              BRANDS WE&apos;VE
              <br />
              RUN WITH.
            </h2>
            <p>
              A selection of brands, spaces and communities that have moved with
              USS Running across events, campaigns and race-week moments.
            </p>
          </div>
          {partners.length ? (
            <ul className="collaboration-grid" aria-label="Selected collaborators">
              {partners.map((partner) => {
                const logo = deliverableUrl(partner.logo);
                return (
                  <li className="collaboration-brand" key={partner.slug}>
                    {logo ? (
                      <img
                        src={logo}
                        alt={partner.logo?.altText || partner.name}
                        loading="lazy"
                        className="collaboration-logo"
                      />
                    ) : (
                      <span>{partner.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {partnersResult.ok
                  ? "Partner highlights will appear here once they are published."
                  : "Partner highlights are temporarily unavailable."}
              </p>
            </div>
          )}
          <div className="collaborations-foot">
            <span>SELECTED WORK / MORE TO COME</span>
            <Link href="/partners">EXPLORE PARTNERSHIPS ↗</Link>
          </div>
        </div>
      </section>
    ),
    membership: () =>
      membership.enabled ? (
        <section className="editorial-split section" key="membership">
          {membershipImage ? (
            <div className="editorial-photo">
              <img
                src={membershipImage.url!}
                alt={membershipImage.altText || "USS Running membership"}
                loading="lazy"
              />
            </div>
          ) : null}
          <div className="editorial-copy">
            <span className="kicker">{membership.kicker}</span>
            <h2 className="pre-line">{membership.headline}</h2>
            <p>{membership.description}</p>
            {membership.cta ? (
              <LinkButton href={membership.cta.href}>{membership.cta.label}</LinkButton>
            ) : null}
          </div>
        </section>
      ) : null,
    stories: (index) =>
      featuredStory ? (
        <section className="story-band" key="stories">
          <div className="story-band-title">
            <span className="kicker">{kicker(index, "STORIES")}</span>
            <h2>
              THE PEOPLE.
              <br />
              THE CITY.
              <br />
              THE MILES.
            </h2>
            <Link href="/stories" className="arrow-link">
              ALL STORIES ↗
            </Link>
          </div>
          <Link className="story-feature" href={`/stories/${encodeURIComponent(featuredStory.slug)}`}>
            {deliverableUrl(featuredStory.cover) ? (
              <img
                src={deliverableUrl(featuredStory.cover)!}
                alt={featuredStory.cover?.altText || ""}
                loading="lazy"
              />
            ) : null}
            <div className="story-overlay">
              <span>{featuredStory.contentType || "USS JOURNAL"}</span>
              <h3>{featuredStory.title}</h3>
              <span>READ THE STORY ↗</span>
            </div>
          </Link>
        </section>
      ) : null,
    gallery: (index) => (
      <section className="home-gallery-section" key="gallery">
        <div className="content-frame">
          <div className="home-gallery-head">
            <div>
              <span className="kicker">{kicker(index, "COMMUNITY GALLERY")}</span>
              <h2>
                SEEN ON
                <br />
                THE ROAD.
              </h2>
            </div>
            <p>
              Moments from the start line, the cheering zones and everything
              after the finish.{" "}
              <Link href="/gallery" className="arrow-link">
                OPEN THE GALLERY ↗
              </Link>
            </p>
          </div>
          {gallery.length ? (
            <div className="home-gallery-grid">
              {gallery.map((item, itemIndex) => (
                <figure key={item.id} className={itemIndex === 0 ? "is-featured" : ""}>
                  <img
                    src={item.media.url!}
                    alt={item.altTextOverride || item.media.altText || ""}
                    loading="lazy"
                  />
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {galleryResult.ok || galleryResult.code === "GALLERY_NOT_FOUND"
                  ? "Community photos will appear here once they are published."
                  : "Community gallery is temporarily unavailable."}
              </p>
            </div>
          )}
        </div>
      </section>
    ),
  };

  return (
    <main>
      <HomeMotionExperience
        imageUrl={heroImage}
        established={hero.established}
        eyebrow={hero.eyebrow}
        headline={hero.headline}
        description={hero.description}
        ctaHref={hero.cta?.href}
        ctaLabel={hero.cta?.label}
      />

      {marquee.enabled ? (
        <section className="ticker" aria-label="Community message">
          <div className="ticker-marquee">
            <div className="ticker-group">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={"a-" + index}>{marquee.text}</span>
              ))}
            </div>
            <div className="ticker-group" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={"b-" + index}>{marquee.text}</span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {order.map((id) => sections[id](numberedSections.indexOf(id)))}

      <section className="partner-strip">
        <div className="partner-strip-inner">
          <span className="partner-strip-label">RUNNING IS THE ENTRY POINT</span>
          <div className="partner-wordmarks" aria-label="USS community pillars">
            <b>RUN</b>
            <i>/</i>
            <b>CHEER</b>
            <i>/</i>
            <b>EAT</b>
            <i>/</i>
            <b>CREATE</b>
            <i>/</i>
            <b>CONNECT</b>
          </div>
          <Link href="/partners">BUILD WITH USS ↗</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
