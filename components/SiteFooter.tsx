import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <div className="footer-logo">USS® RUNNING</div>
        <p>RUNNING / COMMUNITY / CULTURE<br />JAKARTA, INDONESIA</p>
      </div>
      <div className="footer-links">
        <Link href="/runs">RUNS</Link>
        <Link href="/membership">MEMBERSHIP</Link>
        <Link href="/stories">STORIES</Link>
        <Link href="/partners">PARTNERS</Link>
        <Link href="/admin">CMS PREVIEW</Link>
      </div>
      <div className="footer-newsletter">
        <span className="kicker">STAY IN THE LOOP</span>
        <div className="newsletter-row">
          <input aria-label="Email address" placeholder="EMAIL ADDRESS" />
          <button type="button">SIGN UP</button>
        </div>
      </div>
    </footer>
  );
}
