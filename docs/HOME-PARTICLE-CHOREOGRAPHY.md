# Homepage particle choreography

Continuation of `feature/home-hero-motion-refinement` at `746c828`; not a homepage
rebuild. Main remained `3f91007f9382599723cefbb987706d387029cbd3` at the final fetch.
The previous motion branch is still unmerged, so the existing branch is retained.
This task explicitly excludes automatic main integration.

## Visible language and scope

The central USS and Monas are now made entirely from canvas particles. Removed:
solid logo disc, concentric rims, orbital planes, reflection overlays, visible Monas
SVG/energy underlay, and static mobile artwork. The existing navigation logo and
background photograph remain separate from the particle artwork. Copy, headings,
CTA destinations, four chapters, native scrolling and distance/progress UI remain.
No fake community metric or partner dataset was added.

## Architecture / files

- `components/HomeMotionExperience.tsx`: existing content, scroll/cache/lifecycle owner; substantially smaller after moving rendering out of React.
- `components/home/ParticleField.ts`: single Canvas 2D renderer, one persistent particle population, frame-independent attraction, internal life, depth, restrained pointer disturbance and short directional trails.
- `components/home/particle-targets.ts`: offscreen image sampling; USS PNG and Monas SVG are references only. Transparent/dark pixels are excluded, with 40% of samples explicitly allocated to contours. Targets are Float32 arrays.
- `components/home/particle-motion.ts`: typed FREE / ATTRACTING / FORMED / DISPERSING / TRAVELING choreography, seeded timing variation, adaptive budgets and mobile framing/progression.
- `components/home/hero-motion.ts`: retained shared easing helpers; obsolete orbit pose removed.
- `app/home-motion.css`: removes conflicting ring/solid-art styling; preserves page and control geometry.
- Existing homepage unit/browser scripts now verify particle formations instead of obsolete orbit/image layers. Earlier evidence remains preserved in the prior task folders.

USS particles arrive from scattered origins across several directions, resolve into
the sampled mark, shimmer during the hold, then leave their targets and stream
diagonally. The **same position buffer and particle IDs** gather into Monas, remain
alive with a restrained traveling red accent, then release toward the later scene.
There is no shape-layer opacity crossfade. Initial formation also runs over roughly
2.6 seconds without waiting for scroll; no interaction is gated by that entrance.

Desktop progression: assemble USS (0–20%), hold (20–35%), disperse/stream (35–50%),
assemble Monas (50–70%), hold (70–85%), release (85–100%). On mobile this same
continuous timeline is mapped to the existing reserved artwork slots so holds are
visible above their copy. Framing caps keep the whole monument below the header.

## Performance / accessibility

Budgets: **1,300 mobile, 2,800 compact desktop, 3,800 wide desktop**; DPR capped at
1.5. Sampling resolution is lower on mobile. Source images are cached; target
generation happens when the density budget changes, not on scroll. Positions,
previous positions and rendering geometry use preallocated typed arrays. Six
batched fills and at most two trail strokes replace thousands of fill submissions.
There are no per-frame React updates or geometry reads, no DOM particle nodes and
no added animation/3D dependency.

Pointer displacement is limited to five pixels and disabled on touch/coarse input.
Reduced motion immediately resolves stable particle USS/Monas targets, without
drift, trails or pointer effects; scroll changes remain available. Offscreen and
hidden-document presentation pauses the renderer. Late target callbacks, observers,
events and RAF are cleaned up. A disconnected-canvas guard also prevents a queued
frame between App Router DOM detachment and passive effect cleanup.

## Executed validation

- `npm run build`: PASS on final product source.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS.
- `npm run deps:check`: PASS; no manifest/lockfile change or new install.
- `node --test tests/home-hero-motion.test.mjs`: **23/23 PASS**.
- `node scripts/verify-home-motion.cjs` against local `next start`: **11 cases / 53 assertions PASS**. Includes actual rendered pixel agreement with invisible USS/Monas masks, idle formation, held life, material departure, population preservation, reverse scroll, touch, reduced motion, missing-mask degradation, visibility-handler pause/resume, and App Router remount with **zero orphan draws**.
- Existing `node scripts/verify-home-hero.cjs`, output redirected through `HERO_EVIDENCE_DIR`: **15 cases / 267 assertions PASS**. Obsolete ring/solid-image checks were replaced with single-renderer/no-overlay checks; navigation, text, CTA, focus and scrolling checks are retained.
- Existing `scripts/verify-public-shell.cjs`, only its evidence destination redirected at execution: **80 route/viewport checks, 2 navigation checks, 1 motion check, 4 zoom checks; errors 0**.
- Runtime exceptions **0**, hydration warnings **0**, canvas/animation findings **0** in homepage probes.
- `git diff --check`: PASS. Unsupported Next.js 16 `next lint` was not run or changed.

Matrix: **320, 375, 430, 768, 1024, 1440, 1920**, plus **860/861** breakpoint
boundaries, **1366×500**, **200% CSS zoom**, keyboard/focus/Escape/skip, touch
emulation and live reduced motion. Intrinsic 44px CTA size is verified separately
from subpixel-translated DOMRect rounding. Opening, gather/stream/formed/release,
320px and tablet framing screenshots were reviewed. The renderer teardown defect
found in the stricter App Router test was fixed, not suppressed. Evidence is in
`docs/home-particle-evidence`.

## Limitations / safety

Chromium/local production build and touch emulation only. Physical-device, Safari,
Firefox, long-session heap/battery and sustained FPS profiling remain unvalidated;
no universal frame-rate claim is made. Visibility handling uses a controlled browser
visibility-event probe, not physical tab/device QA. Failed mask loading degrades to
atmosphere/fallback targets; a full reload retries failed cached sources. Future
partner/community data-driven visuals still require authoritative inputs.

No backend, auth, CMS, admin, database, migrations, providers, dependencies or
non-homepage product source changed. No persistent data mutations, migrations,
production email or deployment operations.
Feature branch delivery only; main was not merged or pushed, and deployment/CI
verification is not claimed.
