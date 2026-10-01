import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function MembershipPage() {
  return (
    <main className="page-black">
      <SiteHeader />
      <section className="membership-hero">
        <span className="kicker">USS RUNNING MEMBERSHIP</span>
        <h1>ONE ID.<br />EVERY RUN.</h1>
        <p>Your access point to USS Running. RSVP faster, keep your run pass, see your history and unlock member drops.</p>
        <Link className="button button-light" href="/login">CREATE USS ID</Link>
      </section>

      <section className="membership-grid">
        <div className="membership-card">
          <div><span className="kicker">FREE / COMMUNITY</span><h2>USS MEMBER</h2></div>
          <div className="member-price">IDR 0 <span>/ forever</span></div>
          <ul>
            <li>Community run RSVP</li><li>Personal USS ID</li><li>Digital QR run pass</li><li>Run history</li><li>Member announcements</li>
          </ul>
          <Link className="button button-dark full-button" href="/login">JOIN COMMUNITY</Link>
        </div>
        <div className="membership-card membership-card-dark">
          <div><span className="kicker">FUTURE TIER / PREVIEW</span><h2>USS+</h2></div>
          <div className="member-price">COMING <span>/ later</span></div>
          <ul>
            <li>Priority event access</li><li>Member-only sessions</li><li>Partner benefits</li><li>Exclusive drops</li><li>Special activations</li>
          </ul>
          <button className="button button-outline full-button">NOTIFY ME</button>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
