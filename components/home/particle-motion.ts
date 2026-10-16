import { smoothRange } from "./hero-motion";

export type ParticleShape = "free" | "logo" | "stream" | "monas" | "release";
export type ParticlePhase = "FREE" | "ATTRACTING" | "FORMED" | "DISPERSING" | "TRAVELING";
export type ParticlePose = { from: ParticleShape; to: ParticleShape; blend: number; phase: ParticlePhase };

export function particlePose(progress: number, entrance: number, reduced: boolean): ParticlePose {
  const p = Math.max(0, Math.min(1, progress));
  if (reduced) {
    const shape = p < .5 ? "logo" : "monas";
    return { from: shape, to: shape, blend: 1, phase: "FORMED" };
  }
  if (p < .2) {
    const blend = Math.max(smoothRange(0, .2, p), Math.max(0, Math.min(1, entrance)));
    return { from: "free", to: "logo", blend, phase: blend < .03 ? "FREE" : blend >= .99 ? "FORMED" : "ATTRACTING" };
  }
  if (p < .35) return { from: "logo", to: "logo", blend: 1, phase: "FORMED" };
  if (p < .5) return { from: "logo", to: "stream", blend: smoothRange(.35, .5, p), phase: p < .42 ? "DISPERSING" : "TRAVELING" };
  if (p < .7) return { from: "stream", to: "monas", blend: smoothRange(.5, .7, p), phase: "ATTRACTING" };
  if (p < .85) return { from: "monas", to: "monas", blend: 1, phase: "FORMED" };
  return { from: "monas", to: "release", blend: smoothRange(.85, 1, p), phase: p < .92 ? "DISPERSING" : "TRAVELING" };
}

export function seed(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** Offsets distribute departures/arrivals without breaking shared endpoints. */
export function staggerBlend(blend: number, phase: number) {
  return smoothRange(phase * .16, .82 + phase * .16, blend);
}

export function particleBudget(width: number) {
  return width <= 860 ? 1300 : width < 1280 ? 2800 : 3800;
}

export function particleProjection(width: number, height: number, mobile: boolean) {
  const y = mobile ? Math.min(240,Math.max(180,height*.28)) : height*.5;
  return {
    x:width*(mobile ? .5 : .73), y,
    // Keep Monas's flame below the mobile header and its whole form in the reserved band.
    scale:mobile ? Math.min(width*.13,height*.088,52,(y-94)/2.5) : Math.min(width*.075,height*.15),
  };
}

/** On phones the holds align with the existing reserved artwork slots, above the copy. */
export function mobileParticleProgress(scroll: number, logoAnchor: number, monasAnchor: number, end: number) {
  const logoEnd = Math.max(1,logoAnchor+100);
  const monasStart = Math.max(logoEnd+1,monasAnchor-110);
  const monasEnd = Math.max(monasStart+1,monasAnchor+110);
  if (scroll <= logoEnd) return smoothRange(0,logoEnd,scroll)*.35;
  if (scroll <= monasStart) return .35+smoothRange(logoEnd,monasStart,scroll)*.35;
  if (scroll <= monasEnd) return .7+smoothRange(monasStart,monasEnd,scroll)*.15;
  return .85+smoothRange(monasEnd,Math.max(monasEnd+1,end),scroll)*.15;
}
