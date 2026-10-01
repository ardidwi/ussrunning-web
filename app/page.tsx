import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import { runs } from "@/data/site";
import CommunityStats from "@/components/CommunityStats";

const tickerText = "RUNNING / COMMUNITY / CULTURE /";
const collaborations = [
  "ASICS",
  "NIKE",
  "PUMA",
  "NEW BALANCE",
  "ON",
  "ADIDAS",
  "MIZUNO",
  "ATMOS",
  "THULE",
  "COMPASS",
  "ZODIAC",
  "SUN & SAND SPORTS",
  "BLUE DOORS",
  "RUNNING DEPT",
  "ORTUSEIGHT",
  "DEUS",
  "SKINTIFIC",
  "AQUA",
  "POCARI SWEAT",
  "COMMON GROUNDS",
];

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <SiteHeader />

        <div className="hero-media" aria-hidden="true">
          <img
            src="https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=2200&q=90"
            alt=""
          />
        </div>
        <div className="hero-scrim" />

        <div className="hero-content content-frame hero-frame">
          <div className="hero-meta">
            <span>EST. 2024</span>
          </div>

          <div className="hero-title-block">
            <span className="hero-location">JAKARTA, INDONESIA</span>
            <h1>WE RUN.<br />WE CONNECT.<br />WE MOVE.</h1>
          </div>

          <div className="hero-bottom">
            <p>
              Built in Jakarta. USS Running brings people together through
              movement, then keeps the story going through culture, friendship
              and shared experiences.
            </p>
            <Link href="/runs" className="circle-link" aria-label="Explore runs">↘</Link>
          </div>
        </div>
      </section>

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

      <section className="section next-section">
        <div className="content-frame">
          <div className="section-heading">
            <div>
              <span className="kicker">01 / NEXT UP</span>
              <h2>MEET US<br />ON THE ROAD.</h2>
            </div>
            <Link href="/runs" className="arrow-link">VIEW ALL RUNS ↗</Link>
          </div>

          <div className="event-grid">
            {runs.slice(0, 2).map((run) => <EventCard run={run} key={run.slug} />)}
          </div>
        </div>
      </section>

      <section className="manifesto section-invert">
        <div className="content-frame">
          <div className="manifesto-label">02 / OUR MOVEMENT</div>
          <p className="manifesto-copy">
            RUNNING BROUGHT US TOGETHER.<br />
            <strong>18 RUNNERS</strong> ON DAY ONE. AROUND <strong>500</strong> ON DAY 365.<br />
            WE RUN, CHEER, EAT, CREATE AND <strong>SHOW UP FOR EACH OTHER.</strong>
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
              A selection of brands, spaces and communities that have moved
              with USS Running across events, campaigns and race-week moments.
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
            src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1500&q=85"
            alt="Runner on the road"
          />
        </div>

        <div className="editorial-copy">
          <span className="kicker">04 / MEMBERSHIP / FREE</span>
          <h2>ONE COMMUNITY.<br />NO PAID TIER.<br />ONE ID.</h2>
          <p>
            USS membership is free. Create one community ID to RSVP to runs,
            keep your run pass and build your USS history as you keep showing up.
          </p>
          <Link className="button button-light" href="/membership">
            JOIN USS — FREE
          </Link>
        </div>
      </section>

      <section className="story-band">
        <div className="story-band-title">
          <span className="kicker">05 / STORIES</span>
          <h2>THE PEOPLE.<br />THE CITY.<br />THE MILES.</h2>
        </div>

        <Link className="story-feature" href="/stories">
          <img
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1600&q=85"
            alt=""
          />
          <div className="story-overlay">
            <span>ORIGIN / 001</span>
            <h3>18 RUNNERS. DAY ONE. THE START OF USS.</h3>
            <span>READ THE STORY ↗</span>
          </div>
        </Link>
      </section>

      <section className="partner-strip">
        <div className="partner-strip-inner">
          <span className="partner-strip-label">RUNNING IS THE ENTRY POINT</span>
          <div className="partner-wordmarks" aria-label="USS community pillars">
            <b>RUN</b><i>/</i><b>CHEER</b><i>/</i><b>EAT</b><i>/</i><b>CREATE</b><i>/</i><b>CONNECT</b>
          </div>
          <Link href="/partners">BUILD WITH USS ↗</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
