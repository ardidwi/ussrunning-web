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
  const lane = index % 5;
  const laneScale = 1 - lane * 0.055;
  const speed = 0.00028 + (lane % 2) * 0.000035;
  const angle = ((index / Math.max(1, count)) * Math.PI * 2 * 6 + time * speed) % (Math.PI * 2);
  const wobble = (seeded(index + 90) - 0.5) * 0.08;

  return {
    x: Math.cos(angle) * 3.15 * laneScale,
    y: Math.sin(angle) * 1.42 * laneScale,
    z: (lane - 2) * 0.16 + Math.sin(angle * 2) * 0.08 + wobble,
  };
}

function trackTargets(count: number): Point3[] {
  return Array.from({ length: count }, (_, index) => trackPoint(index, count, 0));
}

function jakartaTargets(count: number): Point3[] {
  return Array.from({ length: count }, (_, index) => {
    // Reserve a strong central cluster for a Monas-inspired vertical landmark.
    if (index < Math.floor(count * 0.13)) {
      const t = index / Math.max(1, Math.floor(count * 0.13) - 1);
      const ring = (index % 7) / 7;
      const angle = ring * Math.PI * 2;
      const taper = 0.12 + Math.max(0, t - 0.78) * 0.8;
      return {
        x: 0.7 + Math.cos(angle) * taper,
        y: -1.45 + t * 3.8,
        z: 0.35 + Math.sin(angle) * taper,
      };
    }

    const building = Math.floor(seeded(index + 1000) * 32);
    const col = building % 8;
    const row = Math.floor(building / 8);
    const bx = -3.1 + col * 0.88 + (seeded(building + 20) - 0.5) * 0.28;
    const bz = -1.9 + row * 1.18 + (seeded(building + 40) - 0.5) * 0.34;
    const height = 0.85 + seeded(building + 60) * 2.15;
    const width = 0.24 + seeded(building + 80) * 0.42;
    const depth = 0.2 + seeded(building + 100) * 0.36;
    const edge = index % 4;
    const t = seeded(index + 1200);

    if (edge === 0 || edge === 1) {
      return {
        x: bx + (edge === 0 ? -width : width),
        y: -1.42 + t * height,
        z: bz + (seeded(index + 1300) - 0.5) * depth * 2,
      };
    }

    return {
      x: bx + (seeded(index + 1400) - 0.5) * width * 2,
      y: -1.42 + t * height,
      z: bz + (edge === 2 ? -depth : depth),
    };
  });
}

function logoTargets(count: number): Point3[] {
  const offscreen = document.createElement("canvas");
  offscreen.width = 1000;
  offscreen.height = 380;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return trackTargets(count);

  ctx.clearRect(0, 0, offscreen.width, offscreen.height);
  ctx.fillStyle = "#fff";
  ctx.font = "900 270px Impact, Haettenschweiler, Arial Black, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("USS", 500, 190);

  const image = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data;
  const candidates: Array<{ x: number; y: number }> = [];

  for (let y = 22; y < offscreen.height - 22; y += 6) {
    for (let x = 22; x < offscreen.width - 22; x += 6) {
      const alpha = image[(y * offscreen.width + x) * 4 + 3];
      if (alpha > 80) candidates.push({ x, y });
    }
  }

  if (!candidates.length) return trackTargets(count);

  return Array.from({ length: count }, (_, index) => {
    const pick = candidates[Math.floor(seeded(index + 2200) * candidates.length)];
    const depthLayer = (index % 7) / 6;
    return {
      x: ((pick.x / offscreen.width) - 0.5) * 6.4,
      y: (0.5 - pick.y / offscreen.height) * 2.55,
      z: (depthLayer - 0.5) * 0.72 + (seeded(index + 2300) - 0.5) * 0.08,
    };
  });
}

