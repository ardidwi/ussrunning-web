"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const navItems = [
  ["RUNS", "/runs"],
  ["ABOUT", "/about"],
  ["MEMBERSHIP", "/membership"],
  ["STORIES", "/stories"],
  ["PARTNERS", "/partners"],
  ["MY USS", "/login"],
];

export default function SiteHeader() {
  const [meters, setMeters] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
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
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(updateDistance);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateDistance);
    updateDistance();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateDistance);
    };
  }, []);

  return (
    <header className="site-header">
      <div className="site-header-inner site-header-all-nav">
        <Link href="/" className="brand" aria-label="USS Running home">
          <img src="/uss-logo.png" alt="USS" className="brand-logo" />
        </Link>

        <nav className="header-main-nav" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <Link href={href} key={label}>{label}</Link>
          ))}
        </nav>

        <div className="header-actions header-actions-meter-only">
          <div className="scroll-distance" aria-label="Website route distance">
            <span>{String(meters).padStart(4, "0")}</span>
            <b>M</b>
            <i>↓</i>
          </div>
        </div>
      </div>
    </header>
  );
}
