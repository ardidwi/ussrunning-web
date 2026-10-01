import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function PartnersPage() {
  return (
    <main className="page-black">
      <SiteHeader />
      <section className="partner-hero">
        <span className="kicker">PARTNERSHIPS</span>
        <h1>BE PART OF<br />THE JOURNEY.</h1>
        <p>Not just logo placement. We build moments runners naturally want to join, experience and share.</p>
      </section>
      <section className="partner-opportunities">
        {[
          ["01","PRODUCT","Food, beverages, hydration, recovery and running products."],
          ["02","VENUE","Community gatherings, carb loading and post-run locations."],
          ["03","EXPERIENCE","Music, content, interactive activations and race-week moments."],
          ["04","PRODUCTION","Event equipment, documentation and activation production."],
          ["05","MONETARY","Support for community-led race-week activities."]
        ].map(([n,title,copy]) => (
          <div className="opportunity" key={n}><span>{n}</span><h2>{title}</h2><p>{copy}</p><b>↗</b></div>
        ))}
      </section>
      <section className="partner-cta">
        <h2>LET&apos;S BUILD IT<br />TOGETHER.</h2>
        <a className="button button-dark" href="mailto:hello@ussrunning.com">START A CONVERSATION</a>
      </section>
      <SiteFooter />
    </main>
  );
}
