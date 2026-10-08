import { LinkButton } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

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

export default function PartnersPage() {
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
        <LinkButton href="mailto:hello@ussrunning.com">
          START A CONVERSATION
        </LinkButton>
      </section>

      <SiteFooter />
    </main>
  );
}
