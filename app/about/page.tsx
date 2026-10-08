import { LinkButton } from "@/components/ui/Button";
import { PageHero } from "@/components/layout/PageHero";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CommunityStats from "@/components/CommunityStats";

const mission = [
  [
    "01",
    "MOVE",
    "Make running feel social, accessible and worth showing up for.",
  ],
  [
    "02",
    "CONNECT",
    "Turn miles into real relationships, from first-timers to serious runners.",
  ],
  [
    "03",
    "CULTURE",
    "Bring running together with lifestyle, creativity and the character of Jakarta.",
  ],
  [
    "04",
    "SHOW UP",
    "Run, cheer, support, eat, recover and celebrate the journey together.",
  ],
];

const timeline = [
  [
    "04 JUL 2024",
    "DAY ONE",
    "USS Running starts with 18 runners from friends and family.",
  ],
  [
    "04 JUL 2025",
    "DAY 365",
    "Around 500 recreational and serious runners gather one year later.",
  ],
  [
    "2026",
    "BUILD THE JOURNEY",
    "The community keeps expanding beyond the run through training, cheering, race-week experiences and collaborations.",
  ],
];

export default function AboutPage() {
  return (
    <main className="page-black about-page">
      <SiteHeader />

      <PageHero
        className="about-hero"
        kicker={<>ABOUT USS RUNNING / JAKARTA</>}
        title={
          <>
            18 RUNNERS.
            <br />
            ONE CITY.
            <br />
            STILL MOVING.
          </>
        }
      >
        <div className="about-hero-copy">
          <p>
            USS Running began in July 2024 as a small run with friends and
            family. It grew into a community-driven movement built around
            health, running, lifestyle and culture.
          </p>
          <LinkButton href="/runs" variant="text">
            RUN WITH USS ↗
          </LinkButton>
        </div>
      </PageHero>

      <CommunityStats className="about-stats" />

      <section className="about-story">
        <div className="content-frame about-story-grid">
          <div>
            <span className="kicker">01 / WHY USS EXISTS</span>
            <h2>
              RUNNING IS
              <br />
              THE ENTRY POINT.
            </h2>
          </div>
          <div className="about-story-copy">
            <p>
              We started by getting people out the door. The bigger idea became
              clearer as the community grew: create a place where people can
              move, meet, support each other and share experiences that go
              beyond pace.
            </p>
            <p>
              That means the run matters, but so do the conversations before it,
              the cheering during it, the food after it and the stories people
              take home.
            </p>
          </div>
        </div>
      </section>

      <section className="about-mission">
        <div className="content-frame">
          <div className="section-heading compact-heading">
            <div>
              <span className="kicker">02 / OUR MISSION</span>
              <h2>
                MOVE PEOPLE.
                <br />
                BUILD BELONGING.
              </h2>
            </div>
            <p className="section-side-copy">
              Keep running social, community-led and connected to the culture
              around it.
            </p>
          </div>

          <div className="about-mission-grid">
            {mission.map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="about-timeline">
        <div className="content-frame">
          <span className="kicker">03 / THE STORY SO FAR</span>
          <div className="about-timeline-list">
            {timeline.map(([date, title, copy]) => (
              <div className="about-timeline-row" key={date}>
                <span>{date}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
                <i>↗</i>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-close">
        <div className="content-frame">
          <span className="kicker">THE NEXT CHAPTER</span>
          <h2>
            COME FOR THE RUN.
            <br />
            STAY FOR THE PEOPLE.
          </h2>
          <div>
            <LinkButton className="" href="/membership">
              JOIN USS — FREE
            </LinkButton>
            <LinkButton variant="text" href="/stories">
              READ THE STORIES ↗
            </LinkButton>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
