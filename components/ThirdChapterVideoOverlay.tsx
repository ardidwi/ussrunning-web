"use client";

import { useEffect, useRef, useState } from "react";

type Dust = {
  bx: number;
  by: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  accent: boolean;
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function seeded(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

export default function ThirdChapterVideoOverlay() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const story = document.querySelector<HTMLElement>(".uss-motion-story");
    if (!story) return;

    const sync = () => {
      const rect = story.getBoundingClientRect();
      const total = Math.max(1, story.offsetHeight - window.innerHeight);
      const travelled = clamp(-rect.top, 0, total);
      const progress = travelled / total;
      const chapter = Math.min(3, Math.floor(progress * 3.999));
      setActive(chapter === 2 && rect.bottom > window.innerHeight * 0.4);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.currentTime = Math.min(video.currentTime, 8.8);
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [active]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let dust: Dust[] = [];

    const pointer = {
      x: 0,
      y: 0,
      active: false,
      pressure: 0,
      targetPressure: 0,
    };

    const pulse = { x: 0, y: 0, startedAt: -10000 };

    const buildDust = () => {
      const count = width < 760 ? 180 : 460;
      dust = Array.from({ length: count }, (_, index) => {
        const band = seeded(index + 7);
        const bx = width * (0.08 + seeded(index + 30) * 0.84);
        const by = height * (0.2 + band * 0.62 + (seeded(index + 80) - 0.5) * 0.12);
        return {
          bx,
          by,
          x: bx,
          y: by,
          vx: 0,
          vy: 0,
          size: 0.65 + seeded(index + 120) * 1.45,
          accent: index % 41 === 0,
        };
      });
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildDust();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      pointer.pressure += (pointer.targetPressure - pointer.pressure) * 0.12;

      if (pointer.active && !reduceMotion) {
        const radius = Math.min(190, Math.max(115, width * 0.18));
        const grad = ctx.createRadialGradient(
          pointer.x,
          pointer.y,
          0,
          pointer.x,
          pointer.y,
          radius
        );
        grad.addColorStop(0, `rgba(0,0,0,${0.34 * pointer.pressure})`);
        grad.addColorStop(0.42, `rgba(0,0,0,${0.17 * pointer.pressure})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      const pulseAge = (time - pulse.startedAt) / 1000;
      const hoverRadius = width < 760 ? 90 : 155;

      for (let index = 0; index < dust.length; index += 1) {
        const point = dust[index];
        const floatX = reduceMotion ? 0 : Math.sin(time * 0.0012 + index * 0.37) * 0.45;
        const floatY = reduceMotion ? 0 : Math.cos(time * 0.001 + index * 0.21) * 0.4;
        const targetX = point.bx + floatX;
        const targetY = point.by + floatY;

        point.vx += (targetX - point.x) * 0.022;
        point.vy += (targetY - point.y) * 0.022;

        if (pointer.active && !reduceMotion) {
          const dx = point.x - pointer.x;
          const dy = point.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < hoverRadius) {
            const force = 1 - dist / hoverRadius;
            const press = force * force * (0.72 + pointer.pressure * 1.4);
            point.vx += (dx / dist) * press * 1.7;
            point.vy += (dy / dist) * press * 1.7 + press * 0.42;
          }
        }

        if (pulseAge >= 0 && pulseAge < 0.9 && !reduceMotion) {
          const dx = point.x - pulse.x;
          const dy = point.y - pulse.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const wave = pulseAge * Math.max(width, height) * 0.56;
          const delta = Math.abs(dist - wave);
          if (delta < 55) {
            const kick = (1 - delta / 55) * (1 - pulseAge / 0.9) * 3.2;
            point.vx += (dx / dist) * kick;
            point.vy += (dy / dist) * kick;
          }
        }

        point.vx *= 0.9;
        point.vy *= 0.9;
        point.x += point.vx;
        point.y += point.vy;

        const displacement = Math.min(1, Math.hypot(point.x - point.bx, point.y - point.by) / 42);
        const alpha = 0.18 + displacement * 0.68;
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.size + displacement * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = point.accent
          ? `rgba(255,59,33,${0.42 + displacement * 0.55})`
          : `rgba(248,246,240,${alpha})`;
        ctx.fill();
      }

      frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = wrap.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      pointer.active = inside;
      pointer.targetPressure = inside ? 1 : 0;
      if (!inside) return;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;

      const nx = (pointer.x / Math.max(1, width) - 0.5) * 2;
      const ny = (pointer.y / Math.max(1, height) - 0.5) * 2;
      wrap.style.setProperty("--uss-video-tilt-x", `${ny * -1.6}deg`);
      wrap.style.setProperty("--uss-video-tilt-y", `${nx * 2.2}deg`);
    };

    const onLeave = () => {
      pointer.active = false;
      pointer.targetPressure = 0;
      wrap.style.setProperty("--uss-video-tilt-x", "0deg");
      wrap.style.setProperty("--uss-video-tilt-y", "0deg");
    };

    const onClick = (event: MouseEvent) => {
      const rect = wrap.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) return;
      pulse.x = event.clientX - rect.left;
      pulse.y = event.clientY - rect.top;
      pulse.startedAt = performance.now();
    };

    resize();
    frame = window.requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    window.addEventListener("click", onClick);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={wrapRef} className={`uss-third-video ${active ? "is-active" : ""}`} aria-hidden="true">
      <div className="uss-third-video-frame">
        <video
          ref={videoRef}
          src="/media/uss-particle-chapter.mp4"
          muted
          loop
          playsInline
          preload="auto"
        />
        <canvas ref={canvasRef} />
        <div className="uss-third-video-hud">
          <span>03 / PARTICLE FIELD</span>
          <b>MOVE / PRESS / CLICK</b>
        </div>
      </div>
    </div>
  );
}
