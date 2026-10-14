# Public Cutover RCA, Retirement and Merge Readiness

Status: remote-safe audit. No production merge, destructive cleanup, external environment mutation, or secret change is authorized by this document.

Observed main: `e0b4d292ee7e29863eadc52fb259ecd284310d78`.

## 1. PR #13 Vercel failure RCA boundary

Observed on audit branch commits `775eeb607a6fb6422375c962b2d17cb374c989fc`, `82c16e53b8f0ce7ee0788fc6119a1ee6c7f598d3`, `888bdc87fa7c951614e73690e63112d1d192dd50`, `b0d4215a3f33ee3249829f36b8ffc1a8e2c0164c`, and `204b90cdaaf5529366c02da9a2a840e5eb1fc497`: GitHub reports Vercel status `failure` on every one of these commits.

For latest audit head `204b90c...`, GitHub Actions CI run `38505412259` completed successfully; its only job `build` completed successfully through checkout, setup, install and build.

Conclusion: the failure is not presently reproducible as a repository CI build failure. The evidence narrows the failure boundary to Vercel-side deployment/project integration, environment/provisioning, or a Vercel-only build/runtime condition. This is not enough evidence to name the exact root cause because Vercel deployment logs are not available through the current GitHub evidence. Do not hotfix application code solely to make the Vercel status green.

Required next proof before remediation:
1. inspect the exact Vercel deployment log for one failing docs-only commit;
2. identify whether failure occurs before build, during install/build, environment resolution, or deployment provisioning;
3. compare project/root-directory/build-command/environment values with a known READY main deployment;
4. change code only if the Vercel log identifies an application/build defect reproducible against the exact SHA.

## 2. `lib/content.ts` exact current consumer / retirement map

Current main evidence confirms these consumers:

| Legacy adapter | Confirmed current consumer | Replacement target | Retirement state |
| --- | --- | --- | --- |
| `getStories()` | `app/page.tsx`, `app/stories/page.tsx` | BE-12 public Stories | blocked until PR #8 + homepage cutover integrated |
| direct Story SQL / `media_assets.public_url` | `app/stories/[slug]/page.tsx` (not via `lib/content.ts`, but same legacy boundary) | BE-12 public detail + BE-11 safe MediaAsset | blocked until PR #8 integrated |
| `getPartners()` | `app/page.tsx` | BE-14 public Partners | blocked until homepage cutover integrated |
| `getSiteSettings()` | `components/SiteFooter.tsx` | BE-15 `footer.global` | blocked until PR #10 integrated |
| `getMediaCollection()` | `app/page.tsx` | BE-13 public Gallery + BE-11 MediaAsset | blocked until homepage cutover integrated |
| `getHomeHero()` | `app/page.tsx` | BE-15 `homepage.hero` | retain compatibility until BE-15 media/content coverage is validated on staging |
| `getCmsSection("home", "membership")` | `app/page.tsx` | BE-15 `homepage.membership` | blocked until homepage cutover integrated |
| `getCmsSection("home", "story_feature")` | `app/page.tsx` | BE-12/BE-15 typed public content | blocked until homepage cutover integrated and featured behavior confirmed |
| `getLoginHero()` | `components/auth/AuthShell.tsx` | BE-15 `login.visual` | defer to FE-14/public auth-content cutover; do not mix with auth orchestration |
| `getRuns()` | `app/page.tsx`, `components/auth/AuthShell.tsx`; also used internally by `getRunBySlug()` | BE-07 public event reads | partial retirement only; login/home/detail compatibility remain |
| `getRunBySlug()` | `app/runs/[slug]/page.tsx` | BE-07 public event detail | retain until event data migration/coverage gates below pass |

Additional unsafe legacy characteristics inside `lib/content.ts` that should disappear only after consumers migrate:
- seeded Story fallback returns demo production content;
- `getPartners()` direct-queries `public.partners`;
- `getSiteSettings()` carries fallback social/contact values;
- media/gallery and event reads expose `media_assets.public_url` directly;
- legacy hero uses hardcoded Unsplash presentation fallbacks;
- `formatRun()` maps status labels locally and hardcodes fallback image/location/distance labels.

Do not delete `lib/content.ts` as one atomic cleanup. Retire exports independently after zero-consumer proof on latest main.

## 3. `/runs/[slug]` legacy fallback retirement criteria

Current route behavior is authoritative-first:
1. call `getPublicEventDetail(slug)`;
2. if BE-07 succeeds, render `PublicEventDetail` and registration history;
3. if BE-07 fails, call legacy `getRunBySlug(slug)`;
4. if no legacy row and BE-07 returns not-found/validation, return 404;
5. if no legacy row and BE-07 returns another service error, show controlled `ServiceFeedback`;
6. if legacy row exists, render editorial legacy session and explicitly mark registration as not connected.

