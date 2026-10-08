"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import storyConfig from "@/public/motion/story-config.json";

type Preset = "running-track-uss" | "people-pace" | "jakarta-monas" | "uss-final";
type Chapter = {
  kicker: string;
  headline: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  backgroundImage: string;
  motionPreset: Preset;
};
type Props = {
  imageUrl: string;
  established?: string | null;
  eyebrow?: string | null;
  headline: string;
  description: string;
  ctaHref?: string | null;
  ctaLabel?: string | null;
  chapters?: Partial<Chapter>[];
  enableMotion?: boolean;
};

// Structural settings have one owner; editorial content lives in story-config.json.
const MOTION = {
  desktopCount: 3400,
  tabletCount: 2400,
  mobileCount: 1100,
  coreRatio: 0.54, // ~1836 logo particles, ~1564 track particles on desktop
  constrainedDeviceScale: 0.8,
  minimumCores: 4,
  minimumMemory: 4,
  particleStyle: {
    cityAccentRatio: 0.035,
    logoAccentRatio: 0.065,
    coreDensity: 0.35,
    finalDensity: 0.45,
  },
  mobileWidth: 760,
  tabletWidth: 1280,
  maxDpr: 1.5,
  lanes: 5,
  transitions: [[0.21, 0.25], [0.46, 0.50], [0.71, 0.75]] as const,
  spring: 0.068,
  damping: 0.82,
  cursorRadius: 145,
  tabletRadius: 105,
  cursorPressure: 24,
  rippleWidth: 70,
  rippleSpeed: 560,
  rippleForce: 20,
  rippleDuration: 1100,
  mobileRippleScale: 0.55,
  idleDisplacement: 1.2,
  orbitCount: 4,
  orbitSpeed: 0.000035,
  trackSpeed: 0.000038,
  settle: 0.14,
  distance: 5000,
  exitStart: 0.93,
  geometry: {
    desktopCenter: 0.72,
    tabletCenter: 0.745,
    mobileCenter: 0.5,
    centerY: 0.52,
    desktopWidth: 0.54,
    tabletWidth: 0.48,
    mobileWidth: 0.90,
    desktopHeight: 0.74,
    mobileHeight: 0.34,
    mobileTopGap: 18,
    copyGap: 24,
    coreScale: 0.64,
    finalScale: 0.86,
    coreHeightScale: 0.72,
    finalHeightScale: 0.88,
  },
} as const;

// Chapter 02 Runner Crew / Pack Definitions (Different Runners, Different Paces, One Movement)
const PACK_DEFS = [
  { name: "Pace 4:15 Fast Pack", velocity: 0.000048, cadence: 0.0062, amp: 2.8, rx: 0.44, ry: 0.32, baseAngle: 0.0, spread: 0.14 },
  { name: "Pace 4:45 Tempo Crew", velocity: 0.000041, cadence: 0.0055, amp: 2.4, rx: 0.36, ry: 0.26, baseAngle: 1.05, spread: 0.16 },
  { name: "Pace 5:15 Steady Squad", velocity: 0.000035, cadence: 0.0048, amp: 2.2, rx: 0.48, ry: 0.35, baseAngle: 2.10, spread: 0.18 },
  { name: "Pace 5:45 Social Crew", velocity: 0.000030, cadence: 0.0042, amp: 2.0, rx: 0.30, ry: 0.22, baseAngle: 3.15, spread: 0.20 },
  { name: "Pace 6:15 Community", velocity: 0.000025, cadence: 0.0037, amp: 1.8, rx: 0.52, ry: 0.38, baseAngle: 4.20, spread: 0.22 },
  { name: "Route Connectors", velocity: 0.000032, cadence: 0.0045, amp: 2.0, rx: 0.39, ry: 0.28, baseAngle: 5.25, spread: 0.32 },
] as const;

const NAV = [
  ["RUNS", "/runs"],
  ["ABOUT", "/about"],
  ["MEMBERSHIP", "/membership"],
  ["STORIES", "/stories"],
  ["PARTNERS", "/partners"],
  ["MY USS", "/login"],
] as const;

const PRESETS: Preset[] = ["running-track-uss", "people-pace", "jakarta-monas", "uss-final"];
const clamp = (v: number, low = 0, high = 1) => Math.min(high, Math.max(low, v));
const smoothstep = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const random = (i: number) => {
  const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
};
type Mask = { points: Float32Array; aspect: number };

