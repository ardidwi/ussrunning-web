import { PageHero } from "@/components/layout/PageHero";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getPublicEventList } from "@/lib/events/event-actions";
import { LinkButton } from "@/components/ui";
import EventCard from "@/components/EventCard";
import type { Metadata } from "next";
import { pageMetadata } from "@/features/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  path: "/runs",
  title: "Runs",
  description:
    "Upcoming USS Running community runs, training sessions, shakeouts and race-week moments in Jakarta. Membership is free; RSVP with one USS ID.",
});

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { cursor: rawCursor } = await searchParams;
  const cursor = typeof rawCursor === "string" ? rawCursor : undefined;
  const events = await getPublicEventList({
    limit: 20,
    ...(cursor ? { cursor } : {}),
  });

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
          {events.ok && events.data.items.length > 0 ? (
            <section aria-label="USS events">
              <h2 className="uss-sr-only">USS EVENTS</h2>
              <div className="event-grid event-grid-three">
                {events.data.items.map((event) => (
                  <EventCard event={event} key={event.id} />
                ))}
              </div>
            </section>
          ) : null}

          {events.ok && events.data.items.length === 0 ? (
            <div className="cms-empty-state" role="status">
              <p>No public USS events are available right now. New sessions will appear here once they are published.</p>
            </div>
          ) : null}

          {!events.ok ? (
            <div className="cms-empty-state" role="status">
              <p>USS event listings are temporarily unavailable. Please try again soon.</p>
            </div>
          ) : null}

          {events.ok && events.data.nextCursor ? (
            <LinkButton
              href={`/runs?cursor=${encodeURIComponent(events.data.nextCursor)}`}
              variant="secondary"
            >
              More USS events ↗
            </LinkButton>
          ) : null}
          {cursor ? (
            <LinkButton href="/runs" variant="text">
              First event page ↗
            </LinkButton>
          ) : null}
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
