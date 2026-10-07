import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import CommunityStats from "@/components/CommunityStats";
import HomeMotionExperience from "@/components/HomeMotionExperience";
import ThirdChapterVideoOverlay from "@/components/ThirdChapterVideoOverlay";
import {
  getCmsSection,
  getHomeHero,
  getMediaCollection,
  getPartners,
  getRuns,
  getStories,
} from "@/lib/content";

export const dynamic = "force-dynamic";

const tickerText = "RUNNING / COMMUNITY / CULTURE /";

function objectContent(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(
  value: Record<string, unknown>,
  key: string,
  fallback: string
) {
  return typeof value[key] === "string" ? String(value[key]) : fallback;
}

export default async function HomePage() {
  const [hero, runs, stories, partners, membershipRaw, storyRaw, gallery] =
    await Promise.all([
      getHomeHero(),
      getRuns(),
      getStories(),
      getPartners(),
      getCmsSection("home", "membership"),
      getCmsSection("home", "story_feature"),
      getMediaCollection("home-gallery"),
    ]);

  const membership = objectContent(membershipRaw);
  const storyFeature = objectContent(storyRaw);
  const featuredStory = stories[0];

  const collaborations = partners.length
    ? partners
    : [
        "ASICS",
        "NIKE",
        "PUMA",
        "NEW BALANCE",
        "ON",
        "ADIDAS",
        "MIZUNO",
        "ATMOS",
      ];

  return (
    <main>
      <HomeMotionExperience
        imageUrl={hero.imageUrl}
        established={hero.established}
        eyebrow={hero.eyebrow}
        headline={hero.headline}
        description={hero.description}
        ctaHref={hero.ctaHref}
        ctaLabel={hero.ctaLabel}
      />
      <ThirdChapterVideoOverlay />

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

      <section className="section next-section" id="uss-next-runs">
        <div className="content-frame">
          <div className="section-heading">
            <div>
              <span className="kicker">01 / NEXT UP</span>
              <h2>MEET US<br />ON THE ROAD.</h2>
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

      <section className="manifesto section-invert">
        <div className="content-frame">
          <div className="manifesto-label">02 / OUR MOVEMENT</div>
          <p className="manifesto-copy">
            RUNNING BROUGHT US TOGETHER.
            <br />
            <strong>18 RUNNERS</strong> ON DAY ONE. AROUND <strong>500</strong>{" "}
            ON DAY 365.
            <br />
            WE RUN, CHEER, EAT, CREATE AND{" "}
            <strong>SHOW UP FOR EACH OTHER.</strong>
          </p>
          <div className="manifesto-foot">
            <span>PEOPLE OVER PACE / JAKARTA SINCE 2024</span>
            <Link href="/about">OUR STORY ↗</Link>
          </div>
        </div>
      </section>

      <CommunityStats />

      <section className="collaborations-section">
        <div className="content-frame">
          <div className="collaborations-head">
            <span className="kicker">03 / SELECTED COLLABORATIONS</span>
            <h2>BRANDS WE&apos;VE<br />RUN WITH.</h2>
            <p>
              A selection of brands, spaces and communities that have moved with
              USS Running across events, campaigns and race-week moments.
            </p>
          </div>

          <div className="collaboration-grid" aria-label="Selected collaborators">
            {collaborations.map((brand) => (
              <div className="collaboration-brand" key={brand}>
                <span>{brand}</span>
              </div>
            ))}
          </div>

          <div className="collaborations-foot">
            <span>SELECTED WORK / MORE TO COME</span>
            <Link href="/partners">EXPLORE PARTNERSHIPS ↗</Link>
          </div>
        </div>
      </section>

      <section className="editorial-split section">
        <div className="editorial-photo">
          <img
            src={textValue(
              membership,
              "imageUrl",
              "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1500&q=85"
            )}
            alt="USS membership"
          />
        </div>

        <div className="editorial-copy">
          <span className="kicker">
            {textValue(membership, "kicker", "04 / MEMBERSHIP / FREE")}
          </span>
          <h2 style={{ whiteSpace: "pre-line" }}>
            {textValue(
              membership,
              "headline",
              "ONE COMMUNITY.\nNO PAID TIER.\nONE ID."
            )}
          </h2>
          <p>
            {textValue(
              membership,
              "description",
              "USS membership is free. Create one community ID to RSVP to runs, keep your run pass and build your USS history as you keep showing up."
            )}
          </p>
          <Link
            className="button button-light"
            href={textValue(membership, "ctaHref", "/membership")}
          >
            {textValue(membership, "ctaLabel", "JOIN USS — FREE")}
          </Link>
        </div>
      </section>

      <section className="story-band">
        <div className="story-band-title">
          <span className="kicker">05 / STORIES</span>
          <h2>THE PEOPLE.<br />THE CITY.<br />THE MILES.</h2>
        </div>

        <Link
          className="story-feature"
          href={
            featuredStory
              ? "/stories"
              : textValue(storyFeature, "ctaHref", "/stories")
          }
        >
          <img
            src={
              featuredStory?.image ||
              textValue(
                storyFeature,
                "imageUrl",
                "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1600&q=85"
              )
            }
            alt=""
          />
          <div className="story-overlay">
            <span>
              {featuredStory?.eyebrow ||
                textValue(storyFeature, "eyebrow", "ORIGIN / 001")}
            </span>
            <h3>
              {featuredStory?.title ||
                textValue(
                  storyFeature,
                  "headline",
                  "18 RUNNERS. DAY ONE. THE START OF USS."
                )}
            </h3>
            <span>READ THE STORY ↗</span>
          </div>
        </Link>
      </section>

      {gallery.length ? (
        <section className="home-gallery-section">
          <div className="content-frame">
            <div className="home-gallery-head">
              <div>
                <span className="kicker">06 / COMMUNITY GALLERY</span>
                <h2>SEEN ON<br />THE ROAD.</h2>
              </div>
              <p>
                Selected USS moments. The CMS controls which images appear here,
                so official photography can replace presentation placeholders
                without another code deploy.
              </p>
            </div>

            <div className="home-gallery-grid">
              {gallery.slice(0, 6).map((item, index) => (
                <figure key={item.id} className={index === 0 ? "is-featured" : ""}>
                  <img src={item.url} alt={item.alt} />
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="partner-strip">
        <div className="partner-strip-inner">
          <span className="partner-strip-label">RUNNING IS THE ENTRY POINT</span>
          <div className="partner-wordmarks" aria-label="USS community pillars">
            <b>RUN</b><i>/</i><b>CHEER</b><i>/</i><b>EAT</b><i>/</i>
            <b>CREATE</b><i>/</i><b>CONNECT</b>
          </div>
          <Link href="/partners">BUILD WITH USS ↗</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
