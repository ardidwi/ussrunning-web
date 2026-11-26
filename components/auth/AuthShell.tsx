import Link from "next/link";
import type { ReactNode } from "react";
import { getPublicSiteContent } from "@/lib/site-content/site-service";
import { SITE_DEFAULTS } from "@/lib/site-content/site-defaults";
import { loadUpcomingPublicEvents } from "@/features/public-events/server";
import { eventCardDate } from "@/features/public-events/presentation";
import { deliverableUrl, firstDeliverable } from "@/features/public-site/media";
export default async function AuthShell({
  children,
  eyebrow,
  heading,
  description,
}: {
  children: ReactNode;
  eyebrow: string;
  heading: string;
  description: string;
}) {
  const [visual, upcoming] = await Promise.all([
    getPublicSiteContent("login.visual"),
    loadUpcomingPublicEvents(1),
  ]);
  const hero = visual.payload ?? SITE_DEFAULTS["login.visual"];
  const heroImage = deliverableUrl(firstDeliverable(visual.media, hero.desktopMediaId));
  // Same BE-07 public events as the homepage and /runs.
  const nextRun = upcoming.ok ? upcoming.items[0] ?? null : null;
  const nextRunDate = nextRun ? eventCardDate(nextRun.startsAt, nextRun.timezone) : null;
  const nextRunPlace = nextRun ? nextRun.venueName || nextRun.locationText : null;

  return (
    <main className="login-page-v3">
      <section className="login-visual login-visual-v3">
        {heroImage ? <img src={heroImage} alt="" className="login-visual-image" /> : null}
        <div className="login-visual-scrim" />

        <div className="login-visual-top">
          <Link
            href="/"
            className="login-logo"
            aria-label="Back to USS Running"
          >
            <img src="/uss-logo.png" alt="USS" />
          </Link>
          <Link href="/" className="login-back">
            BACK TO SITE ↗
          </Link>
        </div>

        <div className="login-visual-copy login-visual-copy-v3">
          <span className="kicker">
            {hero.kicker || "MY USS / COMMUNITY ACCESS"}
          </span>
          <h1 className="pre-line">{hero.headline}</h1>
          <p>{hero.description}</p>
        </div>

        {nextRun && nextRunDate ? (
          <div className="login-next-run login-next-run-v3">
            <div>
              <span className="login-next-label">NEXT UP</span>
              <strong>{nextRun.title}</strong>
            </div>
            <div className="login-next-meta">
              <span>{nextRunDate.full}</span>
              <span>{nextRunDate.time}</span>
              {nextRunPlace ? <span>{nextRunPlace.toUpperCase()}</span> : null}
            </div>
            <Link href={`/runs/${encodeURIComponent(nextRun.slug)}`}>VIEW RUN ↗</Link>
          </div>
        ) : null}
      </section>

      <section className="login-panel login-panel-v3">
        <div className="login-panel-inner login-panel-inner-v3">
          <div className="login-access-strip">
            <span>MY USS</span>
            <i />
            <span>MEMBER ACCESS</span>
          </div>

          <div className="login-panel-head login-panel-head-v3">
            <span className="kicker">{eyebrow}</span>
            <h2 className="pre-line">{heading}</h2>
            <p>{description}</p>
          </div>

          <div className="login-auth-card">{children}</div>

          <div className="login-member-row">
            <div>
              <span>NEW TO USS?</span>
              <strong>CREATE YOUR COMMUNITY ID.</strong>
            </div>
            <Link href="/join">JOIN USS ↗</Link>
          </div>

          <div className="login-legal">
            <span>By continuing, you agree to the</span>
            <Link href="/terms">Terms of Use</Link>
            <span>and acknowledge the</span>
            <Link href="/privacy">Privacy Policy</Link>.
          </div>
        </div>
      </section>
    </main>
  );
}
