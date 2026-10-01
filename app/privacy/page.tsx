import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const sections = [
  ["01", "WHO WE ARE", "USS Running is a Jakarta-based running community operating this website and related community services. For privacy questions or requests, contact hello@ussrunning.com."],
  ["02", "DATA WE MAY COLLECT", "Depending on how you use USS Running, we may collect account details such as your name, email address, mobile number and profile information; event registration, RSVP, check-in and run-pass information; messages or submissions you send us; and limited technical information needed to operate and secure the website."],
  ["03", "WHY WE USE IT", "We use personal data to create and manage your USS ID, process event registrations, issue run passes, support check-in, communicate important event information, respond to requests, keep the community safe, improve our services and, where you separately choose to receive them, send community updates and newsletters."],
  ["04", "OUR BASIS FOR PROCESSING", "We process personal data only where we have an appropriate basis under applicable law. This may include your consent, steps needed to provide a service you request, compliance with legal obligations, or other lawful grounds available under Indonesian data protection law."],
  ["05", "WHO WE SHARE DATA WITH", "We may use service providers for hosting, email delivery, forms, analytics, storage and other operational services. We may also share limited information with event venues, production partners or brand partners only when reasonably necessary for a specific event or feature and where an appropriate legal basis applies. We do not sell personal data to advertisers."],
  ["06", "INTERNATIONAL PROCESSING", "Some technology providers may process data outside Indonesia. Where this happens, we will take reasonable steps required by applicable law to protect the data and use providers that offer appropriate safeguards."],
  ["07", "HOW LONG WE KEEP DATA", "We keep personal data only for as long as reasonably necessary for the purpose it was collected, including community administration, event records, security, dispute handling and legal requirements. Newsletter data is kept until you unsubscribe or ask us to delete it, subject to any limited retention required by law."],
  ["08", "YOUR RIGHTS", "Subject to applicable law, you may ask for information about how your data is processed, request access or correction, withdraw consent where processing is based on consent, request deletion or destruction where applicable, object to certain processing, and exercise other rights available to you under Indonesian personal data protection law."],
  ["09", "SECURITY", "We use reasonable organizational and technical measures designed to protect personal data against unauthorized access, loss, misuse, alteration or disclosure. No online system can be guaranteed to be completely secure."],
  ["10", "CHILDREN & YOUNG PARTICIPANTS", "If an event or service is open to minors, additional information or consent from a parent or legal guardian may be required before participation or account creation."],
  ["11", "CHANGES TO THIS POLICY", "We may update this Privacy Policy as USS Running and its digital services evolve. Material changes will be reflected on this page together with an updated effective date."],
];

export default function PrivacyPage() {
  return (
    <main className="page-black legal-page">
      <SiteHeader />

      <section className="legal-hero">
        <div className="content-frame">
          <span className="kicker">LEGAL / USS RUNNING</span>
          <h1>PRIVACY<br />POLICY.</h1>
          <div className="legal-hero-meta">
            <span>Effective: 01 October 2026</span>
            <span>Jakarta, Indonesia</span>
          </div>
          <p>
            This policy explains how USS Running handles personal data across
            membership, event registration, check-in, newsletters and other
            community services. It is designed with reference to Indonesia&apos;s
            personal data protection framework, including Law No. 27 of 2022.
          </p>
        </div>
      </section>

      <section className="legal-content">
        <div className="content-frame legal-layout">
          <aside className="legal-index">
            <span className="kicker">ON THIS PAGE</span>
            {sections.map(([number, title]) => (
              <a key={number} href={"#privacy-" + number}>{number} / {title}</a>
            ))}
            <a href="#cookies">12 / COOKIES & LOCAL STORAGE</a>
          </aside>

          <div className="legal-sections">
            {sections.map(([number, title, copy]) => (
              <section id={"privacy-" + number} className="legal-section" key={number}>
                <span>{number}</span>
                <div>
                  <h2>{title}</h2>
                  <p>{copy}</p>
                </div>
              </section>
            ))}

            <section id="cookies" className="legal-section">
              <span>12</span>
              <div>
                <h2>COOKIES & LOCAL STORAGE</h2>
                <p>
                  USS Running may use strictly necessary cookies or local storage
                  to support login, security, preferences and core website
                  functionality. Analytics or marketing technologies will only be
                  used when configured and, where consent is required, after an
                  appropriate consent choice is provided.
                </p>
              </div>
            </section>

            <section className="legal-contact">
              <span className="kicker">PRIVACY REQUESTS</span>
              <h2>YOUR DATA.<br />YOUR REQUEST.</h2>
              <p>
                To ask a privacy question, withdraw consent, request access,
                correction or deletion, contact us at
                <a href="mailto:hello@ussrunning.com"> hello@ussrunning.com</a>.
              </p>
              <Link className="button button-light" href="/join">JOIN USS — FREE</Link>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
