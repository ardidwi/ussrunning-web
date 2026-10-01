"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  ["01", "RUNS", "/runs"],
  ["02", "MEMBERSHIP", "/membership"],
  ["03", "STORIES", "/stories"],
  ["04", "PARTNERS", "/partners"],
  ["05", "MY USS", "/login"],
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [distance, setDistance] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateDistance = () => {
      // A playful scroll-distance counter: ~1 km per 1000 px scrolled.
      setDistance(Math.max(0, window.scrollY / 1000));
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(updateDistance);
      }
    };

    updateDistance();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand" aria-label="USS Running home">
            <img src="/uss-logo.png" alt="USS" className="brand-logo" />
          </Link>

          <nav className="header-quick-nav" aria-label="Quick navigation">
            <Link href="/runs">RUNS</Link>
            <Link href="/stories">STORIES</Link>
          </nav>

          <div className="header-actions">
            <Link className="header-login" href="/login">LOG IN</Link>

            <div className="scroll-distance" aria-label="Distance scrolled">
              <span>{distance.toFixed(3)}</span>
              <b>KM</b>
              <i>↓</i>
            </div>

            <button
              className="menu-trigger"
              type="button"
              aria-expanded={open}
              aria-controls="uss-menu"
              onClick={() => setOpen(true)}
            >
              MENU <span>+</span>
            </button>
          </div>
        </div>
      </header>

      <div className={open ? "menu-overlay is-open" : "menu-overlay"} id="uss-menu" aria-hidden={!open}>
        <div className="menu-overlay-top">
          <Link href="/" className="brand" onClick={() => setOpen(false)}>
            <img src="/uss-logo.png" alt="USS" className="brand-logo brand-logo-dark" />
          </Link>

          <button className="menu-close" type="button" onClick={() => setOpen(false)}>
            CLOSE <span>×</span>
          </button>
        </div>

        <div className="menu-overlay-body">
          <span className="menu-eyebrow">USS RUNNING / JAKARTA</span>
          <nav className="menu-list" aria-label="Full navigation">
            {menuItems.map(([number, label, href]) => (
              <Link href={href} key={label} onClick={() => setOpen(false)}>
                <span>{number}</span>
                <strong>{label}</strong>
                <i>↗</i>
              </Link>
            ))}
          </nav>
        </div>

        <div className="menu-overlay-foot">
          <span>RUNNING / COMMUNITY / CULTURE</span>
          <Link href="/membership" onClick={() => setOpen(false)}>JOIN USS — FREE ↗</Link>
        </div>
      </div>
    </>
  );
}
