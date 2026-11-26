import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";
import { pageMetadata } from "@/features/seo/metadata";

export const metadata: Metadata = pageMetadata({
  path: "/terms",
  title: "Terms of Use",
  description: "Terms of use for the USS Running website, membership and community events.",
});

export default function TermsPage() {
  return (
    <main className="page-black legal-page">
      <SiteHeader />
      <section className="legal-hero">
        <div className="content-frame">
          <span className="kicker">LEGAL / USS RUNNING</span>
          <h1>TERMS<br />OF USE.</h1>
          <div className="legal-hero-meta">
            <span>Effective: 01 October 2026</span>
            <span>Membership: Free</span>
          </div>
          <p>
            These terms apply to the USS Running website, USS ID and community
            features. Event-specific rules may also apply and will be shown when
            you register.
          </p>
        </div>
      </section>

      <section className="legal-content">
        <div className="content-frame legal-layout">
          <aside className="legal-index">
            <span className="kicker">SUMMARY</span>
            <a href="#membership">01 / MEMBERSHIP</a>
            <a href="#events">02 / EVENTS</a>
            <a href="#accounts">03 / ACCOUNTS</a>
            <a href="#content">04 / CONTENT</a>
            <a href="#changes">05 / CHANGES</a>
          </aside>

          <div className="legal-sections">
            <section id="membership" className="legal-section">
              <span>01</span>
              <div><h2>MEMBERSHIP</h2><p>USS membership is free. A USS ID may be required to RSVP, receive a run pass or access member features. Membership does not guarantee a place at capacity-limited events.</p></div>
            </section>
            <section id="events" className="legal-section">
              <span>02</span>
              <div><h2>EVENTS & PARTICIPATION</h2><p>Running and physical activity involve inherent risks. Participants are responsible for deciding whether an activity is appropriate for them, following event instructions and acting respectfully toward other participants, organizers, venues and partners.</p></div>
            </section>
            <section id="accounts" className="legal-section">
              <span>03</span>
              <div><h2>ACCOUNT RESPONSIBILITY</h2><p>Keep your login information accurate and secure. Do not impersonate another person, misuse another member&apos;s run pass or use USS services for unlawful, abusive or disruptive activity.</p></div>
            </section>
            <section id="content" className="legal-section">
              <span>04</span>
              <div><h2>CONTENT & COMMUNITY MEDIA</h2><p>Event photography or community content may be created during USS activities. Where specific consent or release is required, we will request it separately. Content you submit must be yours to share and must not violate another person&apos;s rights.</p></div>
            </section>
            <section id="changes" className="legal-section">
              <span>05</span>
              <div><h2>CHANGES & CONTACT</h2><p>We may update these terms as features or community operations change. For questions, contact <a href="mailto:hello@ussrunning.com">hello@ussrunning.com</a>. Our handling of personal data is explained in the <Link href="/privacy">Privacy Policy</Link>.</p></div>
            </section>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
