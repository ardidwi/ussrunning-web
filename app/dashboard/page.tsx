import Link from "next/link";
import { runs } from "@/data/site";

export default function DashboardPage() {
  const run = runs[0];

  return (
    <main className="member-shell">
      <aside className="member-sidebar">
        <Link href="/" className="member-logo">
          <img src="/uss-logo.png" alt="USS" />
        </Link>
        <nav>
          <a className="active">OVERVIEW</a>
          <a>MY RUNS</a>
          <a>RUN PASS</a>
          <a>PROFILE</a>
        </nav>
        <div className="member-sidebar-foot">
          <span>FREE COMMUNITY MEMBER</span>
          <Link href="/" className="member-exit">← BACK TO SITE</Link>
        </div>
      </aside>

      <section className="member-main">
        <div className="member-top">
          <div>
            <span className="kicker">MY USS / COMMUNITY ID</span>
            <h1>HI, ARDI.</h1>
          </div>
          <div className="member-avatar">AD</div>
        </div>

        <div className="member-grid">
          <div className="next-run-panel">
            <span className="kicker">NEXT RUN</span>
            <img src={run.image} alt="" />
            <div className="next-run-copy">
              <h2>{run.title}</h2>
              <p>{run.date} · {run.time}<br />{run.location}</p>
              <button className="button button-light">VIEW RUN PASS</button>
            </div>
          </div>

          <div className="id-card">
            <span className="kicker">USS MEMBER ID / FREE</span>
            <div className="qr-demo"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
            <div><strong>ARDI DWI</strong><span>USS-000184</span></div>
          </div>
        </div>

        <div className="member-stats">
          <div><strong>12</strong><span>RUNS JOINED</span></div>
          <div><strong>08</strong><span>CHECK-INS</span></div>
          <div><strong>2026</strong><span>MEMBER SINCE</span></div>
        </div>
      </section>
    </main>
  );
}
