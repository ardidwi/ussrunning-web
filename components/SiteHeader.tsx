import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="USS Running home">
        <img src="/uss-logo.png" alt="USS" className="brand-logo" />
      </Link>

      <nav className="desktop-nav" aria-label="Main navigation">
        <Link href="/runs">RUNS</Link>
        <Link href="/membership">MEMBERSHIP</Link>
        <Link href="/stories">STORIES</Link>
        <Link href="/partners">PARTNERS</Link>
      </nav>

      <div className="header-actions">
        <Link className="text-link" href="/login">LOG IN</Link>
        <Link className="button button-light button-small" href="/membership">JOIN USS</Link>
      </div>
    </header>
  );
}
