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
  const [hasScrolled, setHasScrolled] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    const updateDistance = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      // Scroll the full page = 3.100 miles, a playful 5K-inspired website route.
      setDistance(progress * 3.1);
      setHasScrolled(window.scrollY > 72);
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
    window.addEventListener("resize", updateDistance);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateDistance);
      window.removeEventListener("keydown", onKeyDown);
    };
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

            <div className="scroll-distance" aria-label="Miles scrolled through the site">
              <span>{distance.toFixed(3)}</span>
              <b>MI</b>
              <i>↓</i>
            </div>

            <button
              className="menu-trigger"
              type="button"
              aria-expanded={open}
              aria-controls="uss-menu"
              onClick={() => setOpen((value) => !value)}
            >
              MENU <span>+</span>
            </button>
          </div>
        </div>
      </header>

      <div
        className={hasScrolled ? "scroll-distance-float is-visible" : "scroll-distance-float"}
        aria-label="Miles scrolled through the site"
      >
        <span>{distance.toFixed(3)}</span>
        <b>MI</b>
        <i>↓</i>
      </div>

      <aside className={open ? "menu-panel is-open" : "menu-panel"} id="uss-menu" aria-hidden={!open}>
        <div className="menu-panel-head">
          <div>
            <span className="menu-eyebrow">USS RUNNING / JAKARTA</span>
            <b>MENU</b>
          </div>
          <button className="menu-close" type="button" onClick={() => setOpen(false)}>
            CLOSE <span>×</span>
          </button>
        </div>

        <nav className="menu-panel-list" aria-label="Full navigation">
          {menuItems.map(([number, label, href]) => (
            <Link href={href} key={label} onClick={() => setOpen(false)}>
              <span>{number}</span>
              <strong>{label}</strong>
              <i>↗</i>
            </Link>
          ))}
        </nav>

        <div className="menu-panel-foot">
          <span>RUNNING / COMMUNITY / CULTURE</span>
          <Link href="/membership" onClick={() => setOpen(false)}>JOIN USS — FREE ↗</Link>
        </div>
      </aside>
    </>
  );
}