This fallback must not be removed just because PR #12 makes the listing authoritative. Remove `getRunBySlug()` only after all of these are true:
- every intentionally public legacy session slug that must remain visible has a corresponding BE-07 event or is explicitly retired by product decision;
- old inbound links/bookmarks for retained sessions resolve to BE-07 detail, redirect intentionally, or are explicitly accepted as 404;
- BE-07 detail supports the presentation fields required by the public route for migrated events;
- registration-capable events preserve canonical registration/history behavior;
- successful BE-07 empty/not-found semantics are distinguished from service unavailability; no legacy fallback should hide an authoritative not-found after migration is declared complete;
- staging/current production-like dataset comparison proves zero unintended content loss;
- browser QA covers migrated active event, migrated closed event, unknown slug, service unavailable, and old legacy slug cases;
- product owner approves retirement if any legacy-only editorial sessions would disappear.

Until then, the detail fallback is a deliberate compatibility boundary, not dead code.

## 4. Public PR merge-readiness matrix against observed main

All public cutover PRs remain draft and currently report `mergeable=false` in GitHub metadata, so none is merge-ready remotely. Their heads are also diverged from `e0b4d292...` and require forward reconciliation plus local/runtime validation.

| PR | Head SHA | Ahead / behind vs `e0b4d292...` | Scope | Remote readiness |
| --- | --- | --- | --- | --- |
| #8 Stories | `9ec70370...` | 2 / 4 | `app/stories/page.tsx`, `app/stories/[slug]/page.tsx` | first candidate after INT-02; requires conflict reconciliation + build/browser |
| #9 Partners | `0376b624...` | 2 / 5 | `app/partners/page.tsx` | low blast radius; latest canonical head includes duplicate-meta fix |
| #10 Footer | `37b72e395...` | 1 / 4 | `components/SiteFooter.tsx` | global shared surface; integrate only after route-local candidates prove path |
| #11 Homepage | `4b53f61f...` | 2 / 2 | `app/page.tsx` | highest content aggregation risk; validate after #8/#9/#10 |
| #12 Events | `069c8669...` | 1 / 2 | `app/runs/page.tsx` | listing-only; detail fallback deliberately remains; validate last among runtime cutovers |

Required per-PR gate remains: latest main fetch, semantic conflict review, build, standalone TypeScript, focused tests, mobile/desktop/200% zoom, overflow/runtime/hydration checks, exact SHA, one-at-a-time integration, Vercel READY/core smoke, roadmap checkpoint.

## 5. Duplicate/review branch cleanup proof

PR-reference search returned no PRs for:
- `feature/public-stories-cutover-review`
- `feature/public-partners-cutover-review`
- `feature/footer-site-content-cutover-review`
- `feature/public-home-site-content-review`
- `feature/public-cutover-validation`
- `feature/public-cutover-validation-bundle`

Observed history preservation:
- Stories review head is exactly canonical Stories head `9ec70370...`.
- Partners review head `3c78c770...` is the original canonical implementation and is preserved as an ancestor of canonical Partners head `0376b624...`.
- Footer review head is exactly canonical Footer head `37b72e395...`.
- Homepage review head `3a2a13fe...` is preserved as the direct parent/ancestor of canonical homepage head `4b53f61f...`.
- Both validation branches point exactly at old main `c1e78d6f...`, which is already in current main ancestry and contains no public cutover implementation.

Therefore these six branches are deletion candidates from a history-preservation perspective. Before actual deletion, perform one final fresh check after any concurrent agent work: branch still at the same head, no new PR/reference, canonical branch still exists, and no unique commit was added after this audit. Delete only after that final check; do not delete canonical implementation branches until integration is complete.

Suggested CLI after final verification:

```bash
git push origin --delete feature/public-stories-cutover-review
git push origin --delete feature/public-partners-cutover-review
git push origin --delete feature/footer-site-content-cutover-review
git push origin --delete feature/public-home-site-content-review
git push origin --delete feature/public-cutover-validation
git push origin --delete feature/public-cutover-validation-bundle
git fetch --prune
```

## 6. Recommended immediate execution order

1. Let INT-02 finish and checkpoint current main.
2. Re-compare all public candidate branches against that exact new main.
3. Validate/integrate #8 Stories.
4. Validate/integrate #9 Partners.
5. Validate/integrate #10 Footer.
6. Validate/integrate #11 Homepage.
7. Validate/integrate #12 Events listing.
8. Re-run exact consumer search on latest integrated tree.
9. Retire only proven-dead `lib/content.ts` exports.
10. Revisit `/runs/[slug]` detail fallback only after event dataset migration/product approval.
11. Resolve Vercel PR-preview failure from Vercel deployment evidence; do not treat GitHub CI-successful docs commits as application-code failures without proof.
