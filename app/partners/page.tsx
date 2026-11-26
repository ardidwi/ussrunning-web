import { listPublicPartners } from "@/lib/partners/partner-actions";
import { LinkButton } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";
import { deliverableUrl } from "@/features/public-site/media";
import { pageMetadata } from "@/features/seo/metadata";
import { getPublicSiteContent } from "@/lib/site-content/site-service";
import { SITE_DEFAULTS } from "@/lib/site-content/site-defaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/partners",
  title: "Partners",
  description:
    "Partner with USS Running: community-led brand experiences across community runs, race week, cheering and post-race moments in Jakarta.",
});

const journey = [
  [
    "01",
    "CARB LOADING",
    "Pre-race fuel, community dinner and one last moment together before the start.",
  ],
  [
    "02",
    "RACE DAY & CHEERING",
    "Runners take on the course while the community shows up, makes noise and carries the energy.",
  ],
  [
    "03",
    "POST-RACE CELEBRATION",
    "Recover, celebrate every finish and keep the race-day story moving after the line.",
  ],
];

const opportunities = [
  [
    "01",
    "PRODUCT",
    "Food, beverages, hydration, recovery or relevant running products.",
  ],
  [
    "02",
    "VENUE",
    "Carb loading, community gatherings and post-race locations.",
  ],
  [
    "03",
    "EXPERIENCE",
    "Music, entertainment, photo moments and community activations.",
  ],
  [
    "04",
    "PRODUCTION",
    "Event equipment, documentation and activation production.",
  ],
  ["05", "MONETARY", "Contribution toward community-led race-week activities."],
];

function partnerMeta(type: string, tier: string | null) {
  return [type.replaceAll("_", " ").toUpperCase(), tier?.toUpperCase()]
    .filter(Boolean)
    .join(" / ");
}

export default async function PartnersPage() {
  const [partnerResult, footer] = await Promise.all([
    listPublicPartners({ limit: 48 }),
    getPublicSiteContent("footer.global"),
  ]);
  const contactEmail = (footer.payload ?? SITE_DEFAULTS["footer.global"]).contactEmail;
  const partners = partnerResult.ok ? partnerResult.data.items : [];
  const unavailable = !partnerResult.ok;

  return (
    <main className="page-black">
      <SiteHeader />

      <PageHero
        kicker={<>PARTNERSHIPS / COMMUNITY-LED BRAND EXPOSURE</>}
        title={
          <>
            BE PART OF
            <br />
            THE JOURNEY.
          </>
        }
        description={
          <>
            Not just logo placement. Partners become part of moments runners
            naturally want to join, experience and share.
          </>
        }
      ></PageHero>

      {partners.length > 0 ? (
        <section className="partner-journey" aria-labelledby="current-partners-title">
          <div className="content-frame">
            <div className="section-heading compact-heading">
              <div>
                <span className="kicker">CURRENT PARTNERS</span>
                <h2 id="current-partners-title">
                  BUILT WITH
                  <br />
                  THE COMMUNITY.
                </h2>
              </div>
              <p className="section-side-copy">
                Active partners published through the USS Running partnership system.
              </p>
            </div>

            <div className="journey-grid">
              {partners.map((partner, index) => {
                const meta = partnerMeta(partner.type, partner.tier);
                const summary = partner.description || meta;

                return (
                  <article className="journey-card" key={partner.slug}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {deliverableUrl(partner.logo) ? (
                      <img
                        src={deliverableUrl(partner.logo)!}
                        alt={partner.logo?.altText || `${partner.name} logo`}
                        width={180}
                        height={90}
                        loading="lazy"
                        className="uss-partner-logo"
                      />
                    ) : null}
                    <h3>{partner.name}</h3>
                    {summary ? <p>{summary}</p> : null}
                    {partner.websiteUrl ? (
                      <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer">
                        {meta || "VISIT PARTNER"} ↗
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="partner-journey" aria-label="Partner availability">
          <div className="content-frame">
            <div className="cms-empty-state" role="status">
              <p>
                {unavailable
                  ? "Partner information is temporarily unavailable. Please try again soon."
                  : "Our current partners will be listed here once they are published. Interested in building with USS? Get in touch below."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="partner-journey">
        <div className="content-frame">
          <div className="section-heading compact-heading">
            <div>
              <span className="kicker">MORE THAN RACE DAY</span>
              <h2>
                THE JOURNEY
                <br />
                IS THE PLATFORM.
              </h2>
            </div>
            <p className="section-side-copy">
              USS Running brings runners, community, culture and shared
              experiences together throughout race week.
            </p>
          </div>

          <div className="journey-grid">
            {journey.map(([number, title, copy]) => (
              <article className="journey-card" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="partner-opportunities">
        <div className="content-frame">
          <span className="kicker partner-opportunity-label">
            HOW BRANDS CAN SUPPORT
          </span>
          {opportunities.map(([n, title, copy]) => (
            <div className="opportunity" key={n}>
              <span>{n}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
              <b>↗</b>
            </div>
          ))}
        </div>
      </section>

      <section className="partner-philosophy">
        <div className="content-frame">
          <span className="kicker">OUR APPROACH</span>
          <p>
            BUILD THE COMMUNITY EXPERIENCE FIRST.
            <br />
            THEN FIND THE ROLE WHERE A BRAND CAN ADD REAL VALUE.
            <br />
            <strong>NOT INTERRUPTION. PARTICIPATION.</strong>
          </p>
        </div>
      </section>

      <section className="partner-cta">
        <h2>
          LET&apos;S BUILD IT
          <br />
          TOGETHER.
        </h2>
        <LinkButton href={`mailto:${contactEmail}`}>
          START A CONVERSATION
        </LinkButton>
      </section>

      <SiteFooter />
    </main>
  );
}
