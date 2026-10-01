"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  ["01", "RUNS", "/runs"],
  ["02", "ABOUT", "/about"],
  ["03", "MEMBERSHIP", "/membership"],
  ["04", "STORIES", "/stories"],
  ["05", "PARTNERS", "/partners"],
  ["06", "MY USS", "/login"],
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [meters, setMeters] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const updateDistance = () => {
      const maxScroll = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight
      );
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      setMeters(Math.round(progress * 5000));
      ticking.current = false;
    };

    const onScroll = () => {
      setOpen(false);

      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(updateDistance);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateDistance);
    updateDistance();

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
            <Link href="/about">ABOUT</Link>
          </nav>

          <div className="header-actions">
            <Link className="header-login" href="/login">LOG IN</Link>

            <div className="scroll-distance" aria-label="Website route distance">
              <span>{String(meters).padStart(4, "0")}</span>
              <b>M</b>
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

      <button
        className={open ? "menu-dismiss is-open" : "menu-dismiss"}
        type="button"
        aria-label="Close menu"
        onClick={() => setOpen(false)}
      />

      <aside className={open ? "menu-panel is-open" : "menu-panel"} id="uss-menu" aria-hidden={!open}>
        <div className="menu-panel-head">
          <div>
            <span className="menu-eyebrow">USS RUNNING / JAKARTA</span>
            <b>EXPLORE</b>
          </div>
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
          <Link href="/membership" onClick={() => setOpen(false)}>JOIN FREE ↗</Link>
        </div>
      </aside>
    </>
  );
}
