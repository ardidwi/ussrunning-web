"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { motionEase, smoothRange } from "@/components/home/hero-motion";

import { ParticleField } from "@/components/home/ParticleField";
import { mobileParticleProgress } from "@/components/home/particle-motion";

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
  const distanceRef = useRef<HTMLSpanElement | null>(null);
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
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let reduced = motionQuery.matches;
    let progress = 0, displayed = 0, previousMeters = -1;
    let top = 0, range = 1, height = window.innerHeight, storyInView = true;
    let compact = false, logoAnchor = 0, monasAnchor = 1;
    let articles: Array<{ element: HTMLElement; top: number; height: number }> = [];
    const field = new ParticleField(canvas, delta => {
      displayed = reduced ? progress : displayed + (progress-displayed)*motionEase(delta);
      section.style.setProperty("--hero-travel",String(displayed));
      const meters = Math.round(displayed*5000);
      if (meters !== previousMeters && distanceRef.current) {
        distanceRef.current.textContent = `${String(meters).padStart(4,"0")} M`;
        previousMeters = meters;
      }
    });
    const syncPlayback = () => {
      const visible = storyInView && !document.hidden;
      section.dataset.motionVisible = String(visible);
      field.setVisible(visible);
    };
    const updateProgress = () => {
      const offset = window.scrollY-top;
      progress = clamp(offset/range);
      field.setProgress(compact ? mobileParticleProgress(window.scrollY,logoAnchor,monasAnchor,top+range) : progress);
      section.style.setProperty("--hero-stage-opacity",String(reduced ? 1
        : 1-smoothRange(0,height*.5,Math.max(0,offset-range))));
      const middle = window.scrollY+height*.5;
      const current = articles.findIndex(article => article.top+article.height > middle);
      setActiveChapter(current < 0 ? 3 : current);
      for (const article of articles) {
        const distance = Math.abs(middle-(article.top+article.height*.5));
        const presence = 1-smoothRange(.1,1,distance/((article.height+height)*.5));
        article.element.style.setProperty("--copy-presence",String(reduced ? 1 : .25+presence*.75));
        article.element.style.setProperty("--copy-shift",`${reduced ? 0 : (1-presence)*12}px`);
      }
      storyInView = offset >= -4 && offset <= range+height*.5;
      setStoryActive(storyInView);
      syncPlayback();
    };
    const resize = () => {
      height = window.innerHeight;
      top = section.getBoundingClientRect().top+window.scrollY;
      range = Math.max(1,section.offsetHeight-height);
      compact = window.innerWidth <= 860;
      articles = Array.from(section.querySelectorAll<HTMLElement>(".uss-motion-chapter")).map(element => ({
        element, top:element.getBoundingClientRect().top+window.scrollY, height:element.offsetHeight,
      }));
      const slots = Array.from(section.querySelectorAll<HTMLElement>(".uss-hero-mobile-art"));
      const center = Math.min(240,Math.max(180,height*.28));
      const anchors = slots.map(element => element.getBoundingClientRect().top+window.scrollY+element.offsetHeight*.5-center);
      [logoAnchor,monasAnchor] = [anchors[0] || 0,anchors[1] || range*.65];
      field.resize();
      updateProgress();
    };
    const resetPointer = () => field.setPointer(0,0,false);
    const pointer = (event: PointerEvent) => field.setPointer(event.clientX,event.clientY,
      event.pointerType === "mouse" && hoverQuery.matches && !reduced && storyInView);
    const motionChange = () => { reduced=motionQuery.matches; field.setReduced(reduced); updateProgress(); };
    field.setReduced(reduced);
    resize();
    const layoutObserver = new ResizeObserver(resize);
    layoutObserver.observe(section);
    window.addEventListener("scroll",updateProgress,{passive:true});
    window.addEventListener("resize",resize);
    window.addEventListener("pointermove",pointer,{passive:true});
    window.addEventListener("blur",resetPointer);
    document.addEventListener("pointerleave",resetPointer);
    document.addEventListener("visibilitychange",syncPlayback);
    motionQuery.addEventListener("change",motionChange);
    return () => {
      field.destroy();
      layoutObserver.disconnect();
      window.removeEventListener("scroll",updateProgress);
      window.removeEventListener("resize",resize);
      window.removeEventListener("pointermove",pointer);
      window.removeEventListener("blur",resetPointer);
      document.removeEventListener("pointerleave",resetPointer);
      document.removeEventListener("visibilitychange",syncPlayback);
      motionQuery.removeEventListener("change",motionChange);
    };
  }, []);

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
        <div className="uss-motion-scrim" aria-hidden="true" />
        <canvas ref={canvasRef} className="uss-motion-canvas" aria-hidden="true" />
        <div className="uss-motion-hud" aria-hidden="true">{hud.map((item) => <span key={item}>{item}</span>)}</div>
        <div className="uss-motion-est" aria-hidden="true">{established || "EST. 2024"}</div>
      </div>

      <div className="uss-motion-chapters">
        {chapters.map((chapter, index) => (
          <article className={`uss-motion-chapter ${activeChapter === index ? "is-active" : ""}`} key={chapter.kicker}>
            {(index === 0 || index === 2) && (
              <div className="uss-hero-mobile-art" aria-hidden="true" />
            )}
            <div className="uss-motion-copy">
              <span className="uss-motion-kicker"><b>{String(index + 1).padStart(2, "0")}</b><i />{chapter.kicker}</span>
              {index === 0
                ? <h1>{chapter.headline}</h1>
                : <h2>{chapter.headline}</h2>}
              <p>{chapter.description}</p>
              <Link href={chapter.href}>{chapter.action} ↗</Link>
            </div>
          </article>
        ))}
      </div>

      <nav className={`uss-motion-scrubber ${storyActive ? "is-on" : ""}`} aria-label="USS introduction progress">
        <div className="uss-motion-track" aria-hidden="true">
          <span className="uss-motion-fill" />
          <span className="uss-motion-head" />
          {[0, 1, 2, 3].map((item) => <i key={item} style={{ left: `${(item / 3) * 100}%` }} />)}
        </div>
        <span ref={distanceRef} className="uss-motion-distance">0000 M</span>
        <span className="uss-motion-divider" aria-hidden="true" />
        <a href="#uss-next-runs">SKIP TO RUNS →</a>
      </nav>
    </section>
  );
}
