import Link from "next/link";
import JoinForm from "@/components/JoinForm";

export default function JoinPage() {
  return (
    <main className="join-shell join-shell-v3">
      <Link href="/" className="join-brand" aria-label="Back to USS Running">
        <img src="/uss-logo.png" alt="USS" />
      </Link>

      <section className="join-intro join-intro-v3">
        <div className="join-intro-copy">
          <span className="kicker">USS MEMBERSHIP / JAKARTA</span>
          <h1>JOIN THE<br />CREW.</h1>
          <p>
            Create one USS ID for community runs, RSVPs, run passes and your
            participation history.
          </p>
        </div>

        <div className="join-intro-meta">
          <div><span>01</span><strong>RUN</strong></div>
          <div><span>02</span><strong>CONNECT</strong></div>
          <div><span>03</span><strong>SHOW UP</strong></div>
        </div>
      </section>

      <section className="join-form-panel join-form-panel-v3">
        <div className="join-form-head">
          <span className="kicker">CREATE YOUR USS ID</span>
          <span>MEMBERSHIP / ACCOUNT</span>
        </div>
        <JoinForm />
      </section>
    </main>
  );
}
