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
    <footer className="uss-footer">
      <div className="uss-footer-inner">
        <div className="uss-footer-main">
          <div className="uss-footer-brand">
            <img src="/uss-logo.png" alt="USS" className="uss-footer-logo" />
            <p>Built in Jakarta. Made to move together.</p>

            <div className="uss-footer-socials" aria-label="USS Running social links">
              <a
                href="https://www.instagram.com/ussrunning?stkn=MTZyNnkybXhiN29wZQ=="
                target="_blank"
                rel="noreferrer"
                aria-label="USS Running on Instagram"
                title="Instagram"
              >
                <InstagramIcon />
              </a>

              <a
                href="https://strava.app.link/fC4mwJNBS6b"
                target="_blank"
                rel="noreferrer"
                aria-label="USS Running on Strava"
                title="Strava"
              >
                <StravaIcon />
              </a>
            </div>
          </div>

          <div className="uss-footer-column">
            <span className="uss-footer-heading">EXPLORE</span>
            <Link href="/runs">Runs</Link>
            <Link href="/about">About</Link>
            <Link href="/membership">Membership</Link>
            <Link href="/stories">Stories</Link>
            <Link href="/login">My USS</Link>
          </div>

          <div className="uss-footer-column">
            <span className="uss-footer-heading">CONNECT</span>
            <Link href="/partners">Partners</Link>
            <a href="https://www.instagram.com/ussrunning?stkn=MTZyNnkybXhiN29wZQ==" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://strava.app.link/fC4mwJNBS6b" target="_blank" rel="noreferrer">
              Strava
            </a>
            <a href="mailto:hello@ussrunning.com">Contact</a>
          </div>

          <div className="uss-footer-column uss-footer-legal">
            <span className="uss-footer-heading">LEGAL</span>
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <span>Cookie Settings</span>
          </div>
        </div>

        <div className="uss-footer-bottom">
          <span>© 2026 USS Running. All rights reserved.</span>
          <span>RUNNING / COMMUNITY / CULTURE</span>
        </div>
      </div>
    </footer>
  );
}
