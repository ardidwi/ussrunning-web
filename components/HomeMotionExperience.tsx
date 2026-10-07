"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Point = { x: number; y: number };

type Props = {
  imageUrl: string;
  established?: string | null;
  eyebrow?: string | null;
  headline: string;
  description: string;
  ctaHref?: string | null;
  ctaLabel?: string | null;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function seeded(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function cloudTargets(width: number, height: number, count: number): Point[] {
  const cx = width * (width < 760 ? 0.56 : 0.73);
  const cy = height * 0.52;
  const rx = Math.min(width * 0.23, 350);
  const ry = Math.min(height * 0.28, 245);

  return Array.from({ length: count }, (_, index) => {
    const angle = seeded(index + 1) * Math.PI * 2;
    const radius = Math.sqrt(seeded(index + 900));
    return {
      x: cx + Math.cos(angle) * rx * radius,
      y: cy + Math.sin(angle) * ry * radius,
    };
  });
}

function routeTargets(width: number, height: number, count: number): Point[] {
  const left = width * (width < 760 ? 0.14 : 0.54);
  const span = width * (width < 760 ? 0.72 : 0.37);
  const centerY = height * 0.5;

  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const wave =
      Math.sin(t * Math.PI * 2.25) * height * 0.17 +
      Math.sin(t * Math.PI * 5.2) * height * 0.045;
    const jitter = (seeded(index + 2100) - 0.5) * 34;
    return {
      x: left + span * t + jitter,
      y: centerY + wave + (seeded(index + 2600) - 0.5) * 28,
    };
  });
}

function cityTargets(width: number, height: number, count: number): Point[] {
  const x0 = width * (width < 760 ? 0.14 : 0.55);
  const x1 = width * 0.92;
  const y0 = height * 0.2;
  const y1 = height * 0.8;
  const cols = 7;
  const rows = 7;

  return Array.from({ length: count }, (_, index) => {
    const horizontal = seeded(index + 3200) > 0.5;
    if (horizontal) {
      const row = Math.floor(seeded(index + 3300) * rows);
      return {
        x: x0 + seeded(index + 3400) * (x1 - x0),
        y: y0 + (row / Math.max(1, rows - 1)) * (y1 - y0),
      };
    }

    const col = Math.floor(seeded(index + 3500) * cols);
    return {
      x: x0 + (col / Math.max(1, cols - 1)) * (x1 - x0),
      y: y0 + seeded(index + 3600) * (y1 - y0),
    };
  });
}

