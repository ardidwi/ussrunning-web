/** Deterministic, reversible poses for the existing native-scroll introduction. */
export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent interpolation; clamp tab-resume gaps. */
export function motionEase(deltaMs: number) {
  return 1 - Math.exp(-Math.min(64, Math.max(0, deltaMs)) / 140);
}
