import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import type { Metadata } from "next";
import { pageMetadata } from "@/features/seo/metadata";

export const metadata: Metadata = pageMetadata({
  path: "/privacy",
  title: "Privacy",
  description: "How USS Running collects, uses and protects member data, including your profile photo, USS Member ID and member barcode.",
});

const dataRows = [
  ["ACCOUNT & PROFILE", "Name, email, mobile number, emergency contact name and number, profile photo, USS Member ID and member barcode.", "Create and manage your USS ID, identify you at events and support member features."],
  ["EVENT PARTICIPATION", "RSVP status, selected event, check-in, run-pass or QR information, attendance history and event-related preferences.", "Manage capacity, registration, check-in, event operations and your participation history."],
  ["COMMUNICATION", "Messages, support requests, feedback and communication preferences.", "Respond to you, provide event updates and manage community support."],
  ["NEWSLETTER", "Email address and newsletter consent status.", "Send USS updates only when you have separately chosen to receive them."],
  ["TECHNICAL DATA", "Basic device, browser, security and usage information that may be generated when you use the website.", "Operate, secure, diagnose and improve the website."],
  ["MEDIA & COMMUNITY CONTENT", "Photos, video or other event media where you may appear.", "Document community activities and, where appropriate, publish community content subject to applicable consent requirements."],
];

const rights = [
  "Ask what personal data USS Running holds about you.",
  "Request access to or a copy of your personal data, where applicable.",
  "Request correction or completion of inaccurate information.",
  "Withdraw consent where processing is based on consent.",
  "Request deletion or destruction where applicable under law.",
  "Object to or request restriction of certain processing where applicable.",
  "Unsubscribe from marketing or community email updates at any time.",
];

