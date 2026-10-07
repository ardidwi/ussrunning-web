"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

type Point3 = { x: number; y: number; z: number };

type Props = {
  imageUrl: string;
  established?: string | null;
  eyebrow?: string | null;
  headline: string;
  description: string;
  ctaHref?: string | null;
  ctaLabel?: string | null;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function seeded(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function trackPoint(index: number, count: number, time: number): Point3 {
  const lane = index % 6;
  const laneScale = 1 - lane * 0.047;
  const speed = 0.00028 + (lane % 3) * 0.000028;
  const angle = ((index / Math.max(1, count)) * Math.PI * 2 * 7 + time * speed) % (Math.PI * 2);
  return {
    x: Math.cos(angle) * 3.15 * laneScale,
    y: Math.sin(angle) * 1.34 * laneScale,
    z: (lane - 2.5) * 0.13 + Math.sin(angle * 2) * 0.08,
  };
}

function monasTargets(count: number): Point3[] {
  return Array.from({ length: count }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const rndA = seeded(index + 800);
    const rndB = seeded(index + 1600);

    if (t < 0.58) {
      const local = t / 0.58;
      const y = -1.72 + local * 3.25;
      const shaft = 0.14 + (1 - local) * 0.09;
      const angle = rndA * Math.PI * 2;
      return {
        x: 0.95 + Math.cos(angle) * shaft * (0.55 + rndB * 0.65),
        y,
        z: Math.sin(angle) * shaft * 1.25,
      };
    }

    if (t < 0.74) {
      const local = (t - 0.58) / 0.16;
      const angle = rndA * Math.PI * 2;
      const radius = 0.26 + Math.sin(local * Math.PI) * 0.38;
      return {
        x: 0.95 + Math.cos(angle) * radius,
        y: 1.52 + (local - 0.5) * 0.22,
        z: Math.sin(angle) * radius * 0.72,
      };
    }

    if (t < 0.86) {
      const local = (t - 0.74) / 0.12;
      const angle = rndA * Math.PI * 2;
      const radius = 0.12 + Math.sin(local * Math.PI) * 0.2;
      return {
        x: 0.95 + Math.cos(angle) * radius,
        y: 1.68 + local * 0.54,
        z: Math.sin(angle) * radius,
      };
    }

    const local = (t - 0.86) / 0.14;
    const side = index % 2 === 0 ? -1 : 1;
    const spread = 0.45 + rndA * 0.85;
    return {
      x: 0.95 + side * spread,
      y: -1.58 + rndB * 0.22,
      z: (rndA - 0.5) * 0.7,
    };
  });
}

function fallbackLogoTargets(count: number): Point3[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = 1200;
  offscreen.height = 420;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return Array.from({ length: count }, (_, i) => trackPoint(i, count, 0));
  ctx.fillStyle = "#fff";
  ctx.font = "900 300px Arial Black, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("USS", 600, 210);
  return sampleCanvas(offscreen, count, 7);
}

function sampleCanvas(canvas: HTMLCanvasElement, count: number, step = 5): Point3[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (data[(y * canvas.width + x) * 4 + 3] > 80) candidates.push({ x, y });
    }
  }
  if (!candidates.length) return [];
  return Array.from({ length: count }, (_, index) => {
    const point = candidates[Math.floor(seeded(index + 2200) * candidates.length)];
    return {
      x: ((point.x / canvas.width) - 0.5) * 6.5,
      y: (0.5 - point.y / canvas.height) * 2.6,
      z: ((index % 9) / 8 - 0.5) * 0.55 + (seeded(index + 2300) - 0.5) * 0.09,
    };
  });
}

function loadLogoTargets(count: number): Promise<Point3[]> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = "/uss-logo.png";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 440;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(fallbackLogoTargets(count));
      const ratio = Math.min(980 / image.width, 330 / image.height);
      const width = image.width * ratio;
      const height = image.height * ratio;
      ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
      const sampled = sampleCanvas(canvas, count, 5);
      resolve(sampled.length ? sampled : fallbackLogoTargets(count));
    };
    image.onerror = () => resolve(fallbackLogoTargets(count));
  });
}

