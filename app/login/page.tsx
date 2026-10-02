import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { getLoginHero, getRuns } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [hero, runs] = await Promise.all([getLoginHero(), getRuns()]);
  const nextRun = runs[0];

  return (
    <main className="login-page-v2">
      <section className="login-visual">
        <img src={hero.imageUrl} alt="" className="login-visual-image" />
        <div className="login-visual-scrim" />

        <div className="login-visual-top">
          <Link href="/" className="login-logo" aria-label="Back to USS Running">
            <img src="/uss-logo.png" alt="USS" />
          </Link>
          <Link href="/" className="login-back">BACK TO SITE ↗</Link>
        </div>

        <div className="login-visual-copy">
          <span className="kicker">{hero.kicker || "MY USS / COMMUNITY ACCESS"}</span>
          <h1 style={{ whiteSpace: "pre-line" }}>{hero.headline}</h1>
          <p>{hero.description}</p>
        </div>

        {nextRun ? (
          <div className="login-next-run">
            <div>
              <span className="login-next-label">NEXT UP</span>
              <strong>{nextRun.title}</strong>
            </div>
            <div className="login-next-meta">
              <span>{nextRun.date}</span>
              <span>{nextRun.time}</span>
              <span>{nextRun.location}</span>
            </div>
            <Link href={"/runs/" + nextRun.slug}>VIEW RUN ↗</Link>
          </div>
        ) : null}
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-panel-head">
            <span className="kicker">WELCOME BACK</span>
            <h2>LOG IN TO<br />MY USS.</h2>
            <p>
              Your upcoming runs, run passes and USS history stay connected to
              one free community ID.
            </p>
          </div>

          <LoginForm />

          <div className="login-join-card">
            <div>
              <span className="kicker">NEW HERE?</span>
              <h3>JOIN THE CREW.<br />IT&apos;S FREE.</h3>
            </div>
            <Link href="/join">CREATE USS ID ↗</Link>
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
