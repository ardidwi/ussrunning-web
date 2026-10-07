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

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function seeded(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function trackPoint(index: number, count: number, time: number): Point3 {
  const lane = index % 7;
  const laneScale = 1 - lane * 0.042;
  const speed = 0.00026 + (lane % 3) * 0.00003;
  const angle =
    ((index / Math.max(1, count)) * Math.PI * 2 * 8 + time * speed) %
    (Math.PI * 2);

  return {
    x: Math.cos(angle) * 3.22 * laneScale,
    y: Math.sin(angle) * 1.34 * laneScale,
    z: (lane - 3) * 0.12 + Math.sin(angle * 2) * 0.06,
  };
}

function trackTargets(count: number): Point3[] {
  return Array.from({ length: count }, (_, index) =>
    trackPoint(index, count, 0)
  );
}

function sampleCanvas(
  canvas: HTMLCanvasElement,
  count: number,
  step: number,
  scaleX: number,
  scaleY: number,
  centerX = 0,
  centerY = 0
): Point3[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates: Array<{ x: number; y: number }> = [];

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      const offset = (y * canvas.width + x) * 4;
      const alpha = data[offset + 3];
      const luminance = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;

      if (alpha > 60 && luminance > 20) {
        candidates.push({ x, y });
      }
    }
  }

  if (!candidates.length) return [];

  return Array.from({ length: count }, (_, index) => {
    const point =
      candidates[Math.floor(seeded(index + 2200) * candidates.length)];

    return {
      x: centerX + ((point.x / canvas.width) - 0.5) * scaleX,
      y: centerY + (0.5 - point.y / canvas.height) * scaleY,
      z:
        ((index % 11) / 10 - 0.5) * 0.5 +
        (seeded(index + 2300) - 0.5) * 0.08,
    };
  });
}

function fallbackLogoTargets(count: number): Point3[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = 1200;
  offscreen.height = 420;
  const ctx = offscreen.getContext("2d");

  if (!ctx) return trackTargets(count);

  ctx.clearRect(0, 0, offscreen.width, offscreen.height);
  ctx.fillStyle = "#fff";
  ctx.font = "900 300px Arial Black, Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("USS", 600, 210);

  const sampled = sampleCanvas(offscreen, count, 7, 6.8, 2.45);
  return sampled.length ? sampled : trackTargets(count);
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

      if (!ctx) {
        resolve(fallbackLogoTargets(count));
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ratio = Math.min(1000 / image.width, 330 / image.height);
      const drawWidth = image.width * ratio;
      const drawHeight = image.height * ratio;

      ctx.drawImage(
        image,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );

      const sampled = sampleCanvas(canvas, count, 4, 6.7, 2.45, 0.35, 0);
      resolve(sampled.length ? sampled : fallbackLogoTargets(count));
    };

    image.onerror = () => resolve(fallbackLogoTargets(count));
  });
}