function rotatePoint(point: Point3, yaw: number, pitch: number, roll: number): Point3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  const x1 = point.x * cy + point.z * sy;
  const z1 = -point.x * sy + point.z * cy;
  const y1 = point.y;

  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  const x2 = x1;

  return {
    x: x2 * cr - y2 * sr,
    y: x2 * sr + y2 * cr,
    z: z2,
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
  const reticleRef = useRef<HTMLDivElement | null>(null);
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
        "The track stays alive even when you stop scrolling. Move your cursor, click the field and the pack reacts before finding its line again.",
      action: "OUR STORY",
      href: "/about",
    },
    {
      kicker: "JAKARTA / CITY IN MOTION",
      headline: "BUILT IN JAKARTA.\nMADE TO MOVE.",
      description:
        "The running track breaks into a three-dimensional Jakarta city field, with a Monas-inspired landmark at its core.",
      action: "SEE THE RUNS",
      href: "/runs",
    },
    {
      kicker: "USS / COMMUNITY IN MOTION",
      headline: "ONE CREW.\nONE MARK.\nKEEP MOVING.",
      description:
        "The city resolves into the USS mark. The particles keep breathing, orbiting and responding to you instead of becoming a static logo.",
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
    let particleCount = 0;
    let city: Point3[] = [];
    let logo: Point3[] = [];
    let frame = 0;
    let latestProgress = 0;

    const pointer = {
      x: 0,
      y: 0,
      nx: 0,
      ny: 0,
      active: false,
      smoothX: 0,
      smoothY: 0,
    };

    const clickPulse = { x: 0, y: 0, startedAt: -10000 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      particleCount = width < 760 ? 520 : 1450;
      city = jakartaTargets(particleCount);
      logo = logoTargets(particleCount);
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

    const resolveShapePoint = (shapeIndex: number, index: number, time: number): Point3 => {
      if (shapeIndex <= 1) return trackPoint(index, particleCount, reduceMotion ? 0 : time);
      if (shapeIndex === 2) return city[index];
      return logo[index];
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      if (!particleCount || !city.length || !logo.length) {
        frame = window.requestAnimationFrame(draw);
        return;
      }

      pointer.smoothX += (pointer.nx - pointer.smoothX) * 0.055;
      pointer.smoothY += (pointer.ny - pointer.smoothY) * 0.055;

      const step = latestProgress * 3;
      const fromIndex = Math.min(2, Math.floor(step));
      const toIndex = Math.min(3, fromIndex + 1);
      const rawMix = clamp(step - fromIndex);
      const mix = rawMix * rawMix * (3 - 2 * rawMix);

      const yaw = (reduceMotion ? 0.04 : Math.sin(time * 0.00016) * 0.08) + pointer.smoothX * 0.32;
      const pitch = -0.12 + pointer.smoothY * 0.2;
      const roll = reduceMotion ? 0 : Math.sin(time * 0.00011) * 0.025;
      const centerX = width < 760 ? width * 0.5 : width * 0.73;
      const centerY = height * 0.51;
      const baseScale = Math.min(width, height) * (width < 760 ? 0.135 : 0.155);
      const camera = 7.2;
      const pulseAge = (time - clickPulse.startedAt) / 1000;

      for (let index = 0; index < particleCount; index += 1) {
        const a = resolveShapePoint(fromIndex, index, time);
        const b = resolveShapePoint(toIndex, index, time);

        let point: Point3 = {
          x: a.x + (b.x - a.x) * mix,
          y: a.y + (b.y - a.y) * mix,
          z: a.z + (b.z - a.z) * mix,
        };

        if (!reduceMotion) {
          point.z += Math.sin(time * 0.0011 + index * 0.17) * 0.035;
          point.y += Math.cos(time * 0.00082 + index * 0.11) * 0.018;
        }

        point = rotatePoint(point, yaw, pitch, roll);
        const perspective = camera / Math.max(2.1, camera - point.z);
        let sx = centerX + point.x * baseScale * perspective;
        let sy = centerY - point.y * baseScale * perspective;

        if (pointer.active && !reduceMotion) {
          const dx = sx - pointer.x;
          const dy = sy - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const radius = width < 760 ? 85 : 155;
          if (dist < radius) {
            const force = 1 - dist / radius;
            sx += (dx / dist) * force * force * 34 - (dy / dist) * force * 8;
            sy += (dy / dist) * force * force * 34 + (dx / dist) * force * 8;
          }
        }

        if (pulseAge >= 0 && pulseAge < 1.15 && !reduceMotion) {
          const dx = sx - clickPulse.x;
          const dy = sy - clickPulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.72;
          const delta = Math.abs(dist - wave);
          if (delta < 92) {
            const strength = (1 - delta / 92) * (1 - pulseAge / 1.15) * 44;
            sx += (dx / dist) * strength;
            sy += (dy / dist) * strength;
          }
        }

        const depth = clamp((point.z + 2.6) / 5.2);
        const accent = index % 31 === 0 || (fromIndex === 2 && index < particleCount * 0.13 && index % 5 === 0);
        const alpha = accent ? 0.98 : 0.28 + depth * 0.58;
        const radius = accent ? 2.2 : 0.65 + perspective * 0.92;

        context.beginPath();
        context.arc(sx, sy, radius, 0, Math.PI * 2);
        context.fillStyle = accent
          ? `rgba(255,59,33,${alpha})`
          : `rgba(243,240,232,${alpha})`;
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
      pointer.nx = clamp((pointer.x / width - 0.5) * 2, -1, 1);
      pointer.ny = clamp((pointer.y / height - 0.5) * 2, -1, 1);

      if (reticleRef.current) {
        reticleRef.current.style.left = `${pointer.x}px`;
        reticleRef.current.style.top = `${pointer.y}px`;
      }
    };

    const onPointerLeave = () => {
      pointer.active = false;
      pointer.nx = 0;
      pointer.ny = 0;
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
      <SiteHeader />

      <div className="uss-motion-stage">
        <div className="uss-motion-background" aria-hidden="true">
          <img src={imageUrl} alt="" />
        </div>
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div ref={reticleRef} className="uss-motion-reticle" aria-hidden="true">
          <i /><i /><i /><i />
          <span>3D / MOVE / CLICK</span>
        </div>
        <div className="uss-motion-est">{established || "EST. 2024"}</div>
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
