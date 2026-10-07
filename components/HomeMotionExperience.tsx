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

function runningTrackPoint(
  width: number,
  height: number,
  index: number,
  count: number,
  time = 0
): Point {
  const mobile = width < 760;
  const cx = width * (mobile ? 0.52 : 0.73);
  const cy = height * 0.51;
  const rx = Math.min(width * (mobile ? 0.34 : 0.19), 330);
  const ry = Math.min(height * (mobile ? 0.19 : 0.23), 195);
  const lane = index % 4;
  const laneX = lane * (mobile ? 8 : 13);
  const laneY = lane * (mobile ? 5 : 9);
  const baseAngle = ((index / Math.max(1, count)) * Math.PI * 2 * 5.5) % (Math.PI * 2);
  const speed = time * (0.0002 + (lane % 2) * 0.000035);
  const angle = baseAngle + speed;
  const jitter = (seeded(index + 2100) - 0.5) * (mobile ? 5 : 8);

  return {
    x: cx + Math.cos(angle) * (rx - laneX) + jitter,
    y: cy + Math.sin(angle) * (ry - laneY) + jitter * 0.55,
  };
}

function runningTrackTargets(width: number, height: number, count: number): Point[] {
  return Array.from({ length: count }, (_, index) =>
    runningTrackPoint(width, height, index, count, 0)
  );
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
  const reticleRef = useRef<HTMLDivElement | null>(null);
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
    let particleCount = 0;
    const pointer = { x: 0, y: 0, active: false };
    const clickPulse = { x: 0, y: 0, startedAt: -10000 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      particleCount = width < 760 ? 320 : 820;
      shapes = [
        cloudTargets(width, height, particleCount),
        runningTrackTargets(width, height, particleCount),
        cityTargets(width, height, particleCount),
        textTargets(width, height, particleCount),
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
      const red = "255,59,33";
      const white = "243,240,232";
      const idleTime = reduceMotion ? 0 : time;
      const pulseAge = (time - clickPulse.startedAt) / 1000;

      for (let index = 0; index < particleCount; index += 1) {
        const staticFrom = shapes[fromIndex][index];
        const staticTo = shapes[toIndex][index];
        const a = fromIndex === 1
          ? runningTrackPoint(width, height, index, particleCount, idleTime)
          : staticFrom;
        const b = toIndex === 1
          ? runningTrackPoint(width, height, index, particleCount, idleTime)
          : staticTo;

        let x = a.x + (b.x - a.x) * mix;
        let y = a.y + (b.y - a.y) * mix;

        // Always-on micro motion so the field never freezes when scrolling stops.
        if (!reduceMotion) {
          x += Math.sin(time * 0.00125 + index * 0.37) * (0.8 + seeded(index + 6000) * 1.9);
          y += Math.cos(time * 0.00105 + index * 0.29) * (0.7 + seeded(index + 6100) * 1.6);
        }

        // Cursor interaction: nearby particles orbit/repel around the pointer.
        if (pointer.active && !reduceMotion) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = width < 760 ? 90 : 165;
          if (dist < radius) {
            const force = 1 - dist / radius;
            const nx = dx / dist;
            const ny = dy / dist;
            const repel = force * force * 30;
            const swirl = force * 13;
            x += nx * repel - ny * swirl;
            y += ny * repel + nx * swirl;
          }
        }

        // Click creates a temporary ripple, then particles automatically reform.
        if (pulseAge >= 0 && pulseAge < 1.05 && !reduceMotion) {
          const dx = x - clickPulse.x;
          const dy = y - clickPulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.78;
          const delta = Math.abs(dist - wave);
          if (delta < 85) {
            const strength = (1 - delta / 85) * (1 - pulseAge / 1.05) * 36;
            x += (dx / dist) * strength;
            y += (dy / dist) * strength;
          }
        }

        const highlight = index % 19 === 0;
        const alpha = highlight ? 0.96 : 0.4 + seeded(index + 5000) * 0.46;
        const radius = highlight ? 1.95 : 0.75 + seeded(index + 5100) * 1.22;

        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${highlight ? red : white},${alpha})`;
        context.fill();
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      pointer.active = inside;
      if (!inside) return;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;

      if (reticleRef.current) {
        reticleRef.current.style.left = `${pointer.x}px`;
        reticleRef.current.style.top = `${pointer.y}px`;
      }
    };

    const onPointerLeave = () => {
      pointer.active = false;
      if (reticleRef.current) {
        reticleRef.current.style.removeProperty("left");
        reticleRef.current.style.removeProperty("top");
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a,button,input,label")) return;
      const rect = canvas.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!inside) return;

      clickPulse.x = event.clientX - rect.left;
      clickPulse.y = event.clientY - rect.top;
      clickPulse.startedAt = performance.now();
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
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("click", onClick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  const meters = Math.round(progress * 5000);

  return (
    <section ref={sectionRef} className="uss-motion-story" aria-label="USS Running introduction">
      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true">
          <img src={imageUrl} alt="" />
        </div>
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div ref={reticleRef} className="uss-motion-reticle" aria-hidden="true">
          <i /><i /><i /><i />
          <span>MOVE / CLICK</span>
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