// Sample actual alpha geometry, crop transparent margins only, retain the registered mark.
// No font or generic geometry fallback for either silhouette.
function sampleMask(url: string, signal: AbortSignal): Promise<Mask> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const clear = () => {
      image.onload = null;
      image.onerror = null;
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      clear();
      image.src = "";
      reject(new Error("Mask load cancelled"));
    };
    signal.addEventListener("abort", abort, { once: true });
    image.onerror = () => {
      clear();
      reject(new Error(`Unable to load ${url}`));
    };
    image.onload = () => {
      clear();
      try {
        const bitmap = document.createElement("canvas");
        const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, 1));
        bitmap.width = Math.max(1, Math.round(image.naturalWidth * scale));
        bitmap.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = bitmap.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.drawImage(image, 0, 0, bitmap.width, bitmap.height);
        const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        const pixels: number[] = [];
        let minX = bitmap.width, minY = bitmap.height, maxX = 0, maxY = 0;
        for (let y = 0; y < bitmap.height; y += 2) {
          for (let x = 0; x < bitmap.width; x += 2) {
            if (data[(y * bitmap.width + x) * 4 + 3] < 80) continue;
            pixels.push(x, y);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        if (!pixels.length) throw new Error("Empty alpha mask");
        const spanX = Math.max(1, maxX - minX + 2);
        const spanY = Math.max(1, maxY - minY + 2);
        const points = new Float32Array(pixels.length);
        for (let i = 0; i < pixels.length; i += 2) {
          points[i] = (pixels[i] - minX) / spanX - 0.5;
          points[i + 1] = (pixels[i + 1] - minY) / spanY - 0.5;
        }
        resolve({ points, aspect: spanX / spanY });
      } catch (error) {
        reject(error);
      }
    };
    image.src = url;
  });
}

function samplePoint(mask: Mask, index: number, count: number) {
  // Stratification keeps coverage in the small registered symbol rather than random omission.
  const length = mask.points.length / 2;
  const stratified = (index + random(index * 3 + 7)) * (length / count);
  const clamped = Math.min(length - 1, Math.max(0, Math.floor(stratified)));
  return clamped * 2;
}

