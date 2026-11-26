import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Branded frame for /admin when no CMS context can be loaded (signed out,
 * unverified, suspended, service failure). Shows no navigation or sign-out,
 * because the visitor has no usable session in this state.
 */
export function CmsStatusShell({ children }: { children: ReactNode }) {
  return (
    <div className="uss-member-shell uss-cms-foundation">
      <header className="uss-member-header">
        <Link href="/" aria-label="USS Running home">
          <img src="/uss-logo.png" alt="USS Running" width="120" height="42" />
        </Link>
        <span className="uss-member-kicker">USS CMS / COMMUNITY IN MOTION</span>
      </header>
      <main id="cms-content" className="uss-member-content uss-cms-status-content" tabIndex={-1}>
        {children}
        <Link className="uss-member-back" href="/">
          Back to USS Running ↗
        </Link>
      </main>
    </div>
  );
}
