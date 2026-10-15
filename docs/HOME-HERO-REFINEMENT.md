# Homepage hero refinement

Scope: homepage introduction only. Branch: `feature/home-hero-refinement`, based on
`c72788050de7081180d7058d0a2e469fa1ba0333`. Main integration is deliberately excluded
by the current request. No backend, auth, CMS, route, dependency or lockfile changes.

## Design

- Preserve the USS black/white/red palette, Impact display face, shared header and existing CTA destinations.
- Opening: centered existing USS logo on a shaded disc, machined circular rim and two inclined orbit planes. CSS transforms, gradients and restrained red light supply depth without WebGL or a new dependency.
- Monas: a homepage-owned SVG with distinct flame, observation platform, tapered shaft and ceremonial base. The same vector supplies the particle targets and architectural underlay; smaller particles preserve the silhouette. This is a stylized illustration, not photography.
- Desktop retains the existing canvas and scroll narrative. Monas holds before the final USS transformation. Mobile uses normal-flow artwork above the copy so the monument and typography cannot obscure each other; subtle particle texture remains in the intermediate/final chapters.
- Body copy is larger and sentence case. CTA targets are at least 44px high. The progress strip stays on one row, and homepage-only scroll clearance protects links from fixed navigation/progress chrome.
- One H1 introduces the page; later chapters are H2. Existing content inputs and all four chapters remain intact.

The supplied images informed lighting, hierarchy and silhouette legibility. Aico Creative
was reviewed as a creative reference only: https://www.aicocreative.com/ . No reference
code, imagery, text or brand assets were copied.

## Ownership and motion

`components/HomeMotionExperience.tsx` owns the hero, local reusable `HeroOrbit`,
canvas and chapter state. `app/home-motion.css` owns its styles. Only the obsolete
homepage override block was removed from `app/prototype-refine.css`; its other rules
are unchanged. `public/monas-hero.svg` is separate from the legacy mask.

Reduced-motion changes are observed live. CSS orbit animation stops, particles stay
still between scroll/resize/asset updates, and pointer displacement is disabled.
Canvas rendering pauses outside the introduction and in a hidden document. The
opening does not continuously redraw its empty canvas. Existing particle/DPR caps
are retained. No FPS or physical-device performance guarantee is claimed.

## Executed validation

- `npm run build`: PASS on final product source.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS.
- `npm run deps:check`: PASS; no manifest/lockfile changes. Clean install not repeated because the dependency graph is unchanged.
- `node --liftoff-only --wasm-num-compilation-tasks=1 --test tests/dynamic-site-content.test.mjs`: **44/44 PASS**, validating the existing typed public content boundary. No persistent database operations.
- `node scripts/verify-home-hero.cjs` against `next start`: **12 cases / 194 assertions PASS**. Runtime exceptions **0**, hydration warnings **0**.
- Existing `scripts/verify-public-shell.cjs`, with only its output folder redirected to this task: **80 route/viewport checks, 2 navigation checks, 1 motion check, 4 zoom checks; errors 0**. Final subsequent CSS change only suppresses duplicate decorative particles in mobile chapters; the final homepage suite covers that build.
- `git diff --check`: PASS.
- Lint not run: the repository's existing `next lint` script is unsupported under Next.js 16; tooling was not changed.

Homepage matrix: **320×568, 375×812, 768×1024, 1024×768, 1440×900,
1920×1080, 1366×500**, plus **200% CSS zoom**. Checks cover all chapters,
horizontal overflow, wrapping, artwork bounds, reachable CTA, visible focus, mobile
menu/Escape, skip handoff and live reduced-motion switching. About/login smoke and
the existing wider public-shell matrix check scoping. Desktop/mobile screenshots
were visually inspected; the mobile artwork/copy collision and intrinsic SVG grid
overflow found during review were corrected and checked again.

Evidence: `docs/home-hero-evidence/browser-report.json`,
`docs/home-hero-evidence/public-shell/public-shell-audit.json`, and selected
before/after screenshots. Run browser checks on the server's advertised `localhost`
origin; `127.0.0.1` is rejected by the existing Next development-origin policy.
No origin configuration was changed.

## Limitations / review

- Chromium browser emulation and local production build were tested; physical iOS/Android, Safari, GPU/battery profiling and human product approval remain pending.
- Small/short screens scroll naturally to supporting copy and CTA; the entire four-chapter narrative is not compressed into one viewport.
- The monument is deliberately vector-based; no new photographic Jakarta asset was commissioned.
- Feature-branch delivery only. Main was not merged or pushed, and no deployment/CI success is implied by local validation.