export default function HomeMotionExperience(props: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  const distanceRef = useRef<HTMLSpanElement>(null);
  const backgroundRefs = useRef<(HTMLImageElement | null)[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLImageElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const enableMotion = props.enableMotion ?? storyConfig.enableMotion;
  const chapters = storyConfig.chapters.map((item, index) => ({
    ...item,
    ...(index === 0
      ? {
          kicker: props.eyebrow || item.kicker,
          headline: props.headline.replace(/\.\s+(?=WE\s)/g, ".\n"),
          description: props.description,
          ctaLabel: props.ctaLabel || item.ctaLabel,
          ctaHref: props.ctaHref || item.ctaHref,
        }
      : {}),
    ...props.chapters?.[index],
  }));
  const presetKey = chapters.map((chapter) => chapter.motionPreset).join(",");
  const backgrounds = chapters.map((chapter) => chapter.backgroundImage || props.imageUrl);
  const backgroundKey = backgrounds.join("|");

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onScroll = () => setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, [menuOpen]);

  useEffect(() => {
    const section = sectionRef.current,
      stage = stageRef.current,
      canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const controller = new AbortController();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const presets = presetKey
      .split(",")
      .map((preset, index) => (PRESETS.includes(preset as Preset) ? (preset as Preset) : PRESETS[index]));
    let reduced = media.matches || !enableMotion;
    let disposed = false,
      visible = true,
      frame = 0,
      dirty = true;
    let width = 1,
      height = 1,
      progress = 0,
      displayedProgress = 0,
      initialized = false;
    let count = 0,
      coreCount = 0,
      lastTime = 0,
      logoMask: Mask | null = null,
      monasMask: Mask | null = null;
    let runningTrackTarget = new Float32Array(),
      ussCoreTarget = new Float32Array();
    let peoplePaceTarget = new Float32Array(),
      monasTarget = new Float32Array(),
      ussFinalTarget = new Float32Array();
    let phase = new Float32Array(),
      speed = new Float32Array(),
      accentSeed = new Float32Array(),
      particleRadius = new Float32Array();
    let depthZ = new Float32Array(),
      packIndex = new Int32Array(),
      packLocalX = new Float32Array(),
      packLocalY = new Float32Array();
    let cadencePhase = new Float32Array(),
      cadenceAmp = new Float32Array();
    let offsetX = new Float32Array(),
      offsetY = new Float32Array(),
      velocityX = new Float32Array(),
      velocityY = new Float32Array();
    const backgroundLayers = Array.from(
      new Set(backgroundRefs.current.filter((image): image is HTMLImageElement => Boolean(image)))
    );
    const pointer = { x: 0, y: 0, active: false };
    const ripple = { x: 0, y: 0, time: -10000 };
    let centerX = 0,
      centerY = 0,
      visualWidth = 0,
      visualHeight = 0;
    let monasWidth = 0,
      monasHeight = 0,
      finalWidth = 0,
      finalHeight = 0,
      coreWidth = 0,
      coreHeight = 0;
    const requestDraw = () => {
      if (!disposed && !frame && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const readProgress = () => {
      const rect = section.getBoundingClientRect();
      progress = clamp(-rect.top / Math.max(1, section.offsetHeight - stage.offsetHeight));
      if (!initialized) {
        displayedProgress = progress;
        initialized = true;
      }
      dirty = false;
    };

    const rebuildTargets = () => {
      if (!logoMask || !monasMask) return;
      const mobile = window.innerWidth <= MOTION.mobileWidth,
        tablet = window.innerWidth < MOTION.tabletWidth;
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const constrained =
        (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= MOTION.minimumCores) ||
        (deviceMemory !== undefined && deviceMemory <= MOTION.minimumMemory);
      const requestedCount = Math.round(
        (mobile ? MOTION.mobileCount : tablet ? MOTION.tabletCount : MOTION.desktopCount) *
          (!mobile && constrained ? MOTION.constrainedDeviceScale : 1)
      );

      if (requestedCount !== count) {
        count = requestedCount;
        coreCount = Math.floor(count * MOTION.coreRatio);
        runningTrackTarget = new Float32Array(count * 2);
        ussCoreTarget = new Float32Array(count * 2);
        peoplePaceTarget = new Float32Array(count * 2);
        monasTarget = new Float32Array(count * 2);
        ussFinalTarget = new Float32Array(count * 2);
        depthZ = new Float32Array(count);
        packIndex = new Int32Array(count);
        packLocalX = new Float32Array(count);
        packLocalY = new Float32Array(count);
        cadencePhase = new Float32Array(count);
        cadenceAmp = new Float32Array(count);
        offsetX = new Float32Array(count);
        offsetY = new Float32Array(count);
        velocityX = new Float32Array(count);
        velocityY = new Float32Array(count);
        phase = new Float32Array(count);
        speed = new Float32Array(count);
        accentSeed = new Float32Array(count);
        particleRadius = new Float32Array(count);

        for (let i = 0; i < count; i++) {
          phase[i] = random(i + 120) * Math.PI * 2;
          speed[i] = MOTION.trackSpeed * (1 + (i % MOTION.lanes) * 0.08 + random(i + 61) * 0.06);
          accentSeed[i] = random(i + 81);
          particleRadius[i] = 0.65 + random(i + 102) * 0.55;
          depthZ[i] = (random(i * 7 + 4) - 0.5) * 2; // -1 to 1

          // Chapter 02 Runner Crew / Pack Assignment
          const pIndex = i % PACK_DEFS.length;
          packIndex[i] = pIndex;
          const pCfg = PACK_DEFS[pIndex];
          // Cluster formation inside the pack with natural drafting & spacing
          const formAngle = random(i * 13 + 5) * Math.PI * 2;
          const formDist = Math.sqrt(random(i * 17 + 9));
          packLocalX[i] = Math.cos(formAngle) * formDist * 0.8;
          packLocalY[i] = Math.sin(formAngle) * formDist * 0.6;
          cadencePhase[i] = random(i * 11 + 3) * Math.PI * 2;
          cadenceAmp[i] = pCfg.amp * (0.8 + random(i * 19 + 7) * 0.4);
        }
      }

      // 40/60 desktop, 48/52 tablet. Mobile places the visual above the copy.
      const geometry = MOTION.geometry;
      const landscape = mobile && width > height;
      centerX =
        width * (mobile && !landscape ? geometry.mobileCenter : tablet ? geometry.tabletCenter : geometry.desktopCenter);
      centerY = height * geometry.centerY;
      visualWidth =
        width * (mobile && !landscape ? geometry.mobileWidth : tablet ? geometry.tabletWidth : geometry.desktopWidth);
      visualHeight = height * geometry.desktopHeight;

      if (mobile && !landscape) {
        const headerHeight = document.querySelector(".motion-header")?.getBoundingClientRect().height || 66;
        let copyTop = height;
        chapterRefs.current.forEach((chapter) => {
          const copy = chapter?.querySelector(".motion-copy");
          if (copy) copyTop = Math.min(copyTop, copy.getBoundingClientRect().top - stage.getBoundingClientRect().top);
        });
        const top = headerHeight + geometry.mobileTopGap;
        visualHeight = Math.max(60, Math.min(height * geometry.mobileHeight, copyTop - top - geometry.copyGap));
        centerY = top + visualHeight / 2;
      } else if (landscape) {
        centerY = height * 0.5 + 8;
        visualHeight = Math.max(60, height - 140);
      }

      // Proportions: Monas tall & dominant, USS upright & clearly readable
      monasHeight = Math.min(visualHeight * 0.76, (visualWidth * 0.94) / monasMask.aspect);
      monasWidth = monasHeight * monasMask.aspect;
      finalWidth = Math.min(visualWidth * geometry.finalScale, visualHeight * geometry.finalHeightScale * logoMask.aspect);
      finalHeight = finalWidth / logoMask.aspect;
      coreWidth = Math.min(visualWidth * geometry.coreScale, visualHeight * geometry.coreHeightScale * logoMask.aspect);
      coreHeight = coreWidth / logoMask.aspect;

      for (let i = 0; i < count; i++) {
        const n = i * 2;
        // USS Final Target (sampled from actual alpha mask)
        const logoIndex = samplePoint(logoMask, i, count);
        ussFinalTarget[n] = logoMask.points[logoIndex] * finalWidth;
        ussFinalTarget[n + 1] = logoMask.points[logoIndex + 1] * finalHeight;

        // USS Core Target (Chapter 01 - upright, centered inside ring)
        if (i < coreCount) {
          const coreIndex = samplePoint(logoMask, i, coreCount);
          ussCoreTarget[n] = logoMask.points[coreIndex] * coreWidth;
          ussCoreTarget[n + 1] = logoMask.points[coreIndex + 1] * coreHeight;
        }

        // Monas Target (Chapter 03 - authentic silhouette proportions)
        const monasIndex = samplePoint(monasMask, i, count);
        monasTarget[n] = monasMask.points[monasIndex] * monasWidth;
        monasTarget[n + 1] = monasMask.points[monasIndex + 1] * monasHeight;
      }

      if (ghostRef.current) {
        Object.assign(ghostRef.current.style, {
          left: `${centerX - monasWidth / 2}px`,
          top: `${centerY - monasHeight / 2}px`,
          width: `${monasWidth}px`,
          height: `${monasHeight}px`,
        });
      }
      canvas.dataset.particleCount = String(count);
      canvas.dataset.trackCount = String(count - coreCount);
    };

    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const previousWidth = width,
        previousHeight = height;
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      if (
        initialized &&
        previousWidth > 1 &&
        (previousWidth !== width || previousHeight !== height) &&
        progress > 0 &&
        progress < 1 &&
        section.getBoundingClientRect().top <= 0
      ) {
        const storyTop = window.scrollY + section.getBoundingClientRect().top;
        window.scrollTo({
          top: storyTop + progress * (section.offsetHeight - stage.offsetHeight),
          behavior: "instant",
        });
      }
      const dpr = Math.min(window.devicePixelRatio || 1, MOTION.maxDpr);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildTargets();
      dirty = true;
      requestDraw();
    };

    // Continuous dynamic updates for Chapter 01 (Track) & Chapter 02 (People / Pace)
    const updateDynamicTargets = (time: number) => {
      for (let i = 0; i < count; i++) {
        const n = i * 2;
        // 1. Running Track Oval (surrounding the central USS logo across 5 lanes)
        const lane = i % MOTION.lanes;
        const laneScale = 1 - lane * 0.042;
        const trackSpeed = MOTION.trackSpeed * (1.16 - lane * 0.065);
        const trackAngle = phase[i] + time * trackSpeed;
        const trkCos = Math.cos(trackAngle),
          trkSin = Math.sin(trackAngle);
        const trkX = (trkCos * 0.32 + Math.tanh(trkCos * 4.5) * 0.16) * visualWidth * laneScale;
        const trkY = trkSin * visualHeight * (0.35 + lane * 0.035) * laneScale;
        runningTrackTarget[n] = trkX;
        runningTrackTarget[n + 1] = trkY;
        if (i >= coreCount) {
          ussCoreTarget[n] = trkX;
          ussCoreTarget[n + 1] = trkY;
        }

        // 2. Chapter 02: Runner Packs & Pace Groups (Different Runners, Different Paces, One Movement)
        const pIdx = packIndex[i];
        const pCfg = PACK_DEFS[pIdx];
        const packAngle = pCfg.baseAngle + time * pCfg.velocity + phase[i] * 0.06;
        const pCos = Math.cos(packAngle),
          pSin = Math.sin(packAngle);
        // Sweeping urban avenue route through the city
        const routeX = (pCos * 0.34 + Math.sin(packAngle * 2) * 0.08) * visualWidth * pCfg.rx;
        const routeY = (pSin * 0.32 + Math.cos(packAngle * 2) * 0.06) * visualHeight * pCfg.ry;
        // Running stride cadence bounce (vertical & slight forward thrust)
        const cadenceT = time * pCfg.cadence + cadencePhase[i];
        const strideY = Math.sin(cadenceT) * cadenceAmp[i];
        const strideX = Math.cos(cadenceT) * (cadenceAmp[i] * 0.35);
        // Pack drafting formation
        const formX = packLocalX[i] * visualWidth * pCfg.spread;
        const formY = packLocalY[i] * visualHeight * pCfg.spread;

        peoplePaceTarget[n] = routeX + formX + strideX;
        peoplePaceTarget[n + 1] = routeY + formY + strideY;
      }
    };

    const targetFor = (preset: Preset) =>
      preset === "running-track-uss"
        ? ussCoreTarget
        : preset === "people-pace"
        ? peoplePaceTarget
        : preset === "jakarta-monas"
        ? monasTarget
        : ussFinalTarget;

    const drawOrbits = (time: number, strength: number) => {
      if (strength < 0.01) return;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.lineWidth = 0.65;
      for (let orbit = 0; orbit < MOTION.orbitCount; orbit++) {
        const oPhase = orbit * 0.74 + time * MOTION.orbitSpeed * (1 + orbit * 0.13);
        const rx = visualWidth * (0.39 + orbit * 0.022);
        const ry = visualHeight * (0.13 + orbit * 0.025);
        ctx.save();
        ctx.rotate(Math.sin(oPhase) * 0.46);
        ctx.beginPath();
        ctx.ellipse(0, (orbit - 1.5) * visualHeight * 0.12, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle =
          orbit % 2 ? `rgba(255,59,33,${strength * 0.14})` : `rgba(248,247,242,${strength * 0.18})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(
          Math.cos(oPhase * 2) * rx,
          (orbit - 1.5) * visualHeight * 0.12 + Math.sin(oPhase * 2) * ry,
          1.8,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(255,59,33,${strength * 0.65})`;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    };

    function draw(time: number) {
      frame = 0;
      if (disposed || !stage || !ctx) return;
      if (dirty) readProgress();
      const elapsed = Math.min(2, Math.max(0.1, (time - lastTime) / 16.667));
      lastTime = time;
      displayedProgress = reduced
        ? progress
        : displayedProgress + (progress - displayedProgress) * (1 - Math.pow(1 - MOTION.settle, elapsed));
      if (Math.abs(progress - displayedProgress) < 0.0001) displayedProgress = progress;

      let from = 0,
        to = 0,
        mix = 0;
      for (let chapter = 0; chapter < MOTION.transitions.length; chapter++) {
        const [start, end] = MOTION.transitions[chapter];
        if (displayedProgress >= end) {
          from = chapter + 1;
          to = from;
        } else if (displayedProgress > start) {
          from = chapter;
          to = chapter + 1;
          mix = smoothstep((displayedProgress - start) / (end - start));
          break;
        } else break;
      }
      const active = mix > 0.5 ? to : from;
      stage.dataset.chapter = String(active + 1);
      stage.dataset.progress = String(displayedProgress);

      chapterRefs.current.forEach((element, index) => {
        if (!element) return;
        const opacity = index === from ? 1 - mix : index === to ? mix : 0;
        element.dataset.state =
          opacity === 0 ? "inactive" : opacity === 1 ? "active" : index === to ? "entering" : "leaving";
        element.style.opacity = String(opacity);
        element.style.visibility = opacity > 0 ? "visible" : "hidden";
        element.style.transform = `translateY(${reduced ? 0 : (1 - opacity) * 12}px)`;
        element.inert = index !== active;
        element.setAttribute("aria-hidden", String(index !== active));
      });

      if (progressRef.current) progressRef.current.style.setProperty("--story-progress", String(progress));
      if (distanceRef.current)
        distanceRef.current.textContent = `${String(Math.round(progress * MOTION.distance)).padStart(4, "0")} M`;

      const city =
        (presets[from] === "jakarta-monas" ? 1 - mix : 0) +
        (to !== from && presets[to] === "jakarta-monas" ? mix : 0);
      const final =
        (presets[from] === "uss-final" ? 1 - mix : 0) +
        (to !== from && presets[to] === "uss-final" ? mix : 0);
      const core =
        (presets[from] === "running-track-uss" ? 1 - mix : 0) +
        (to !== from && presets[to] === "running-track-uss" ? mix : 0);

      if (hudRef.current) hudRef.current.style.opacity = String(city);
      if (ghostRef.current) ghostRef.current.style.opacity = String(final * 0.08);

      // Background layers sum chapter weights smoothly
      backgroundLayers.forEach((image) => {
        let weight = 0;
        backgroundRefs.current.forEach((layer, index) => {
          if (layer === image) weight += index === from ? 1 - mix : index === to ? mix : 0;
        });
        image.style.opacity = String(weight * 0.55);
      });

      ctx.clearRect(0, 0, width, height);

      if (count) {
        const animationTime = reduced ? 0 : time;
        updateDynamicTargets(animationTime);
        const a = targetFor(presets[from]),
          b = targetFor(presets[to]);
        const exit = smoothstep((displayedProgress - MOTION.exitStart) / (1 - MOTION.exitStart));
        drawOrbits(animationTime, (city + final * 0.75) * (1 - exit * 0.7));

        const damping = Math.pow(MOTION.damping, elapsed);
        const canInteract = !reduced && finePointer.matches && window.innerWidth > MOTION.mobileWidth;
        const interactionRadius =
          window.innerWidth < MOTION.tabletWidth ? MOTION.tabletRadius : MOTION.cursorRadius;
        const rippleAge = time - ripple.time,
          rippleRadius = (rippleAge * MOTION.rippleSpeed) / 1000;

        // Micro 3D Parallax Calculation
        const normPointerX = clamp((pointer.x - centerX) / Math.max(1, width * 0.5), -1, 1);
        const normPointerY = clamp((pointer.y - centerY) / Math.max(1, height * 0.5), -1, 1);
        const yaw = (core * 0.012 + final * 0.016 + city * 0.009) * (canInteract && pointer.active ? normPointerX : 0);
        const pitch = -(core * 0.008 + final * 0.012 + city * 0.007) * (canInteract && pointer.active ? normPointerY : 0);
        const cosYaw = Math.cos(yaw),
          sinYaw = Math.sin(yaw);
        const cosPitch = Math.cos(pitch),
          sinPitch = Math.sin(pitch);

        for (let i = 0; i < count; i++) {
          const n = i * 2,
            idle = reduced ? 0 : MOTION.idleDisplacement;
          // Interpolate base target with subtle breathing
          const baseX = a[n] + (b[n] - a[n]) * mix + Math.sin(animationTime * 0.0008 + i * 0.71) * idle;
          const baseY = a[n + 1] + (b[n + 1] - a[n + 1]) * mix + Math.cos(animationTime * 0.001 + i * 0.43) * idle;
          const zVal = depthZ[i] * 30;

          // Restrained 3D rotation & depth perspective
          const x3d = baseX * cosYaw - zVal * sinYaw;
          const z3d = baseX * sinYaw + zVal * cosYaw;
          const y3d = baseY * cosPitch - z3d * sinPitch;
          const zFinal = baseY * sinPitch + z3d * cosPitch;
          const perspScale = 900 / (900 + zFinal);

          const x = centerX + x3d * perspScale;
          const y = centerY + y3d * perspScale;

          let forceX = 0,
            forceY = 0;

          // Cursor Repel
          if (canInteract && pointer.active) {
            const dx = x + offsetX[i] - pointer.x,
              dy = y + offsetY[i] - pointer.y,
              distance = Math.hypot(dx, dy) || 1;
            if (distance < interactionRadius) {
              const pressure =
                Math.pow(1 - distance / interactionRadius, 2) * MOTION.cursorPressure;
              forceX += (dx / distance) * pressure;
              forceY += (dy / distance) * pressure;
            }
          }

          // Click Shatter & Shockwave Ripple
          if (!reduced && rippleAge >= 0 && rippleAge < MOTION.rippleDuration) {
            const dx = x + offsetX[i] - ripple.x,
              dy = y + offsetY[i] - ripple.y,
              distance = Math.hypot(dx, dy) || 1;
            const waveDist = Math.abs(distance - rippleRadius);
            if (waveDist < MOTION.rippleWidth) {
              const wave =
                (1 - waveDist / MOTION.rippleWidth) *
                (1 - rippleAge / MOTION.rippleDuration) *
                MOTION.rippleForce *
                (window.innerWidth <= MOTION.mobileWidth ? MOTION.mobileRippleScale : 1);
              forceX += (dx / distance) * wave;
              forceY += (dy / distance) * wave;
            }
          }

          if (reduced) {
            offsetX[i] = 0;
            offsetY[i] = 0;
            velocityX[i] = 0;
            velocityY[i] = 0;
          } else {
            const accelX = forceX - MOTION.spring * offsetX[i];
            const accelY = forceY - MOTION.spring * offsetY[i];
            velocityX[i] = (velocityX[i] + accelX * elapsed) * damping;
            velocityY[i] = (velocityY[i] + accelY * elapsed) * damping;
            offsetX[i] += velocityX[i] * elapsed;
            offsetY[i] += velocityY[i] * elapsed;
          }

          // Coloring: Monas gold flame, USS red accents, warm white body
          const accent =
            accentSeed[i] <
            (city > 0.5 ? MOTION.particleStyle.cityAccentRatio : MOTION.particleStyle.logoAccentRatio);
          const flame = city > 0.5 && monasTarget[n + 1] < -monasHeight * 0.38;
          const density =
            (i < coreCount ? core : 0) * MOTION.particleStyle.coreDensity +
            final * MOTION.particleStyle.finalDensity;
          const radius = (accent ? 1.5 + density * 0.2 : particleRadius[i] + density) * perspScale;
          const shimmer = reduced ? 1 : 0.88 + Math.sin(time * 0.0018 + i) * 0.12;

          ctx.globalAlpha = (accent ? 0.95 : flame ? 0.98 : 0.86) * shimmer;
          ctx.fillStyle = flame ? "#f5be42" : accent ? "#ff3b21" : "#f8f7f2";
          ctx.beginPath();
          ctx.arc(x + offsetX[i], y + offsetY[i], Math.max(0.4, radius), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // Continuous 60fps loop keeps idle motion, running cadences & orbits alive
      if (visible && count > 0 && !document.hidden && !reduced) requestDraw();
    }

    const onScroll = () => {
      dirty = true;
      requestDraw();
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reduced || window.innerWidth <= MOTION.mobileWidth) return;
      const rect = stage.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active =
        visible && pointer.x >= width * 0.38 && pointer.x <= width && pointer.y >= 70 && pointer.y < height - 60;
    };

    const clearPointer = () => {
      pointer.active = false;
    };

    const onClick = (event: MouseEvent) => {
      if (reduced) return;
      if ((event.target as Element | null)?.closest("a,button,input,label,nav")) return;
      const rect = stage.getBoundingClientRect(),
        x = event.clientX - rect.left,
        y = event.clientY - rect.top;
      const mobile = window.innerWidth <= MOTION.mobileWidth;
      const inside = mobile
        ? Math.abs(x - centerX) <= visualWidth / 2 && Math.abs(y - centerY) <= visualHeight / 2
        : x >= width * 0.38 && x <= width && y >= 70 && y <= height - 60;
      if (!visible || !inside) return;

      ripple.x = x;
      ripple.y = y;
      ripple.time = performance.now();

      // Controlled shatter impulse on click
      const blastRadius = visualWidth * 0.65;
      for (let i = 0; i < count; i++) {
        const pdx = centerX + ussFinalTarget[i * 2] - x;
        const pdy = centerY + ussFinalTarget[i * 2 + 1] - y;
        const pdist = Math.hypot(pdx, pdy) + 1;
        if (pdist < blastRadius) {
          const impulse = Math.pow(1 - pdist / blastRadius, 1.5) * 22 * (0.8 + random(i + 47) * 0.6);
          const scatterAngle = Math.atan2(pdy, pdx) + (random(i + 89) - 0.5) * 0.7;
          velocityX[i] += Math.cos(scatterAngle) * impulse;
          velocityY[i] += Math.sin(scatterAngle) * impulse;
        }
      }
      requestDraw();
    };

    const onMotionChange = () => {
      reduced = media.matches || !enableMotion;
      clearPointer();
      dirty = true;
      requestDraw();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        clearPointer();
      } else {
        dirty = true;
        requestDraw();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    chapterRefs.current.forEach((chapter) => {
      const copy = chapter?.querySelector(".motion-copy");
      if (copy) observer.observe(copy);
    });

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
        clearPointer();
      } else {
        dirty = true;
        requestDraw();
      }
    });
    intersection.observe(stage);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerout", clearPointer);
    window.addEventListener("blur", clearPointer);
    window.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMotionChange);

    setReady(false);
    resize();

    Promise.all([
      sampleMask("/uss-logo.png", controller.signal),
      sampleMask("/motion/monas-silhouette.svg", controller.signal),
    ])
      .then(([logo, monas]) => {
        if (disposed || !stage || !ctx) return;
        logoMask = logo;
        monasMask = monas;
        rebuildTargets();
        setReady(true);
        requestDraw();
      })
      .catch(() => {
        /* Real static assets remain visible when a local mask cannot load. */
      });

    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      frame = 0;
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerout", clearPointer);
      window.removeEventListener("blur", clearPointer);
      window.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMotionChange);
    };
  }, [enableMotion, presetKey, backgroundKey]);

  return (
    <>
      <header className="motion-header">
        <Link href="/" className="motion-brand" aria-label="USS Running home">
          <img src="/uss-logo.png" alt="USS" />
        </Link>
        <button
          ref={menuButtonRef}
          className="motion-menu-button"
          type="button"
          aria-controls="motion-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          MENU <span>{menuOpen ? "−" : "+"}</span>
        </button>
        <nav id="motion-navigation" className="motion-navigation" data-open={menuOpen} aria-label="Main navigation">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={label === "RUNS" ? "motion-nav-highlight" : label === "MY USS" ? "motion-nav-action" : ""}
            >
              {label}
              {label === "MY USS" ? <span aria-hidden="true">↗</span> : null}
            </Link>
          ))}
        </nav>
      </header>
      <section ref={sectionRef} className="motion-story" aria-label="USS Running — community in motion">
        <div ref={stageRef} className="motion-stage" data-chapter="1" data-ready={ready}>
          <div className="motion-background" aria-hidden="true">
            {Array.from(new Set(backgrounds)).map((src) => (
              <img
                key={src}
                src={src}
                alt=""
                className="motion-atmosphere"
                style={{ opacity: src === backgrounds[0] ? 0.55 : 0 }}
                ref={(image) => {
                  backgrounds.forEach((url, index) => {
                    if (url === src) backgroundRefs.current[index] = image;
                  });
                }}
              />
            ))}
            <img ref={ghostRef} className="motion-city-echo" src="/motion/monas-silhouette.svg" alt="" />
          </div>
          <canvas ref={canvasRef} className="motion-canvas" aria-hidden="true" />
          {!ready ? (
            <div className="motion-static-mark" aria-hidden="true">
              <img className="motion-static-uss" src="/uss-logo.png" alt="" />
              <img className="motion-static-monas" src="/motion/monas-silhouette.svg" alt="" />
            </div>
          ) : null}
          <div className="motion-chapters">
            {chapters.map((chapter, index) => (
              <article
                key={index}
                ref={(element) => {
                  chapterRefs.current[index] = element;
                }}
                className="motion-chapter"
                data-state={index === 0 ? "active" : "inactive"}
                aria-hidden={index !== 0}
                inert={index !== 0}
              >
                <div className="motion-copy">
                  <div className="motion-kicker">
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <i aria-hidden="true" />
                    {chapter.kicker}
                  </div>
                  {index === 0 ? <h1>{chapter.headline}</h1> : <h2>{chapter.headline}</h2>}
                  <p>{chapter.description}</p>
                  <div className="motion-actions">
                    <Link className="motion-btn-primary" href={chapter.ctaHref}>
                      {chapter.ctaLabel}
                      <span aria-hidden="true">↗</span>
                    </Link>
                    <Link
                      className="motion-btn-outline"
                      href={index === 0 ? "/about" : index === 1 ? "/runs" : index === 2 ? "/about" : "/runs"}
                    >
                      {index === 0 ? "OUR MOVEMENT" : index === 1 ? "COMMUNITY" : index === 2 ? "THE STORY" : "NEXT RUNS"}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div ref={hudRef} className="motion-hud" aria-hidden="true">
            <div>
              <b>JAKARTA</b>
              <span>6.1754° S</span>
              <span>106.8272° E</span>
            </div>
            <div>
              <span>PEOPLE</span>
              <span>ROUTES</span>
              <span>CULTURE</span>
              <span>MOVEMENT</span>
              <span>A STRONGER</span>
              <span>JAKARTA</span>
            </div>
          </div>
          <nav className="motion-progress" aria-label="Introduction progress">
            <div ref={progressRef} className="motion-progress-line" aria-hidden="true">
              <div className="motion-progress-ticks">
                <span />
                <span />
                <span />
                <span />
              </div>
              <span className="motion-progress-fill" />
              <i />
            </div>
            <span ref={distanceRef} className="motion-distance">
              0000 M
            </span>
            <a href="#uss-next-runs">
              SKIP TO RUNS <span aria-hidden="true">→</span>
            </a>
          </nav>
        </div>
      </section>
    </>
  );
}
