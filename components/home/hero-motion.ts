/** Deterministic, reversible poses for the existing native-scroll introduction. */
export function smoothRange(start: number, end: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

export function heroMotionPose(progress: number, reducedMotion: boolean) {
  const retreat = smoothRange(0.04, 0.4, progress);
  return {
    orbitOpacity: 1 - smoothRange(0.14, 0.4, progress),
    orbitScale: reducedMotion ? 1 : 1 - retreat * 0.22,
    monasOpacity: smoothRange(0.38, 0.53, progress) * (1 - smoothRange(0.72, 0.9, progress)) * 0.8,
    routeOpacity: (1 - smoothRange(0.4, 0.56, progress)) * 0.7,
    routeFlatten: reducedMotion ? 0 : smoothRange(0.12, 0.42, progress),
  };
}

/** Frame-rate independent interpolation; clamp tab-resume gaps. */
export function motionEase(deltaMs: number) {
  return 1 - Math.exp(-Math.min(64, Math.max(0, deltaMs)) / 140);
}
