import Link from "next/link";
import { runs } from "@/data/site";

export default function LoginPage() {
  const nextRun = runs[0];

  return (
    <main className="login-page-v2">
      <section className="login-visual">
        <img src={nextRun.image} alt="" className="login-visual-image" />
        <div className="login-visual-scrim" />

        <div className="login-visual-top">
          <Link href="/" className="login-logo" aria-label="Back to USS Running">
            <img src="/uss-logo.png" alt="USS" />
          </Link>
          <Link href="/" className="login-back">BACK TO SITE ↗</Link>
        </div>

        <div className="login-visual-copy">
          <span className="kicker">MY USS / COMMUNITY ACCESS</span>
          <h1>YOUR RUNS.<br />YOUR PEOPLE.<br />ONE ID.</h1>
          <p>
            Sign in to keep your RSVPs, run passes and USS history in one place.
            Membership stays free.
          </p>
        </div>

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
      </section>

      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="login-panel-head">
            <span className="kicker">WELCOME BACK</span>
            <h2>LOG IN TO<br />MY USS.</h2>
            <p>
              Pick up where you left off. Your upcoming runs, run pass and
              participation history stay connected to your USS ID.
            </p>
          </div>

          <form action="/dashboard" className="login-form-v2">
            <label>
              <span>EMAIL</span>
              <input type="email" name="email" placeholder="you@email.com" required />
            </label>

            <label>
              <span>PASSWORD</span>
              <input type="password" name="password" placeholder="Enter your password" required />
            </label>

            <div className="login-form-options">
              <label className="login-remember">
                <input type="checkbox" name="remember" />
                <span>KEEP ME SIGNED IN</span>
              </label>
              <span className="login-help">NEED HELP? CONTACT USS</span>
            </div>

            <button className="login-primary" type="submit">
              LOG IN <span>↗</span>
            </button>
          </form>

          <div className="login-or"><span>OR</span></div>

          <Link className="login-preview" href="/dashboard">
            PREVIEW MY USS <span>↗</span>
          </Link>

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