function textTargets(width: number, height: number, count: number): Point[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = Math.max(320, Math.floor(width));
  offscreen.height = Math.max(220, Math.floor(height));
  const ctx = offscreen.getContext("2d");
  if (!ctx) return cloudTargets(width, height, count);

  const mobile = width < 760;
  const fontSize = Math.max(120, Math.min(mobile ? width * 0.34 : width * 0.16, 250));
  const centerX = width * (mobile ? 0.52 : 0.73);
  const centerY = height * 0.52;

  ctx.clearRect(0, 0, offscreen.width, offscreen.height);
  ctx.fillStyle = "#fff";
  ctx.font = `900 ${fontSize}px Impact, Haettenschweiler, Arial Black, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("USS", centerX, centerY);

  const image = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const candidates: Point[] = [];
  const step = mobile ? 6 : 7;

  for (let y = 0; y < offscreen.height; y += step) {
    for (let x = 0; x < offscreen.width; x += step) {
      const alpha = image[(y * offscreen.width + x) * 4 + 3];
      if (alpha > 100) candidates.push({ x, y });
    }
  }

  if (!candidates.length) return cloudTargets(width, height, count);

  return Array.from({ length: count }, (_, index) => {
    const pick = candidates[Math.floor(seeded(index + 4200) * candidates.length)];
    return {
      x: pick.x + (seeded(index + 4300) - 0.5) * 4,
      y: pick.y + (seeded(index + 4400) - 0.5) * 4,
    };
  });
}

export default function HomeMotionExperience({
  imageUrl,
  established,
  eyebrow,
  headline,
  description,
  ctaHref,
  ctaLabel,
}: Props) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [storyActive, setStoryActive] = useState(true);

  const chapters = [
    {
      kicker: eyebrow || "JAKARTA, INDONESIA",
      headline,
      description,
      action: ctaLabel || "EXPLORE RUNS",
      href: ctaHref || "/runs",
    },
    {
      kicker: "PEOPLE / CITY / MILES",
      headline: "THE PEOPLE.\nTHE CITY.\nTHE MILES.",
      description:
        "Running is the entry point. What keeps USS moving is the people, the city and everything that happens around the run.",
      action: "OUR STORY",
      href: "/about",
    },
    {
      kicker: "JAKARTA / COMMUNITY ROUTES",
      headline: "BUILT IN JAKARTA.\nMADE TO MOVE.",
      description:
        "From weekday miles to race-week moments, USS is built around shared routes, shared energy and showing up together.",
      action: "SEE THE RUNS",
      href: "/runs",
    },
    {
      kicker: "USS / COMMUNITY IN MOTION",
      headline: "FIND YOUR PEOPLE.\nKEEP MOVING.",
      description:
        "One community ID. No paid tier. Come for the run, stay for the people and build your USS history as you keep showing up.",
      action: "JOIN USS",
      href: "/membership",
    },
  ];

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let shapes: Point[][] = [];
    let frame = 0;
    let latestProgress = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = width < 760 ? 260 : 640;
      shapes = [
        cloudTargets(width, height, count),
        routeTargets(width, height, count),
        cityTargets(width, height, count),
        textTargets(width, height, count),
      ];
    };

    const updateProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, section.offsetHeight - window.innerHeight);
      const travelled = clamp(-rect.top, 0, total);
      latestProgress = reduceMotion ? 1 : travelled / total;
      setProgress(latestProgress);
      setActiveChapter(Math.min(3, Math.round(latestProgress * 3)));
      setStoryActive(rect.top <= 4 && rect.bottom >= window.innerHeight * 0.42);
    };

    const draw = (time: number) => {
      if (!shapes.length) return;
      context.clearRect(0, 0, width, height);

      const step = latestProgress * (shapes.length - 1);
      const fromIndex = Math.min(shapes.length - 2, Math.floor(step));
      const toIndex = fromIndex + 1;
      const mix = clamp(step - fromIndex);
      const from = shapes[fromIndex];
      const to = shapes[toIndex];

      const red = "255,59,33";
      const white = "243,240,232";
      const drift = reduceMotion ? 0 : time * 0.00045;

      for (let index = 0; index < from.length; index += 1) {
        const a = from[index];
        const b = to[index];
        const pulse = Math.sin(drift * 7 + index * 0.21) * 1.2;
        const x = a.x + (b.x - a.x) * mix + pulse;
        const y = a.y + (b.y - a.y) * mix + Math.cos(drift * 6 + index) * 0.9;
        const highlight = index % 17 === 0 && latestProgress > 0.08;
        const alpha = highlight ? 0.95 : 0.42 + seeded(index + 5000) * 0.42;
        const radius = highlight ? 1.8 : 0.75 + seeded(index + 5100) * 1.15;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${highlight ? red : white},${alpha})`;
        context.fill();
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onScroll = () => updateProgress();
    const onResize = () => {
      resize();
      updateProgress();
    };

    resize();
    updateProgress();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const meters = Math.round(progress * 1200);

  return (
    <section ref={sectionRef} className="uss-motion-story" aria-label="USS Running introduction">
      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true">
          <img src={imageUrl} alt="" />
        </div>
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div className="uss-motion-reticle" aria-hidden="true">
          <i /><i /><i /><i />
          <span>GPS / USS</span>
        </div>
        <div className="uss-motion-est">{established || "EST. 2024"}</div>
        <SiteHeader />
      </div>

      <div className="uss-motion-chapters">
        {chapters.map((chapter, index) => (
          <article
            className={`uss-motion-chapter ${activeChapter === index ? "is-active" : ""}`}
            key={chapter.kicker}
          >
            <div className="uss-motion-copy">
              <span className="uss-motion-kicker">
                <b>{String(index + 1).padStart(2, "0")}</b>
                {chapter.kicker}
              </span>
              <h1 style={{ whiteSpace: "pre-line" }}>{chapter.headline}</h1>
              <p>{chapter.description}</p>
              <Link href={chapter.href}>{chapter.action} ↗</Link>
            </div>
          </article>
        ))}
      </div>

      <nav className={`uss-motion-scrubber ${storyActive ? "is-on" : ""}`} aria-label="USS introduction progress">
        <span className="uss-motion-distance">{String(meters).padStart(4, "0")} M</span>
        <span className="uss-motion-scrub-label">{chapters[activeChapter]?.kicker}</span>
        <div className="uss-motion-track" aria-hidden="true">
          <span className="uss-motion-fill" style={{ transform: `scaleX(${progress})` }} />
          <span className="uss-motion-head" style={{ left: `${progress * 100}%` }} />
          {[0, 1, 2, 3].map((item) => (
            <i key={item} style={{ left: `${(item / 3) * 100}%` }} />
          ))}
        </div>
        <a href="#uss-next-runs">SKIP TO RUNS</a>
      </nav>
    </section>
  );
}
