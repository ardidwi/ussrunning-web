import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { getClientAuthPolicy } from "@/lib/auth/policy";

export default function JoinPage() {
  return (
    <main className="join-shell join-shell-v4">
      <section className="join-intro join-intro-v4">
        <Link
          href="/"
          className="join-brand join-brand-v4"
          aria-label="Back to USS Running"
        >
          <img src="/uss-logo.png" alt="USS" />
        </Link>

        <div className="join-intro-copy">
          <span className="kicker">USS MEMBERSHIP / JAKARTA</span>
          <h1>
            JOIN THE
            <br />
            CREW.
          </h1>
          <p>
            Verify your email, then add a clear profile photo and contact details. Your free membership includes a permanent USS Member ID and a Member Card with a barcode for staff identity checks.
          </p>
        </div>

        <div className="join-intro-meta">
          <div>
            <span>01</span>
            <strong>RUN</strong>
          </div>
          <div>
            <span>02</span>
            <strong>CONNECT</strong>
          </div>
          <div>
            <span>03</span>
            <strong>SHOW UP</strong>
          </div>
        </div>
      </section>

      <section className="join-form-panel join-form-panel-v4">
        <div className="join-form-stage">
          <div className="join-form-head join-form-head-v4">
            <div>
              <span className="kicker">CREATE YOUR USS ID</span>
              <p>One account for the USS community.</p>
            </div>
            <span>MEMBERSHIP / ACCOUNT</span>
          </div>

          <JoinForm policy={getClientAuthPolicy()} />
        </div>
      </section>
    </main>
  );
}
