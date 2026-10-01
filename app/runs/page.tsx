import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import { runs } from "@/data/site";

export default function RunsPage() {
  return (
    <main className="page-black">
      <SiteHeader />
      <section className="page-hero">
        <span className="kicker">RUNS / EVENTS / ACTIVATIONS</span>
        <h1>FIND YOUR<br />NEXT START.</h1>
        <p>Community runs, training sessions and special collaborations. One place to find what&apos;s next.</p>
      </section>
      <section className="section event-list-section">
        <div className="filter-row">
          <button className="filter-active">ALL</button><button>COMMUNITY RUN</button><button>SPECIAL SESSION</button><button>MEMBER ONLY</button>
        </div>
        <div className="event-grid event-grid-three">
          {runs.map((run) => <EventCard run={run} key={run.slug} />)}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
