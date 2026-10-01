import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EventCard from "@/components/EventCard";
import { runs, stats } from "@/data/site";

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
              USS Running is a community-driven movement where running meets
              lifestyle, culture and the city.
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
            STARTED WITH <strong>18 FRIENDS.</strong><br />
            ONE YEAR LATER, AROUND <strong>500 RUNNERS</strong> SHOWED UP.<br />
            THIS IS NOT ABOUT PACE. IT&apos;S ABOUT <strong>SHOWING UP.</strong>
          </p>
          <div className="manifesto-foot">
            <span>NO FINISH LINE FOR COMMUNITY.</span>
            <Link href="/membership">BECOME A MEMBER ↗</Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

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
          <span className="kicker">04 / MEMBERSHIP</span>
          <h2>YOUR RUNS.<br />YOUR PEOPLE.<br />ONE ID.</h2>
          <p>
            Create your USS Running profile, RSVP to community sessions, keep
            your QR pass and see every run you&apos;ve joined in one place.
          </p>
          <Link className="button button-dark" href="/membership">
            EXPLORE MEMBERSHIP
          </Link>
        </div>
      </section>

      <section className="story-band">
        <div className="story-band-title">
          <span className="kicker">05 / STORIES</span>
          <h2>MORE THAN<br />THE RUN.</h2>
        </div>

        <Link className="story-feature" href="/stories">
          <img
            src="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1600&q=85"
            alt=""
          />
          <div className="story-overlay">
            <span>FIELD NOTES / 001</span>
            <h3>WHY WE KEEP COMING BACK TO THE ROAD.</h3>
            <span>READ STORY ↗</span>
          </div>
        </Link>
      </section>

      <section className="partner-strip">
        <span>BUILT WITH THE COMMUNITY</span>
        <div className="partner-wordmarks">
          <b>RUN CLUBS</b><b>BRANDS</b><b>CREATORS</b><b>THE CITY</b>
        </div>
        <Link href="/partners">PARTNER WITH USS ↗</Link>
      </section>

      <SiteFooter />
    </main>
  );
}