function loadMonasTargets(count: number): Promise<Point3[]> {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = "/monas-mask.svg";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(trackTargets(count));
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const sampled = sampleCanvas(canvas, count, 5, 2.55, 4.25, 0.65, 0.05);
      resolve(sampled.length ? sampled : trackTargets(count));
    };

    image.onerror = () => resolve(trackTargets(count));
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
      description:
        "The track stays alive. The pack keeps moving, reacting and finding its line again.",
      action: "OUR STORY",
      href: "/about",
    },
    {
      kicker: "JAKARTA / CITY IN MOTION",
      headline: "BUILT IN\nJAKARTA.\nMADE TO\nMOVE.",
      description:
        "The running track evolves into a Jakarta city field, with Monas at its core. The city breathes, moves, and pushes forward together.",
      action: "SEE THE RUNS",
      href: "/runs",
    },
    {
      kicker: "USS / COMMUNITY IN MOTION",
      headline: "ONE CREW.\nONE MARK.\nKEEP MOVING.",
      description:
        "The city resolves into the USS mark. The particles keep breathing, orbiting, and responding in motion.",
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

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 1;
    let height = 1;
    let dpr = 1;
    let particleCount = 1400;
    let monas: Point3[] = [];
    let logo: Point3[] = [];
    let frame = 0;
    let latestProgress = 0;
    let loadToken = 0;

    const pointer = {
      x: 0,
      y: 0,
      nx: 0,
      ny: 0,
      active: false,
      smoothX: 0,
      smoothY: 0,
    };

    const clickPulse = {
      x: 0,
      y: 0,
      startedAt: -10000,
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      particleCount = width < 760 ? 700 : 2400;

      const token = ++loadToken;
      monas = trackTargets(particleCount);
      logo = fallbackLogoTargets(particleCount);

      Promise.all([
        loadMonasTargets(particleCount),
        loadLogoTargets(particleCount),
      ]).then(([monasPoints, logoPoints]) => {
        if (token !== loadToken) return;
        if (monasPoints.length) monas = monasPoints;
        if (logoPoints.length) logo = logoPoints;
      });
    };

    const updateProgress = () => {
      const rect = section.getBoundingClientRect();
      const total = Math.max(1, section.offsetHeight - window.innerHeight);
      const travelled = clamp(-rect.top, 0, total);
      latestProgress = travelled / total;

      setProgress(latestProgress);
      setActiveChapter(
        Math.min(3, Math.floor(latestProgress * 3.999))
      );
      setStoryActive(
        rect.top <= 4 && rect.bottom >= window.innerHeight * 0.5
      );
    };

    const shapePoint = (
      shape: number,
      index: number,
      time: number
    ): Point3 => {
      if (shape <= 1) {
        return trackPoint(index, particleCount, reduceMotion ? 0 : time);
      }
      if (shape === 2) {
        return monas[index] || trackPoint(index, particleCount, 0);
      }
      return logo[index] || fallbackLogoTargets(particleCount)[index];
    };

    const drawOrbit = (
      time: number,
      centerX: number,
      centerY: number,
      strength: number,
      scene: number
    ) => {
      if (strength <= 0.02) return;

      const base = Math.min(width, height) * (scene === 3 ? 0.3 : 0.25);

      context.save();
      context.lineWidth = 0.75;

      for (let orbit = 0; orbit < 5; orbit += 1) {
        const phase =
          time * (0.000055 + orbit * 0.000009) + orbit * 0.52;

        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          base * (1.25 + orbit * 0.19),
          base * (0.38 + orbit * 0.05),
          phase,
          0,
          Math.PI * 2
        );

        context.strokeStyle =
          orbit % 2 === 0
            ? `rgba(255,59,33,${0.3 * strength})`
            : `rgba(245,243,238,${0.22 * strength})`;

        context.stroke();

        const nodeAngle = phase * 2.4 + orbit;
        const nodeX =
          centerX +
          Math.cos(nodeAngle) * base * (1.25 + orbit * 0.19);
        const nodeY =
          centerY +
          Math.sin(nodeAngle) * base * (0.38 + orbit * 0.05);

        context.beginPath();
        context.arc(nodeX, nodeY, orbit % 2 === 0 ? 2.6 : 1.9, 0, Math.PI * 2);
        context.fillStyle =
          orbit % 2 === 0
            ? `rgba(255,59,33,${0.75 * strength})`
            : `rgba(255,255,255,${0.65 * strength})`;
        context.fill();
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

      const scene = latestProgress >= 0.72 ? 3 : latestProgress >= 0.48 ? 2 : 1;

      const centerX =
        width < 760
          ? width * 0.54
          : scene === 3
            ? width * 0.74
            : width * 0.72;

      const centerY = scene === 2 ? height * 0.5 : height * 0.53;

      const flatten = scene === 3 ? 0.82 : scene === 2 ? 0.58 : 0;

      const yaw =
        ((reduceMotion ? 0 : Math.sin(time * 0.0001) * 0.05) +
          pointer.smoothX * 0.2) *
        (1 - flatten);

      const pitch = (-0.065 + pointer.smoothY * 0.12) * (1 - flatten);

      const baseScale =
        Math.min(width, height) *
        (width < 760
          ? 0.14
          : scene === 2
            ? 0.17
            : scene === 3
              ? 0.18
              : 0.158);

      const camera = 7.8;
      const pulseAge = (time - clickPulse.startedAt) / 1000;

      drawOrbit(
        time,
        centerX,
        scene === 2 ? height * 0.52 : height * 0.51,
        clamp((latestProgress - 0.42) / 0.2),
        scene
      );

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
          const breathe = scene === 3 ? 0.015 : 0.026;

          point.z += Math.sin(time * 0.001 + index * 0.17) * breathe;
          point.y +=
            Math.cos(time * 0.0008 + index * 0.11) * breathe * 0.6;
        }

        point = rotatePoint(point, yaw, pitch);

        const perspective = camera / Math.max(2.2, camera - point.z);

        let sx = centerX + point.x * baseScale * perspective;
        let sy = centerY - point.y * baseScale * perspective;

        if (pointer.active && !reduceMotion) {
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = width < 760 ? 90 : 155;

          if (dist < radius) {
            const force = 1 - dist / radius;
            sx += (dx / dist) * force * force * 42;
            sy += (dy / dist) * force * force * 42;
          }
        }

        if (pulseAge >= 0 && pulseAge < 1.2 && !reduceMotion) {
          const dx = sx - clickPulse.x;
          const dy = sy - clickPulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.7;
          const delta = Math.abs(dist - wave);

          if (delta < 92) {
            const strength =
              (1 - delta / 92) * (1 - pulseAge / 1.2) * 48;

            sx += (dx / dist) * strength;
            sy += (dy / dist) * strength;
          }
        }

        const isMonasAccent = scene === 2 && index % 23 === 0;
        const isLogoAccent = scene === 3 && index % 29 === 0;
        const accent = isMonasAccent || isLogoAccent || index % 61 === 0;

        const alpha = accent
          ? 0.98
          : scene === 3
            ? 0.72
            : 0.48 + clamp((point.z + 2.2) / 4.4) * 0.45;

        const radius = accent
          ? scene === 3
            ? 2.25
            : 2.05
          : scene === 3
            ? 0.86 + perspective * 0.96
            : 0.68 + perspective * 0.9;

        context.beginPath();
        context.arc(sx, sy, radius, 0, Math.PI * 2);

        context.fillStyle = accent
          ? `rgba(255,42,22,${alpha})`
          : `rgba(247,246,241,${alpha})`;

        context.fill();
      }

      context.restore();

      frame = requestAnimationFrame(draw);
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
      pointer.nx = clamp((pointer.x / width - 0.5) * 2, -1, 1);
      pointer.ny = clamp((pointer.y / height - 0.5) * 2, -1, 1);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (target?.closest("a,button,input,label")) {
        return;
      }

      const rect = canvas.getBoundingClientRect();

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

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

  const hud =
    activeChapter === 2
      ? ["JAKARTA", "6.1754° S", "106.8272° E"]
      : activeChapter === 3
        ? ["PEOPLE", "ROUTES", "CULTURE", "MOVEMENT", "A STRONGER", "JAKARTA"]
        : ["PEOPLE", "ROUTES", "CULTURE"];

  return (
    <section
      ref={sectionRef}
      className={`uss-motion-story is-chapter-${activeChapter + 1}`}
      data-chapter={activeChapter + 1}
      aria-label="USS Running introduction"
    >
      <SiteHeader />

      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true">
          <img src={imageUrl} alt="" />
        </div>

        <div className="uss-motion-monas-photo" aria-hidden="true">
          <img src="/monas-mask.svg" alt="" />
        </div>

        <div className="uss-motion-scrim" aria-hidden="true" />

        <canvas
          ref={canvasRef}
          className="uss-motion-canvas"
          aria-hidden="true"
        />

        <div className="uss-motion-hud" aria-hidden="true">
          {hud.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="uss-motion-est" aria-hidden="true">
          {established || "EST. 2024"}
        </div>
      </div>

      <div className="uss-motion-chapters">
        {chapters.map((chapter, index) => (
          <article
            className={`uss-motion-chapter ${
              activeChapter === index ? "is-active" : ""
            }`}
            key={chapter.kicker}
          >
            <div className="uss-motion-copy">
              <span className="uss-motion-kicker">
                <b>{String(index + 1).padStart(2, "0")}</b>
                <i />
                {chapter.kicker}
              </span>

              <h1 style={{ whiteSpace: "pre-line" }}>{chapter.headline}</h1>

              <p>{chapter.description}</p>

              <Link href={chapter.href}>{chapter.action} ↗</Link>
            </div>
          </article>
        ))}
      </div>

      <nav
        className={`uss-motion-scrubber ${storyActive ? "is-on" : ""}`}
        aria-label="USS introduction progress"
      >
        <div className="uss-motion-track" aria-hidden="true">
          <span
            className="uss-motion-fill"
            style={{ transform: `scaleX(${progress})` }}
          />

          <span
            className="uss-motion-head"
            style={{ left: `${progress * 100}%` }}
          />

          {[0, 1, 2, 3].map((item) => (
            <i
              key={item}
              style={{ left: `${(item / 3) * 100}%` }}
            />
          ))}
        </div>

        <span className="uss-motion-distance">
          {String(meters).padStart(4, "0")} M
        </span>

        <span className="uss-motion-divider" aria-hidden="true" />

        <a href="#uss-next-runs">SKIP TO RUNS →</a>
      </nav>
    </section>
  );
}
