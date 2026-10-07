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
  const lane = index % 7;
  const laneScale = 1 - lane * 0.042;
  const speed = 0.00025 + (lane % 3) * 0.00003;
  const angle = ((index / Math.max(1, count)) * Math.PI * 2 * 8 + time * speed) % (Math.PI * 2);
  return {
    x: Math.cos(angle) * 3.2 * laneScale,
    y: Math.sin(angle) * 1.33 * laneScale,
    z: (lane - 3) * 0.11 + Math.sin(angle * 2) * 0.055,
  };
}

function sampleImageTargets(
  url: string,
  count: number,
  canvasWidth: number,
  canvasHeight: number,
  maxWidth: number,
  maxHeight: number,
  scaleX: number,
  scaleY: number,
  centerX = 0,
  centerY = 0,
  step = 4
): Promise<Point3[]> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = url;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve([]);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
      const drawWidth = image.width * ratio;
      const drawHeight = image.height * ratio;
      ctx.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const candidates: Array<{ x: number; y: number }> = [];

      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const offset = (y * canvas.width + x) * 4;
          const alpha = data[offset + 3];
          const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
          if (alpha > 45 && luminance > 150) candidates.push({ x, y });
        }
      }

      if (!candidates.length) return resolve([]);

      resolve(
        Array.from({ length: count }, (_, index) => {
          const point = candidates[Math.floor(seeded(index + 2200) * candidates.length)];
          return {
            x: centerX + ((point.x / canvas.width) - 0.5) * scaleX,
            y: centerY + (0.5 - point.y / canvas.height) * scaleY,
            z: ((index % 9) / 8 - 0.5) * 0.36 + (seeded(index + 2300) - 0.5) * 0.06,
          };
        })
      );
    };
    image.onerror = () => resolve([]);
  });
}

function fallbackLogoTargets(count: number): Point3[] {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 380;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Array.from({ length: count }, (_, i) => trackPoint(i, count, 0));
  ctx.fillStyle = "#fff";
  ctx.font = "900 280px Arial Black, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("USS", 550, 190);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < canvas.height; y += 5) {
    for (let x = 0; x < canvas.width; x += 5) {
      if (data[(y * canvas.width + x) * 4 + 3] > 80) candidates.push({ x, y });
    }
  }
  return Array.from({ length: count }, (_, index) => {
    const point = candidates[Math.floor(seeded(index + 1200) * candidates.length)];
    return {
      x: ((point.x / canvas.width) - 0.5) * 6.1 + 0.25,
      y: (0.5 - point.y / canvas.height) * 2.2,
      z: ((index % 7) / 6 - 0.5) * 0.3,
    };
  });
}