export default function PrivacyPage() {
  return (
    <main className="page-black privacy-page">
      <SiteHeader />

      <section className="privacy-hero">
        <div className="content-frame privacy-hero-inner">
          <div>
            <span className="kicker">LEGAL / USS RUNNING</span>
            <h1>PRIVACY<br />POLICY.</h1>
          </div>

          <div className="privacy-hero-copy">
            <p>
              This Privacy Policy explains how USS Running handles personal data
              when you create a USS ID, register for events, check in, receive a run
              pass, subscribe to updates or otherwise use our digital community services.
            </p>
            <p>
              We aim to handle personal data responsibly and transparently with
              reference to applicable Indonesian data protection requirements,
              including Law No. 27 of 2022 on Personal Data Protection.
            </p>

            <div className="privacy-meta">
              <span><b>EFFECTIVE</b> 01 OCTOBER 2026</span>
              <span><b>LOCATION</b> JAKARTA, INDONESIA</span>
              <span><b>CONTACT</b> HELLO@USSRUNNING.COM</span>
            </div>
          </div>
        </div>
      </section>

      <section className="privacy-summary">
        <div className="content-frame">
          <span className="kicker">AT A GLANCE</span>

          <div className="privacy-summary-grid">
            <article>
              <span>01</span>
              <h2>MEMBERSHIP IS FREE.</h2>
              <p>Creating a USS ID does not require a paid subscription.</p>
            </article>
            <article>
              <span>02</span>
              <h2>MARKETING IS OPTIONAL.</h2>
              <p>Newsletter consent is separate from the consent needed to create and manage your account.</p>
            </article>
            <article>
              <span>03</span>
              <h2>WE DO NOT SELL YOUR DATA.</h2>
              <p>USS Running does not sell personal data to advertisers.</p>
            </article>
            <article>
              <span>04</span>
              <h2>YOU CAN ASK ABOUT YOUR DATA.</h2>
              <p>You may contact us to request access, correction, deletion or withdrawal of consent where applicable.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="privacy-content">
        <div className="content-frame privacy-layout">
          <aside className="privacy-index">
            <span className="kicker">ON THIS PAGE</span>
            <a href="#who-we-are">01 / Who we are</a>
            <a href="#what-we-collect">02 / What we collect</a>
            <a href="#why-we-use-it">03 / Why we use it</a>
            <a href="#legal-basis">04 / Legal basis</a>
            <a href="#sharing">05 / Sharing & providers</a>
            <a href="#media">06 / Event media</a>
            <a href="#retention">07 / Retention</a>
            <a href="#rights">08 / Your rights</a>
            <a href="#transfers">09 / International processing</a>
            <a href="#security">10 / Security</a>
            <a href="#children">11 / Young participants</a>
            <a href="#cookies">12 / Cookies & storage</a>
            <a href="#changes">13 / Changes & contact</a>
          </aside>

          <div className="privacy-body">
            <section id="who-we-are" className="privacy-section">
              <div className="privacy-section-number">01</div>
              <div>
                <h2>WHO WE ARE</h2>
                <p>
                  USS Running is a Jakarta-based running community that operates
                  this website and related community experiences. In this policy,
                  “USS Running”, “USS”, “we”, “us” and “our” refer to the operator
                  of these services.
                </p>
                <p>
                  If a future service is operated by a separate legal entity, event
                  organizer or brand partner, we will identify that party where
                  relevant and explain its role before collecting data for that service.
                </p>
              </div>
            </section>

            <section id="what-we-collect" className="privacy-section privacy-section-wide">
              <div className="privacy-section-number">02</div>
              <div>
                <h2>WHAT PERSONAL DATA WE MAY COLLECT</h2>
                <p>
                  The information we collect depends on how you interact with USS.
                  We only ask for information that is reasonably connected to the
                  feature, event or community service you are using.
                </p>

                <div className="privacy-data-table">
                  <div className="privacy-data-head">
                    <span>TYPE</span><span>EXAMPLES</span><span>WHY</span>
                  </div>
                  {dataRows.map(([type, examples, why]) => (
                    <div className="privacy-data-row" key={type}>
                      <strong>{type}</strong>
                      <p>{examples}</p>
                      <p>{why}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section id="why-we-use-it" className="privacy-section">
              <div className="privacy-section-number">03</div>
              <div>
                <h2>WHY WE USE PERSONAL DATA</h2>
                <p>USS Running may use personal data to:</p>
                <ul>
                  <li>Issue your permanent USS Member ID and a barcode that lets authorized USS staff confirm your name, photo and account status. The barcode contains no contact details.</li>
                  <li>Process event registrations, RSVPs and capacity limits.</li>
                  <li>Issue run passes or QR codes and support event check-in.</li>
                  <li>Send operational messages such as event changes, reminders or safety information.</li>
                  <li>Maintain participation history and member features.</li>
                  <li>Respond to questions, support requests and feedback.</li>
                  <li>Prevent misuse, protect accounts and secure the website.</li>
                  <li>Improve community operations, website performance and user experience.</li>
                  <li>Send newsletters or promotional updates only when you have separately opted in.</li>
                </ul>
              </div>
            </section>

            <section id="legal-basis" className="privacy-section">
              <div className="privacy-section-number">04</div>
              <div>
                <h2>OUR BASIS FOR PROCESSING</h2>
                <p>
                  We process personal data only where an appropriate lawful basis
                  applies. Depending on the situation, this may include your consent,
                  steps needed to provide a service you requested, compliance with
                  legal obligations, or another lawful basis available under applicable
                  Indonesian data protection law.
                </p>
                <p>
                  We require a profile photo for your Member Card and RSVPs so authorized USS staff can visually confirm your identity. We store the photo privately and limit access to you and authorized USS staff. Staff can reject a photo and ask you to replace it.
                  Where we rely on consent, you may withdraw it at any time. Withdrawal does not affect processing that was lawful before the
                  withdrawal and may affect features that require the relevant data.
                </p>
              </div>
            </section>

            <section id="sharing" className="privacy-section">
              <div className="privacy-section-number">05</div>
              <div>
                <h2>WHO WE MAY SHARE DATA WITH</h2>
                <p>
                  We may work with service providers that support website hosting,
                  email delivery, forms, analytics, security, storage or other
                  operational functions. They should only receive the information
                  reasonably needed to provide their service to USS.
                </p>
                <p>
                  For a specific event, limited information may also be shared with
                  venues, production teams, timing or check-in providers, or relevant
                  event partners when this is reasonably necessary to deliver that
                  event and an appropriate legal basis applies.
                </p>
                <p><strong>USS Running does not sell personal data to advertisers.</strong></p>
              </div>
            </section>

            <section id="media" className="privacy-section">
              <div className="privacy-section-number">06</div>
              <div>
                <h2>EVENT PHOTOGRAPHY, VIDEO & COMMUNITY CONTENT</h2>
                <p>
                  USS events may be photographed or recorded for community
                  documentation, editorial stories and event recaps. Where a separate
                  consent, release or notice is required, we will provide it in the
                  registration flow or at the relevant event.
                </p>
                <p>
                  If you have a concern about a specific published image or video,
                  contact us with enough detail for us to identify the content and
                  review your request.
                </p>
              </div>
            </section>

            <section id="retention" className="privacy-section">
              <div className="privacy-section-number">07</div>
              <div>
                <h2>HOW LONG WE KEEP DATA</h2>
                <p>
                  We keep personal data only for as long as reasonably necessary for
                  the purpose it was collected, taking into account community
                  administration, event records, security, dispute handling and
                  applicable legal obligations.
                </p>
                <p>
                  Newsletter information is generally kept until you unsubscribe or
                  ask us to delete it, subject to limited information we may need to
                  retain to record your opt-out or comply with law.
                </p>
              </div>
            </section>

            <section id="rights" className="privacy-section">
              <div className="privacy-section-number">08</div>
              <div>
                <h2>YOUR PRIVACY RIGHTS</h2>
                <p>Subject to applicable law, you may be able to:</p>
                <ul>
                  {rights.map((right) => <li key={right}>{right}</li>)}
                </ul>
                <p>
                  We may need to verify your identity before completing certain
                  requests. Some rights may also be subject to lawful exceptions.
                </p>
              </div>
            </section>

            <section id="transfers" className="privacy-section">
              <div className="privacy-section-number">09</div>
              <div>
                <h2>INTERNATIONAL PROCESSING</h2>
                <p>
                  Some technology providers may process or store information outside
                  Indonesia. Where this happens, we will take reasonable steps
                  required by applicable law to protect the information and use
                  providers that offer appropriate safeguards.
                </p>
              </div>
            </section>

            <section id="security" className="privacy-section">
              <div className="privacy-section-number">10</div>
              <div>
                <h2>SECURITY</h2>
                <p>
                  We use reasonable organizational and technical measures designed
                  to protect personal data against unauthorized access, misuse,
                  alteration, loss or disclosure. These measures may include access
                  controls, provider security features and operational procedures.
                </p>
                <p>
                  No online service can be guaranteed to be completely secure. If we
                  become aware of an incident that requires notification under
                  applicable law, we will handle notification accordingly.
                </p>
              </div>
            </section>

            <section id="children" className="privacy-section">
              <div className="privacy-section-number">11</div>
              <div>
                <h2>CHILDREN & YOUNG PARTICIPANTS</h2>
                <p>
                  If a USS activity is open to minors, additional information,
                  eligibility rules or consent from a parent or legal guardian may
                  be required before registration or participation.
                </p>
              </div>
            </section>

            <section id="cookies" className="privacy-section">
              <div className="privacy-section-number">12</div>
              <div>
                <h2>COOKIES & LOCAL STORAGE</h2>
                <p>
                  USS may use cookies or local storage that are necessary for login,
                  security, preferences and core website functionality. Analytics or
                  marketing technologies will only be used when configured and, where
                  consent is required, after an appropriate consent choice is provided.
                </p>
                <p>
                  You can also manage browser-level cookie or storage settings through
                  your browser. Disabling strictly necessary storage may affect website
                  functionality.
                </p>
              </div>
            </section>

            <section id="changes" className="privacy-section">
              <div className="privacy-section-number">13</div>
              <div>
                <h2>CHANGES TO THIS POLICY & CONTACT</h2>
                <p>
                  We may update this Privacy Policy as USS Running, its website and
                  community services evolve. Material changes will be reflected on
                  this page together with an updated effective date.
                </p>
                <p>
                  For privacy questions, withdrawal of consent or requests relating
                  to your personal data, contact
                  <a href="mailto:hello@ussrunning.com"> hello@ussrunning.com</a>.
                </p>
              </div>
            </section>

            <section className="privacy-contact-card">
              <span className="kicker">PRIVACY REQUESTS</span>
              <h2>YOUR DATA.<br />YOUR REQUEST.</h2>
              <p>
                Tell us what you need and include enough information for us to
                identify your USS account or the relevant event.
              </p>
              <div>
                <a className="button button-light" href="mailto:hello@ussrunning.com">CONTACT USS</a>
                <Link className="text-cta" href="/terms">READ TERMS OF USE ↗</Link>
              </div>
            </section>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