function rotatePoint(point: Point3, yaw: number, pitch: number): Point3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = point.x * cy + point.z * sy;
  const z1 = -point.x * sy + point.z * cy;
  return {
    x: x1,
    y: point.y * cp - z1 * sp,
    z: point.y * sp + z1 * cp,
  };
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
      kicker: eyebrow || "RUNNING TRACK / JAKARTA",
      headline,
      description,
      action: ctaLabel || "EXPLORE RUNS",
      href: ctaHref || "/runs",
    },
    {
      kicker: "TRACK / PEOPLE / PACE",
      headline: "THE PEOPLE.\nTHE CITY.\nTHE MILES.",
      description: "The track stays alive. The pack keeps moving, reacting and finding its line again.",
      action: "OUR STORY",
      href: "/about",
    },
    {
      kicker: "JAKARTA / CITY IN MOTION",
      headline: "BUILT IN\nJAKARTA.\nMADE TO\nMOVE.",
      description: "The running track evolves into Jakarta with Monas at its core. The city breathes, moves and pushes forward together.",
      action: "SEE THE RUNS",
      href: "/runs",
    },
    {
      kicker: "USS / COMMUNITY IN MOTION",
      headline: "ONE CREW.\nONE MARK.\nKEEP MOVING.",
      description: "The city resolves into the USS mark. The particles keep breathing, orbiting and responding in motion.",
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
    let width = 1;
    let height = 1;
    let dpr = 1;
    let particleCount = 1200;
    let monas: Point3[] = [];
    let logo: Point3[] = [];
    let frame = 0;
    let latestProgress = 0;
    let loadToken = 0;

    const pointer = { x: 0, y: 0, nx: 0, ny: 0, active: false, smoothX: 0, smoothY: 0 };
    const clickPulse = { x: 0, y: 0, startedAt: -10000 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particleCount = width < 760 ? 620 : 1750;
      monas = monasTargets(particleCount);
      logo = fallbackLogoTargets(particleCount);
      const token = ++loadToken;
      loadLogoTargets(particleCount).then((points) => {
        if (token === loadToken && points.length) logo = points;
      });
    };

    const updateProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, section.offsetHeight - window.innerHeight);
      const travelled = clamp(-rect.top, 0, total);
      latestProgress = travelled / total;
      setProgress(latestProgress);
      setActiveChapter(Math.min(3, Math.floor(latestProgress * 3.999)));
      setStoryActive(rect.top <= 4 && rect.bottom >= window.innerHeight * 0.5);
    };

    const shapePoint = (shape: number, index: number, time: number) => {
      if (shape <= 1) return trackPoint(index, particleCount, reduceMotion ? 0 : time);
      if (shape === 2) return monas[index];
      return logo[index] || fallbackLogoTargets(particleCount)[index];
    };

    const drawOrbit = (time: number, strength: number) => {
      if (strength <= 0.02) return;
      const centerX = width < 760 ? width * 0.53 : width * 0.73;
      const centerY = height * 0.53;
      const base = Math.min(width, height) * 0.24;
      context.save();
      context.lineWidth = 1;
      for (let orbit = 0; orbit < 4; orbit += 1) {
        const phase = time * (0.00007 + orbit * 0.000012);
        context.beginPath();
        context.ellipse(centerX, centerY, base * (1.4 + orbit * 0.18), base * (0.45 + orbit * 0.055), phase + orbit * 0.5, 0, Math.PI * 2);
        context.strokeStyle = orbit % 2 === 0
          ? `rgba(255,59,33,${0.18 * strength})`
          : `rgba(243,240,232,${0.12 * strength})`;
        context.stroke();
      }
      context.restore();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (!monas.length || !logo.length) {
        frame = requestAnimationFrame(draw);
        return;
      }

      pointer.smoothX += (pointer.nx - pointer.smoothX) * 0.055;
      pointer.smoothY += (pointer.ny - pointer.smoothY) * 0.055;

      const step = latestProgress * 3;
      const fromIndex = Math.min(2, Math.floor(step));
      const toIndex = Math.min(3, fromIndex + 1);
      const rawMix = clamp(step - fromIndex);
      const mix = rawMix * rawMix * (3 - 2 * rawMix);
      const sceneStrength = clamp((latestProgress - 0.45) / 0.25);
      drawOrbit(time, sceneStrength);

      const yaw = (reduceMotion ? 0 : Math.sin(time * 0.00012) * 0.055) + pointer.smoothX * 0.2;
      const pitch = -0.08 + pointer.smoothY * 0.14;
      const centerX = width < 760 ? width * 0.52 : width * 0.73;
      const centerY = height * 0.53;
      const baseScale = Math.min(width, height) * (width < 760 ? 0.14 : 0.165);
      const camera = 7.5;
      const pulseAge = (time - clickPulse.startedAt) / 1000;

      for (let index = 0; index < particleCount; index += 1) {
        const a = shapePoint(fromIndex, index, time);
        const b = shapePoint(toIndex, index, time);
        let point: Point3 = {
          x: a.x + (b.x - a.x) * mix,
          y: a.y + (b.y - a.y) * mix,
          z: a.z + (b.z - a.z) * mix,
        };

        if (!reduceMotion) {
          point.z += Math.sin(time * 0.001 + index * 0.17) * 0.035;
          point.y += Math.cos(time * 0.0008 + index * 0.11) * 0.017;
        }

        point = rotatePoint(point, yaw, pitch);
        const perspective = camera / Math.max(2.2, camera - point.z);
        let sx = centerX + point.x * baseScale * perspective;
        let sy = centerY - point.y * baseScale * perspective;

        if (pointer.active && !reduceMotion) {
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = width < 760 ? 90 : 150;
          if (dist < radius) {
            const force = 1 - dist / radius;
            sx += (dx / dist) * force * force * 38;
            sy += (dy / dist) * force * force * 38;
          }
        }

        if (pulseAge >= 0 && pulseAge < 1.2 && !reduceMotion) {
          const dx = sx - clickPulse.x;
          const dy = sy - clickPulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.7;
          const delta = Math.abs(dist - wave);
          if (delta < 88) {
            const strength = (1 - delta / 88) * (1 - pulseAge / 1.2) * 46;
            sx += (dx / dist) * strength;
            sy += (dy / dist) * strength;
          }
        }

        const accent = index % 29 === 0 || (fromIndex === 2 && index < particleCount * 0.86 && index % 7 === 0);
        const alpha = accent ? 0.98 : 0.42 + clamp((point.z + 2.2) / 4.4) * 0.5;
        const radius = accent ? 2.1 : 0.7 + perspective * 0.95;
        context.beginPath();
        context.arc(sx, sy, radius, 0, Math.PI * 2);
        context.fillStyle = accent ? `rgba(255,59,33,${alpha})` : `rgba(246,244,238,${alpha})`;
        context.fill();
      }

      frame = requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
      pointer.active = inside;
      if (!inside) return;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.nx = clamp((pointer.x / width - 0.5) * 2, -1, 1);
      pointer.ny = clamp((pointer.y / height - 0.5) * 2, -1, 1);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a,button,input,label")) return;
      const rect = canvas.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      clickPulse.x = event.clientX - rect.left;
      clickPulse.y = event.clientY - rect.top;
      clickPulse.startedAt = performance.now();
    };

    resize();
    updateProgress();
    frame = requestAnimationFrame(draw);
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  const meters = Math.round(progress * 5000);
  const hud = activeChapter === 2
    ? ["JAKARTA", "6.1754° S", "106.8272° E"]
    : activeChapter === 3
      ? ["USS RUNNING", "ONE CREW", "JAKARTA"]
      : ["PEOPLE", "ROUTES", "CULTURE"];

  return (
    <section ref={sectionRef} className="uss-motion-story" aria-label="USS Running introduction">
      <SiteHeader />

      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true"><img src={imageUrl} alt="" /></div>
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div className="uss-motion-hud" aria-hidden="true">
          <span>{hud[0]}</span><span>{hud[1]}</span><span>{hud[2]}</span>
        </div>
        <div className="uss-motion-est">{established || "EST. 2024"}</div>
      </div>

      <div className="uss-motion-chapters">
        {chapters.map((chapter, index) => (
          <article className={`uss-motion-chapter ${activeChapter === index ? "is-active" : ""}`} key={chapter.kicker}>
            <div className="uss-motion-copy">
              <span className="uss-motion-kicker"><b>{String(index + 1).padStart(2, "0")}</b><i />{chapter.kicker}</span>
              <h1 style={{ whiteSpace: "pre-line" }}>{chapter.headline}</h1>
              <p>{chapter.description}</p>
              <Link href={chapter.href}>{chapter.action} ↗</Link>
            </div>
          </article>
        ))}
      </div>

      <nav className={`uss-motion-scrubber ${storyActive ? "is-on" : ""}`} aria-label="USS introduction progress">
        <span className="uss-motion-distance">{String(meters).padStart(4, "0")} M</span>
        <div className="uss-motion-track" aria-hidden="true">
          <span className="uss-motion-fill" style={{ transform: `scaleX(${progress})` }} />
          <span className="uss-motion-head" style={{ left: `${progress * 100}%` }} />
          {[0, 1, 2, 3].map((item) => <i key={item} style={{ left: `${(item / 3) * 100}%` }} />)}
        </div>
        <a href="#uss-next-runs">SKIP TO RUNS →</a>
      </nav>
    </section>
  );
}
