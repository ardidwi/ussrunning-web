"use client";

import { useState } from "react";
import Link from "next/link";

const tabs = ["Overview","Events","Members","Content","Partners","Membership","Settings"];

export default function AdminPage() {
  const [active, setActive] = useState("Overview");
  const [registration, setRegistration] = useState(true);
  const [hero, setHero] = useState("WE RUN. WE CONNECT. WE MOVE.");

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-logo">USS®<span>CONTROL CENTER</span></Link>
        <nav>
          {tabs.map((tab) => <button key={tab} className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>{tab}</button>)}
        </nav>
        <Link href="/" className="admin-site-link">VIEW WEBSITE ↗</Link>
      </aside>

      <section className="admin-main">
        <div className="admin-topbar">
          <div><span className="admin-eyebrow">CMS PREVIEW</span><h1>{active}</h1></div>
          <div className="admin-user">AD</div>
        </div>

        {active === "Overview" && (
          <>
            <div className="admin-stat-grid">
              <div><span>TOTAL MEMBERS</span><strong>1,284</strong><em>+84 this month</em></div>
              <div><span>UPCOMING RUNS</span><strong>03</strong><em>2 open for RSVP</em></div>
              <div><span>REGISTRATIONS</span><strong>387</strong><em>Across active events</em></div>
              <div><span>CHECK-IN RATE</span><strong>81%</strong><em>Last 5 events</em></div>
            </div>
            <div className="admin-columns">
              <div className="admin-panel">
                <div className="panel-head"><h2>Upcoming events</h2><button onClick={() => setActive("Events")}>MANAGE</button></div>
                {[
                  ["03 OCT","Night Shift","128 / 150"],
                  ["17 OCT","Dawn Patrol","94 / 120"],
                  ["31 OCT","City Relay","0 / 80"]
                ].map(([date,name,count]) => <div className="admin-row" key={name}><b>{date}</b><span>{name}</span><em>{count}</em></div>)}
              </div>
              <div className="admin-panel">
                <div className="panel-head"><h2>Recent activity</h2></div>
                <div className="activity-list">
                  <p><b>12 new members</b><span>joined today</span></p>
                  <p><b>Night Shift</b><span>23 new RSVPs</span></p>
                  <p><b>Story draft</b><span>updated 18 min ago</span></p>
                  <p><b>Partner profile</b><span>added 1 hour ago</span></p>
                </div>
              </div>
            </div>
          </>
        )}

        {active === "Events" && (
          <div className="admin-panel admin-wide">
            <div className="panel-head"><div><span className="admin-eyebrow">EVENT MANAGER</span><h2>Night Shift</h2></div><button className="admin-primary">+ NEW EVENT</button></div>
            <div className="admin-form-grid">
              <label>EVENT NAME<input defaultValue="Night Shift" /></label>
              <label>CAPACITY<input type="number" defaultValue="150" /></label>
              <label>DATE<input defaultValue="03 October 2026" /></label>
              <label>LOCATION<input defaultValue="Blok M, Jakarta" /></label>
              <label className="admin-span-2">SHORT DESCRIPTION<textarea defaultValue="A social community session built around easy movement, good energy and meeting people on the road." /></label>
            </div>
            <div className="switch-row">
              <div><b>Registration status</b><span>Control whether members can RSVP.</span></div>
              <button className={registration ? "switch on" : "switch"} onClick={() => setRegistration(!registration)}><i /></button>
            </div>
            <div className="admin-actions"><button>SAVE DRAFT</button><button className="admin-primary">PUBLISH CHANGES</button></div>
          </div>
        )}

        {active === "Content" && (
          <div className="admin-panel admin-wide">
            <div className="panel-head"><div><span className="admin-eyebrow">HOMEPAGE CMS</span><h2>Hero section</h2></div><button className="admin-primary">SAVE</button></div>
            <label className="content-editor-label">HEADLINE
              <textarea value={hero} onChange={(e) => setHero(e.target.value)} />
            </label>
            <div className="cms-preview">
              <span>LIVE PREVIEW</span>
              <h2>{hero}</h2>
              <p>JAKARTA, INDONESIA · EST. 2024</p>
            </div>
          </div>
        )}

        {!["Overview","Events","Content"].includes(active) && (
          <div className="admin-panel admin-wide placeholder-panel">
            <span className="admin-eyebrow">{active.toUpperCase()} MODULE</span>
            <h2>READY FOR THE NEXT MVP PASS.</h2>
            <p>The navigation and CMS architecture are in place. This module will be connected to the real database after the presentation prototype is approved.</p>
          </div>
        )}
      </section>
    </main>
  );
}
