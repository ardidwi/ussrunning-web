"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedCounterProps = {
  value: number;
  suffix?: string;
  duration?: number;
};

export default function AnimatedCounter({
  value,
  suffix = "",
  duration = 1200,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || played) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const run = () => {
      if (reduceMotion) {
        setDisplay(value);
        setPlayed(true);
        return;
      }

      const start = performance.now();

      const frame = (now: number) => {
        const elapsed = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setDisplay(Math.round(value * eased));

        if (elapsed < 1) {
          requestAnimationFrame(frame);
        } else {
          setDisplay(value);
          setPlayed(true);
        }
      };

      requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          run();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [duration, played, value]);

  return <span ref={ref}>{display.toLocaleString("en-US")}{suffix}</span>;
}
