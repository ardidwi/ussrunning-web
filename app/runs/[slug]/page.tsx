import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getRunBySlug } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const run = await getRunBySlug(slug);
  if (!run) notFound();

  return (
    <main className="page-black">
      <SiteHeader />
      <section className="run-detail-hero">
        <img src={run.image} alt="" />
        <div className="run-detail-scrim" />
        <div className="run-detail-copy">
          <span className="kicker">{run.eyebrow}</span>
          <h1>{run.title}</h1>
          <div className="run-detail-meta">
            <span>{run.date}</span>
            <span>{run.time}</span>
            <span>{run.distance}</span>
            <span>{run.location}</span>
          </div>
        </div>
      </section>

      <section className="run-info-grid">
        <div>
          <span className="kicker">ABOUT THE SESSION</span>
          <h2>COME AS YOU ARE.<br />MOVE WITH THE CITY.</h2>
        </div>
        <div className="run-info-copy">
          <p>
            A social community session built around easy movement, good energy
            and meeting people on the road. Pace is secondary. Showing up is the point.
          </p>
          <div className="detail-table">
            <div><span>MEET UP</span><b>{run.time}</b></div>
            <div><span>LOCATION</span><b>{run.location}</b></div>
            <div><span>DISTANCE</span><b>{run.distance}</b></div>
            <div><span>ACCESS</span><b>{run.status}</b></div>
          </div>
          <Link className="button button-light full-button" href="/dashboard">
            RSVP WITH USS ID
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
