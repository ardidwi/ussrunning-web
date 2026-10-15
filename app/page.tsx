import { LinkButton } from "@/components/ui/Button";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import CommunityStats from "@/components/CommunityStats";
import HomeMotionExperience from "@/components/HomeMotionExperience";
import { getHomeHero, getRuns } from "@/lib/content";
import { getPublicSiteContent } from "@/lib/site-content/site-service";
import { listPublicStories } from "@/lib/stories/story-actions";
import { STARTER_STORIES } from "@/lib/stories/story-starter";
import { listPublicPartners } from "@/lib/partners/partner-actions";
import { listPublicGalleryItems } from "@/lib/gallery/gallery-actions";

export const dynamic = "force-dynamic";

function publicMediaUrl(
  media: Array<{ deliveryAvailable: boolean; url: string | null }>,
) {
  const asset = media.find((item) => item.deliveryAvailable && item.url);
  return asset?.url ?? null;
}

export default async function HomePage() {
  const [
    hero,
    runs,
    storiesResult,
    partnersResult,
    galleryResult,
    heroSlot,
    marqueeSlot,
    manifestoSlot,
    membershipSlot,
  ] = await Promise.all([
    getHomeHero(),
    getRuns(),
    listPublicStories({ limit: 1 }),
    listPublicPartners({ limit: 20 }),
    listPublicGalleryItems({ slug: "home-gallery", limit: 6 }),
    getPublicSiteContent("homepage.hero"),
    getPublicSiteContent("homepage.marquee"),
    getPublicSiteContent("homepage.manifesto"),
    getPublicSiteContent("homepage.membership"),
  ]);

  const cmsFeaturedStory = storiesResult.ok ? storiesResult.data.items[0] : null;
  const starterFeaturedStory =
    storiesResult.ok && !cmsFeaturedStory ? STARTER_STORIES[0] : null;
  const featuredStorySlug = cmsFeaturedStory?.slug ?? starterFeaturedStory?.slug ?? null;
  const featuredStoryType =
    cmsFeaturedStory?.contentType ?? starterFeaturedStory?.contentType ?? "USS JOURNAL";
  const featuredStoryTitle =
    cmsFeaturedStory?.title ?? starterFeaturedStory?.title ?? null;

  const collaborations = partnersResult.ok
    ? partnersResult.data.items.map((partner) => partner.name)
    : [];
  const partnersUnavailable = !partnersResult.ok;

  const gallery = galleryResult.ok
    ? galleryResult.data.items.filter(
        (item) => item.media.deliveryAvailable && item.media.url,
      )
    : [];
  const galleryUnavailable = !galleryResult.ok;

  const heroContent = heroSlot.payload;
  const marqueeContent = marqueeSlot.payload;
  const manifestoContent = manifestoSlot.payload;
  const membership = membershipSlot.payload;
  const heroImage = publicMediaUrl(heroSlot.media) || hero.imageUrl;
  const membershipImage = publicMediaUrl(membershipSlot.media);
  const featuredStoryImage =
    cmsFeaturedStory?.cover?.deliveryAvailable && cmsFeaturedStory.cover.url
      ? cmsFeaturedStory.cover.url
      : null;
  const featuredStoryAlt = cmsFeaturedStory?.cover?.altText || "";

  const tickerText = marqueeContent?.enabled
    ? marqueeContent.text
    : "RUNNING / COMMUNITY / CULTURE /";

  return (
    <main>
      <HomeMotionExperience
        imageUrl={heroImage}
        established={heroContent?.enabled ? heroContent.established : hero.established}
        eyebrow={heroContent?.enabled ? heroContent.eyebrow : hero.eyebrow}
        headline={heroContent?.enabled ? heroContent.headline : hero.headline}
        description={heroContent?.enabled ? heroContent.description : hero.description}
        ctaHref={heroContent?.enabled ? heroContent.cta?.href || hero.ctaHref : hero.ctaHref}
        ctaLabel={heroContent?.enabled ? heroContent.cta?.label || hero.ctaLabel : hero.ctaLabel}
      />

      {marqueeContent?.enabled !== false ? (
        <section className="ticker" aria-label="Community message">
          <div className="ticker-marquee">
            <div className="ticker-group">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={"a-" + index}>{tickerText}</span>
              ))}
            </div>
            <div className="ticker-group" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <span key={"b-" + index}>{tickerText}</span>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section next-section" id="uss-next-runs">
        <div className="content-frame">
          <div className="section-heading">
            <div>
              <span className="kicker">01 / NEXT UP</span>
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

          <div className="event-grid">
            {runs.slice(0, 2).map((run) => (
              <EventCard run={run} key={run.slug} />
            ))}
          </div>
        </div>
      </section>

      {manifestoContent?.enabled !== false ? (
        <section className="manifesto section-invert">
          <div className="content-frame">
            <div className="manifesto-label">
              {manifestoContent?.label || "02 / OUR MOVEMENT"}
            </div>
            <p className="manifesto-copy">
              {(manifestoContent?.paragraphs?.length
                ? manifestoContent.paragraphs
                : [
                    "RUNNING BROUGHT US TOGETHER.",
                    "18 RUNNERS ON DAY ONE. AROUND 500 ON DAY 365.",
                    "WE RUN, CHEER, EAT, CREATE AND SHOW UP FOR EACH OTHER.",
                  ]
              ).map((paragraph, index, values) => (
                <span key={`${index}-${paragraph}`}>
                  {paragraph}
                  {index < values.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
            <div className="manifesto-foot">
              <span>
                {manifestoContent?.footnote || "PEOPLE OVER PACE / JAKARTA SINCE 2024"}
              </span>
              <Link href={manifestoContent?.cta?.href || "/about"}>
                {manifestoContent?.cta?.label || "OUR STORY"} ↗
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <CommunityStats />

      <section className="collaborations-section">
        <div className="content-frame">
          <div className="collaborations-head">
            <span className="kicker">03 / SELECTED COLLABORATIONS</span>
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

          {collaborations.length ? (
            <div
              className="collaboration-grid"
              aria-label="Selected collaborators"
            >
              {collaborations.map((brand) => (
                <div className="collaboration-brand" key={brand}>
                  <span>{brand}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {partnersUnavailable
                  ? "Partner highlights are temporarily unavailable."
                  : "Partnership highlights are being prepared."}
              </p>
            </div>
          )}

          <div className="collaborations-foot">
            <span>SELECTED WORK / MORE TO COME</span>
            <Link href="/partners">EXPLORE PARTNERSHIPS ↗</Link>
          </div>
        </div>
      </section>

      {membership?.enabled !== false ? (
        <section className="editorial-split section">
          {membershipImage ? (
            <div className="editorial-photo">
              <img src={membershipImage} alt="USS membership" />
            </div>
          ) : null}

          <div className="editorial-copy">
            <span className="kicker">
              {membership?.kicker || "04 / MEMBERSHIP / FREE"}
            </span>
            <h2 style={{ whiteSpace: "pre-line" }}>
              {membership?.headline || "ONE COMMUNITY.\nNO PAID TIER.\nONE ID."}
            </h2>
            <p>
              {membership?.description ||
                "USS membership is free. Create one community ID to RSVP to runs, keep your run pass and build your USS history as you keep showing up."}
            </p>
            <LinkButton
              className=""
              href={membership?.cta?.href || "/membership"}
            >
              {membership?.cta?.label || "JOIN USS — FREE"}
            </LinkButton>
          </div>
        </section>
      ) : null}

      {featuredStorySlug && featuredStoryTitle ? (
        <section className="story-band">
          <div className="story-band-title">
            <span className="kicker">05 / STORIES</span>
            <h2>
              THE PEOPLE.
              <br />
              THE CITY.
              <br />
              THE MILES.
            </h2>
          </div>

          <Link className="story-feature" href={`/stories/${featuredStorySlug}`}>
            {featuredStoryImage ? (
              <img src={featuredStoryImage} alt={featuredStoryAlt} />
            ) : null}
            <div className="story-overlay">
              <span>{featuredStoryType}</span>
              <h3>{featuredStoryTitle}</h3>
              <span>READ THE STORY ↗</span>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="home-gallery-section">
        <div className="content-frame">
          <div className="home-gallery-head">
            <div>
              <span className="kicker">06 / COMMUNITY GALLERY</span>
              <h2>
                SEEN ON
                <br />
                THE ROAD.
              </h2>
            </div>
            <p>
              Selected USS moments. The CMS controls which images appear here,
              so official photography can replace presentation placeholders
              without another code deploy.
            </p>
          </div>

          {gallery.length ? (
            <div className="home-gallery-grid">
              {gallery.map((item, index) => (
                <figure
                  key={item.id}
                  className={index === 0 ? "is-featured" : ""}
                >
                  <img
                    src={item.media.url!}
                    alt={item.altTextOverride || item.media.altText || ""}
                  />
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          ) : (
            <div className="cms-empty-state" role="status">
              <p>
                {galleryUnavailable
                  ? "Community gallery is temporarily unavailable."
                  : "Community photos are being prepared."}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="partner-strip">
        <div className="partner-strip-inner">
          <span className="partner-strip-label">
            RUNNING IS THE ENTRY POINT
          </span>
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