function rotatePoint(point: Point3, yaw: number, pitch: number): Point3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = point.x * cy + point.z * sy;
  const z1 = -point.x * sy + point.z * cy;
  return { x: x1, y: point.y * cp - z1 * sp, z: point.y * sp + z1 * cp };
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
      description: "The running track evolves into a Jakarta city field, with Monas at its core. The city breathes, moves, and pushes forward together.",
      action: "SEE THE RUNS",
      href: "/runs",
    },
    {
      kicker: "USS / COMMUNITY IN MOTION",
      headline: "ONE CREW.\nONE MARK.\nKEEP MOVING.",
      description: "The city resolves into the USS mark. The particles keep breathing, orbiting, and responding in motion.",
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
    let particleCount = 2200;
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

      particleCount = width < 760 ? 760 : 3000;
      const token = ++loadToken;
      monas = [];
      logo = fallbackLogoTargets(particleCount);

      Promise.all([
        sampleImageTargets("/monas-mask.svg", particleCount, 600, 900, 520, 830, 2.45, 4.5, 0.45, 0, 4),
        sampleImageTargets("/uss-logo.png", particleCount, 1200, 440, 1020, 340, 6.1, 2.2, 0.25, 0, 4),
      ]).then(([monasPoints, logoPoints]) => {
        if (token !== loadToken) return;
        if (monasPoints.length) monas = monasPoints;
        if (logoPoints.length) logo = logoPoints;
      });
    };

    const updateProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, section.offsetHeight - window.innerHeight);
      latestProgress = clamp(-rect.top, 0, total) / total;
      setProgress(latestProgress);
      setActiveChapter(Math.min(3, Math.floor(latestProgress * 3.999)));
      setStoryActive(rect.top <= 4 && rect.bottom >= window.innerHeight * 0.5);
    };

    const shapePoint = (shape: number, index: number, time: number): Point3 => {
      if (shape <= 1) return trackPoint(index, particleCount, reduceMotion ? 0 : time);
      if (shape === 2) return monas[index] || trackPoint(index, particleCount, 0);
      return logo[index] || fallbackLogoTargets(particleCount)[index];
    };

    const drawOrbit = (time: number, centerX: number, centerY: number, strength: number, scene: number) => {
      if (strength <= 0.02) return;
      const base = Math.min(width, height) * (scene === 3 ? 0.31 : 0.27);
      context.save();
      context.lineWidth = 0.8;
      for (let orbit = 0; orbit < 5; orbit += 1) {
        const phase = time * (0.000045 + orbit * 0.000007) + orbit * 0.62;
        const rx = base * (1.15 + orbit * 0.16);
        const ry = base * (0.32 + orbit * 0.055);
        context.beginPath();
        context.ellipse(centerX, centerY, rx, ry, phase, 0, Math.PI * 2);
        context.strokeStyle = orbit % 2 === 0
          ? `rgba(255,45,24,${0.34 * strength})`
          : `rgba(245,243,238,${0.26 * strength})`;
        context.stroke();

        const nodeAngle = phase * 2.6 + orbit * 0.8;
        const nodeX = centerX + Math.cos(nodeAngle) * rx;
        const nodeY = centerY + Math.sin(nodeAngle) * ry;
        context.beginPath();
        context.arc(nodeX, nodeY, orbit % 2 === 0 ? 3 : 2.1, 0, Math.PI * 2);
        context.fillStyle = orbit % 2 === 0
          ? `rgba(255,45,24,${0.86 * strength})`
          : `rgba(255,255,255,${0.8 * strength})`;
        context.fill();
      }
      context.restore();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (!logo.length) {
        frame = requestAnimationFrame(draw);
        return;
      }

      pointer.smoothX += (pointer.nx - pointer.smoothX) * 0.05;
      pointer.smoothY += (pointer.ny - pointer.smoothY) * 0.05;

      const step = latestProgress * 3;
      const fromIndex = Math.min(2, Math.floor(step));
      const toIndex = Math.min(3, fromIndex + 1);
      const rawMix = clamp(step - fromIndex);
      const mix = rawMix * rawMix * (3 - 2 * rawMix);
      const scene = latestProgress >= 0.72 ? 3 : latestProgress >= 0.48 ? 2 : 1;

      const centerX = width < 760 ? width * 0.54 : scene === 2 ? width * 0.72 : scene === 3 ? width * 0.73 : width * 0.7;
      const centerY = scene === 2 ? height * 0.52 : height * 0.53;
      const yawStrength = scene >= 2 ? 0.42 : 1;
      const yaw = ((reduceMotion ? 0 : Math.sin(time * 0.0001) * 0.04) + pointer.smoothX * 0.16) * yawStrength;
      const pitch = (-0.045 + pointer.smoothY * 0.08) * yawStrength;
      const baseScale = Math.min(width, height) * (width < 760 ? 0.14 : scene === 2 ? 0.19 : scene === 3 ? 0.185 : 0.155);
      const camera = 7.8;
      const pulseAge = (time - clickPulse.startedAt) / 1000;

      drawOrbit(time, centerX, centerY, clamp((latestProgress - 0.44) / 0.18), scene);

      context.save();
      context.globalCompositeOperation = "lighter";

      for (let index = 0; index < particleCount; index += 1) {
        const a = shapePoint(fromIndex, index, time);
        const b = shapePoint(toIndex, index, time);
        let point: Point3 = {
          x: a.x + (b.x - a.x) * mix,
          y: a.y + (b.y - a.y) * mix,
          z: a.z + (b.z - a.z) * mix,
        };

        if (!reduceMotion) {
          const breathe = scene === 3 ? 0.01 : 0.018;
          point.z += Math.sin(time * 0.001 + index * 0.17) * breathe;
          point.y += Math.cos(time * 0.00082 + index * 0.11) * breathe * 0.55;
        }

        point = rotatePoint(point, yaw, pitch);
        const perspective = camera / Math.max(2.3, camera - point.z);
        let sx = centerX + point.x * baseScale * perspective;
        let sy = centerY - point.y * baseScale * perspective;

        if (pointer.active && !reduceMotion) {
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = width < 760 ? 90 : 145;
          if (dist < radius) {
            const force = 1 - dist / radius;
            sx += (dx / dist) * force * force * 34;
            sy += (dy / dist) * force * force * 34;
          }
        }

        if (pulseAge >= 0 && pulseAge < 1.15 && !reduceMotion) {
          const dx = sx - clickPulse.x;
          const dy = sy - clickPulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.68;
          const delta = Math.abs(dist - wave);
          if (delta < 88) {
            const strength = (1 - delta / 88) * (1 - pulseAge / 1.15) * 42;
            sx += (dx / dist) * strength;
            sy += (dy / dist) * strength;
          }
        }

        const accent = scene >= 2 && (index % (scene === 3 ? 37 : 29) === 0);
        const alpha = accent ? 0.98 : scene === 3 ? 0.78 : 0.5 + clamp((point.z + 2.2) / 4.4) * 0.42;
        const radius = accent ? 2.15 : scene === 3 ? 0.82 + perspective * 0.9 : 0.66 + perspective * 0.88;

        context.beginPath();
        context.arc(sx, sy, radius, 0, Math.PI * 2);
        context.fillStyle = accent ? `rgba(255,45,24,${alpha})` : `rgba(248,247,242,${alpha})`;
        context.fill();
      }

      context.restore();
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
    ? ["JAKARTA", "6.1754° S", "106.8272° E", "PEOPLE", "ROUTES", "CULTURE"]
    : activeChapter === 3
      ? ["USS RUNNING", "ONE CREW", "JAKARTA"]
      : ["PEOPLE", "ROUTES", "CULTURE"];

  return (
    <section ref={sectionRef} className={`uss-motion-story is-chapter-${activeChapter + 1}`} data-chapter={activeChapter + 1} aria-label="USS Running introduction">
      <SiteHeader />

      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true"><img src={imageUrl} alt="" /></div>
        <div className="uss-motion-monas-photo" aria-hidden="true"><img src="/monas-mask.svg" alt="" /></div>
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div className="uss-motion-hud" aria-hidden="true">{hud.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="uss-motion-est" aria-hidden="true">{established || "EST. 2024"}</div>
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
        <div className="uss-motion-track" aria-hidden="true">
          <span className="uss-motion-fill" style={{ transform: `scaleX(${progress})` }} />
          <span className="uss-motion-head" style={{ left: `${progress * 100}%` }} />
          {[0, 1, 2, 3].map((item) => <i key={item} style={{ left: `${(item / 3) * 100}%` }} />)}
        </div>
        <span className="uss-motion-distance">{String(meters).padStart(4, "0")} M</span>
        <span className="uss-motion-divider" aria-hidden="true" />
        <a href="#uss-next-runs">SKIP TO RUNS →</a>
      </nav>
    </section>
  );
}
