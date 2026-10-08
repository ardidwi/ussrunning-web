import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import { getRuns } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await getRuns();

  return (
    <main className="page-black">
      <SiteHeader />

      <PageHero
        kicker={<>RUNS / TRAINING / RACE WEEK / COLLABORATIONS</>}
        title={
          <>
            RUN WITH
            <br />
            USS.
          </>
        }
        description={
          <>
            Community runs, training sessions, shakeouts, race-week moments and
            special collaborations. Find what&apos;s next and show up.
          </>
        }
      >
        <div className="run-page-note">
          <span>USS MEMBERSHIP IS FREE</span>
          <span>RSVP WITH ONE USS ID</span>
        </div>
      </PageHero>

      <section className="section event-list-section">
        <div className="content-frame">
          <div className="filter-row">
            <button className="filter-active">ALL</button>
            <button>COMMUNITY RUN</button>
            <button>TRAINING</button>
            <button>RACE WEEK</button>
            <button>COLLAB</button>
          </div>

          <div className="event-grid event-grid-three">
            {runs.map((run) => (
              <EventCard run={run} key={run.slug} />
            ))}
          </div>
        </div>
      </section>

      <section className="run-philosophy">
        <div className="content-frame">
          <span className="kicker">THE POINT</span>
          <h2>
            PACE MATTERS SOMETIMES.
            <br />
            PEOPLE MATTER EVERY TIME.
          </h2>
          <p>
            USS was built to connect runners through movement, lifestyle and
            culture. Come ready to run. Stay ready to support the people around
            you.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
