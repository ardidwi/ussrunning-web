import Link from "next/link";

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" />
    </svg>
  );
}

function StravaIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.7 3.2 6.9 14.7h3.5l2.3-4.6 2.3 4.6h3.5L12.7 3.2Z" fill="currentColor" />
      <path d="m15.1 14.7 2.1 4.1 2.1-4.1h-4.2Z" fill="currentColor" />
    </svg>
  );
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/uss-logo.png" alt="USS" className="footer-logo-image" />
      </div>

      <div className="footer-links">
        <Link href="/runs">RUNS</Link>
        <Link href="/membership">MEMBERSHIP</Link>
        <Link href="/stories">STORIES</Link>
        <Link href="/partners">PARTNERS</Link>
        <Link href="/login">MY USS</Link>
      </div>

      <div className="footer-newsletter">
        <span className="kicker">STAY CLOSE / GET THE NEXT RUN</span>
        <div className="newsletter-row">
          <input aria-label="Email address" placeholder="EMAIL ADDRESS" />
          <button type="button">SIGN UP</button>
        </div>
      </div>

      <div className="footer-socials">
        <span className="footer-socials-label">FOLLOW THE RUN</span>

        <div className="footer-social-links">
          <a
            className="footer-social-link"
            href="https://strava.app.link/fC4mwJNBS6b"
            target="_blank"
            rel="noreferrer"
            aria-label="USS Running on Strava"
          >
            <span className="footer-social-icon"><StravaIcon /></span>
            <span className="footer-social-copy">
              <small>STRAVA</small>
              <strong>USS RUNNING</strong>
            </span>
            <i>↗</i>
          </a>

          <a
            className="footer-social-link"
            href="https://www.instagram.com/ussrunning?stkn=MTZyNnkybXhiN29wZQ=="
            target="_blank"
            rel="noreferrer"
            aria-label="USS Running on Instagram"
          >
            <span className="footer-social-icon"><InstagramIcon /></span>
            <span className="footer-social-copy">
              <small>INSTAGRAM</small>
              <strong>@USSRUNNING</strong>
            </span>
            <i>↗</i>
          </a>
        </div>
      </div>
    </footer>
  );
}
