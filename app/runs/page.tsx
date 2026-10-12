import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import { getRuns } from "@/lib/content";
import { getPublicEventList } from "@/lib/events/event-actions";
import { eventDate } from "@/features/event-registration/model";
import { LinkButton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const [runs, events] = await Promise.all([
    getRuns(),
    getPublicEventList({
      limit: 20,
      ...(cursor ? { cursor } : {}),
    }),
  ]);

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
          {events.ok && events.data.items.length > 0 && (
            <section aria-label="USS events">
              <h2>USS EVENTS</h2>
              <ul className="uss-registration-list">
                {events.data.items.map((event) => (
                  <li key={event.id}>
                    <h3>{event.title}</h3>
                    <p>{eventDate(event.startsAt, event.timezone)}</p>
                    <p>{event.status.replaceAll("_", " ")}</p>
                    <LinkButton
                      href={`/runs/${encodeURIComponent(event.slug)}`}
                      variant="secondary"
                    >
                      View event ↗
                    </LinkButton>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {!events.ok && (
            <p role="status">
              USS event listings are temporarily unavailable. Existing sessions
              remain below.
            </p>
          )}
          {events.ok && events.data.nextCursor && (
            <LinkButton
              href={`/runs?cursor=${encodeURIComponent(events.data.nextCursor)}`}
              variant="secondary"
            >
              More USS events ↗
            </LinkButton>
          )}
          {cursor && (
            <LinkButton href="/runs" variant="text">
              First event page ↗
            </LinkButton>
          )}
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
