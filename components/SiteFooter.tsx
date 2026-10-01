import Link from "next/link";

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
    </footer>
  );
}
