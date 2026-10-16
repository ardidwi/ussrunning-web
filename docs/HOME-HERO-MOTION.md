# Homepage motion refinement — second pass

> Historical second-pass checkpoint. [Particle choreography](HOME-PARTICLE-CHOREOGRAPHY.md)
> supersedes its ring/solid-art visual language; earlier evidence remains unchanged.

Branch: `feature/home-hero-motion-refinement`, based on integrated first-pass
main `3f91007f9382599723cefbb987706d387029cbd3`. Its tree was verified identical to
first-pass feature commit `40640b1`. Composition, copy, navigation, CTA destinations,
four chapters and native scrolling are retained. No main integration is authorized
for this task.

## Motion

- Orbital planes precess slowly in opposing directions. White/red energy points travel along projected elliptical paths at different speeds (19/13 seconds).
- The central USS core floats in perspective over seven seconds; a restrained 12-second light pass crosses the disc and mark. The logo does not spin.
- Pointer parallax uses frame-rate independent interpolation, bounded to 9px horizontal / 6px vertical and 4°/3° tilt. Typography stays still. Monas and particle layers respond at different depths. Touch/coarse pointers are excluded; departing or blurring resets the pointer target.
- Scroll progressively recedes/fades the opening into coherent running-lane sparks, then holds Monas before the final brand transformation. Artwork opacity no longer depends on binary chapter classes. The final stage fades before exiting into Runs.
- A masked 6.2-second energy sweep follows the Monas silhouette. A corresponding red band travels through the particle monument; the architectural underlay remains readable. Mobile retains normal-flow art, animated orbit/core and the lighter masked Monas sweep.
- Copy groups use a small scroll-linked opacity/translation adjustment, with no per-word or perpetual typography animation. The distance/head/fill ease toward actual native-scroll progress without React rendering per frame.

The existing USS palette and assets remain canonical. Aico Creative
([reference](https://www.aicocreative.com/)) informed pacing/depth only; no source,
layout, imagery or animation was copied.

## Implementation / performance

`components/home/hero-motion.ts` provides deterministic, reversible poses and an
exponential interpolation helper. The existing canvas RAF drives particles and
transform/opacity variables. React state remains only for chapter/status changes.
Document positions are cached on resize/ResizeObserver; there are no geometry
reads in the frame loop or pointer-move handler. Desktop/mobile particle and DPR
caps are unchanged. Thirty-six directional opening sparks are added; no new
animation library or dependency is introduced.

Canvas and CSS pause when the hero presentation exits and when the document is
hidden. Observers, events, pending asset callbacks and RAF are cleaned up. The
masked energy sweep paints a bounded artwork region; large filters are not
animated. These are architectural precautions, not a measured FPS/battery claim.

Reduced motion disables float, orbital travel, reflections, energy sweep and
pointer parallax, removes spatial retreat/copy movement, and redraws the calm
canvas only for state/scroll/resize/asset changes. Preference changes apply live.

## Executed validation

- `npm run build`: PASS on final product source. One intermediate nullable closure type error was corrected before final validation.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS.
- `npm run deps:check`: PASS; manifest and lockfile unchanged, no install needed.
- `node --test tests/home-hero-motion.test.mjs`: **14/14 PASS** — bounded poses, smooth handoffs, reversible scroll, reduced motion and frame-rate independent easing.
- `node scripts/verify-home-motion.cjs` against `next start`: **9 cases / 36 assertions PASS** — actual changes over time, resolved orbital paths, pointer/text separation, smooth artwork/exit transitions, distance settling, offscreen pause, live reduced motion and touch/mobile Monas animation.
- Existing `node scripts/verify-home-hero.cjs`, extended with 430px and output redirected through `HERO_EVIDENCE_DIR`: **13 cases / 221 assertions PASS**.
- Existing `scripts/verify-public-shell.cjs`, changing only the evidence destination at execution: **80 route/viewport checks, 2 navigation checks, 1 motion check, 4 zoom checks; errors 0**.
- Runtime, hydration and animation findings: **0** in the homepage browser probes.
- `git diff --check`: PASS.
- Lint not executed: existing unsupported Next.js 16 `next lint` limitation remains.

Widths: **320, 375, 430, 768, 1024, 1440, 1920**; short **1366×500**;
**200% CSS zoom**, keyboard navigation/focus/Escape/skip, CTA clearance, no horizontal
overflow and touch-context checks. Rendered opening, handoff, Monas, mobile and
reduced-motion frames were reviewed; evidence is in `docs/home-motion-evidence`.
An offscreen-playback defect found by the temporal tests was corrected and rerun.

## Limitations

Local production Chromium and browser touch emulation only. Physical iOS/Android,
Safari/Firefox CSS motion-path/mask compatibility, sustained low-end-device FPS,
battery profiling and human product review remain unvalidated. No full unrelated
backend suite was rerun for this homepage-only change. No backend/auth/CMS/database,
migration, provider, content contract or non-homepage product source was changed.
Feature branch only; no main merge or deployment success is claimed.
