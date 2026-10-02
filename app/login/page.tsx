import Link from "next/link";
import LoginForm from "@/components/LoginForm";
import { getLoginHero, getRuns } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [hero, runs] = await Promise.all([getLoginHero(), getRuns()]);
  const nextRun = runs[0];

  return (
    <main className="login-page-v3">
      <section className="login-visual login-visual-v3">
        <img src={hero.imageUrl} alt="" className="login-visual-image" />
        <div className="login-visual-scrim" />

        <div className="login-visual-top">
          <Link href="/" className="login-logo" aria-label="Back to USS Running">
            <img src="/uss-logo.png" alt="USS" />
          </Link>
          <Link href="/" className="login-back">BACK TO SITE ↗</Link>
        </div>

        <div className="login-visual-copy login-visual-copy-v3">
          <span className="kicker">{hero.kicker || "MY USS / COMMUNITY ACCESS"}</span>
          <h1 style={{ whiteSpace: "pre-line" }}>{hero.headline}</h1>
          <p>{hero.description}</p>
        </div>

        {nextRun ? (
          <div className="login-next-run login-next-run-v3">
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

      <section className="login-panel login-panel-v3">
        <div className="login-panel-inner login-panel-inner-v3">
          <div className="login-access-strip">
            <span>MY USS</span>
            <i />
            <span>MEMBER ACCESS</span>
          </div>

          <div className="login-panel-head login-panel-head-v3">
            <span className="kicker">WELCOME BACK</span>
            <h2>LOG IN TO<br />MY USS.</h2>
            <p>
              Access your runs, passes and USS participation history with one
              community ID.
            </p>
          </div>

          <div className="login-auth-card">
            <LoginForm />
          </div>

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
