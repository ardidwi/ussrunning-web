import { LinkButton } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const benefits = [
  [
    "01",
    "RUN",
    "RSVP to USS community runs, training sessions and selected activations with one profile.",
  ],
  [
    "02",
    "BELONG",
    "Keep one USS ID for the community. No paid tier, no subscription and no performance requirement.",
  ],
  [
    "03",
    "REMEMBER",
    "Keep your run pass, check-ins and joined sessions together as your USS history grows.",
  ],
];

const steps = [
  ["01", "CREATE YOUR USS ID", "Set up one profile. Membership is free."],
  [
    "02",
    "FIND THE NEXT RUN",
    "See community runs, race-week moments and collaborations.",
  ],
  [
    "03",
    "RSVP & SHOW UP",
    "Reserve a place when registration is open and bring your run pass.",
  ],
  [
    "04",
    "KEEP MOVING WITH US",
    "Your participation stays connected to your USS profile.",
  ],
];

export default function MembershipPage() {
  return (
    <main className="page-black">
      <SiteHeader />

      <PageHero
        kicker={<>USS MEMBERSHIP / FREE COMMUNITY ACCESS</>}
        title={
          <>
            JOIN THE CREW.
            <br />
            IT&apos;S FREE.
          </>
        }
        description={
          <>
            USS membership is not a subscription. It is your free community ID
            for joining runs, keeping your run pass and staying connected to
            what we build in Jakarta.
          </>
        }
      >
        <div className="page-hero-actions">
          <LinkButton className="" href="/join">
            CREATE FREE USS ID
          </LinkButton>
          <LinkButton variant="text" href="/runs">
            SEE THE NEXT RUN ↗
          </LinkButton>
        </div>
      </PageHero>

      <section className="membership-free-block">
        <div className="content-frame membership-free-inner">
          <div>
            <span className="kicker">ONE COMMUNITY / NO TIERS</span>
            <h2>
              NO FEE.
              <br />
              NO PAYWALL.
              <br />
              JUST SHOW UP.
            </h2>
          </div>
          <div className="membership-free-copy">
            <p>
              From the beginning, USS Running has been about people meeting
              through movement. Recreational runners, serious runners, first
              timers and familiar faces all share the same community access.
            </p>
            <div className="membership-free-note">
              <span>OPEN COMMUNITY ACCESS</span>
              <strong>ONE USS ID. JUST SHOW UP.</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="membership-benefits">
        <div className="content-frame">
          <div className="section-heading compact-heading">
            <div>
              <span className="kicker">WHAT YOUR USS ID DOES</span>
              <h2>
                ONE ID.
                <br />
                EVERY RUN.
              </h2>
            </div>
          </div>

          <div className="membership-benefit-grid">
            {benefits.map(([number, title, copy]) => (
              <article key={number} className="membership-benefit">
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="membership-steps">
        <div className="content-frame">
          <span className="kicker">HOW IT WORKS</span>
          <div className="membership-step-list">
            {steps.map(([number, title, copy]) => (
              <div className="membership-step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <b>↗</b>
              </div>
            ))}
          </div>
          <div className="membership-final-cta">
            <div>
              <span className="kicker">READY WHEN YOU ARE</span>
              <h2>
                COME FOR THE RUN.
                <br />
                STAY FOR THE PEOPLE.
              </h2>
            </div>
            <LinkButton className="" href="/join">
              JOIN USS — FREE
            </LinkButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
