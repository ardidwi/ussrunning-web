# Public Cutover Integration Notes

Status: remote integration handoff. No production merge authority is implied by this document.

Latest observed `main`: `b3e74d3c3f0367c9af380da820dd43ab5d81b1e7` (`feat(auth): connect trusted frontend account and verification flows`). This means INT-01 advanced `main` after the first public cutover branches were created. Every public branch must therefore re-audit current `origin/main` immediately before validation/integration.

## Integration order

Integrate one candidate at a time so regressions remain attributable:

1. PR #8 / `feature/public-stories-cutover`
2. PR #9 / `feature/public-partners-cutover`
3. PR #10 / `feature/footer-site-content-cutover`
4. PR #11 / `feature/public-home-site-content-cutover`
5. PR #12 / `feature/public-events-primary-listing`
6. PR #13 / `feature/public-content-retirement-audit`

Do not combine these into one mega-merge.

## Legacy adapter dependency map

`lib/content.ts` currently contains the legacy adapters that remain relevant to public surfaces:

- `getStories()` -> old public Stories listing/fallback; target BE-12.
- `getPartners()` -> old partner-name read; target BE-14.
- `getSiteSettings()` -> old footer social/contact read; target BE-15 `footer.global`.
- `getMediaCollection()` -> old gallery/public_url read; target BE-13 + BE-11 safe MediaAsset DTOs.
- `getHomeHero()` / `getCmsSection()` -> old CMS tables; target BE-15 homepage/auth slots.
- `getRuns()` / `getRunBySlug()` -> old public Events/session compatibility; target BE-07 while preserving proven fallback until retirement is safe.

Retirement is allowed only after all consumers are proven migrated on latest `main`, build/TypeScript/browser checks pass, and no demo/fake production data returns on backend empty/unavailable states.

## Duplicate branch safety audit

Observed duplicate/review branches:

- `feature/public-stories-cutover-review` points to the same head SHA as the canonical Stories cutover at the time inspected: `9ec70370ad812f7bab4ecfa5a137fc6a2e150dee`.
- `feature/public-partners-cutover-review` points to the original canonical Partners implementation SHA `3c78c77057b225ba968ac58b176ea52c2a12ab33`. The canonical Partners branch has since advanced with follow-up cleanup, so the review branch must not become the merge source.
- `feature/footer-site-content-cutover-review` points to the same inspected footer implementation SHA `37b72e39542571e9ec511de192674c382fccdc2a`.
- `feature/public-home-site-content-review` points to `3a2a13fe156bbbf0e6ba66b47c171bf5b8b8a10c`, which is an ancestor of canonical homepage head `4b53f61f89e011962ff6e99b07f83a3fa9358b64`; it is stale, not canonical.
- `feature/public-cutover-validation` and `feature/public-cutover-validation-bundle` both pointed to old `main` `c1e78d6f6a2776765bcc75439b49483a2c6acc96` and contained no public cutover implementation at inspection time.

Cleanup rule: do not delete by name alone. Before deletion verify no unique commits, no open PR/reference, and canonical implementation history remains preserved. Review/validation branches above are cleanup candidates only after that final check.

## PR-by-PR remote diff review

### PR #8 — Stories

Good:
- removes direct `public.stories` query from the detail route;
- uses BE-12 public actions;
- honors `MediaAsset.deliveryAvailable` before rendering cover media;
- distinguishes not-found from temporary unavailable.

Validation focus:
- verify route-level error UX for temporary unavailability;
- verify Story slugs/links remain valid and encoded safely by the router contract;
- verify empty listing state does not show seeded/demo content;
- build + TypeScript + `/stories` + `/stories/[slug]` browser regression.

### PR #9 — Partners

Good:
- reads BE-14 public contract;
- logo only renders when delivery is available;
- existing narrative/partner-opportunity sections are preserved.

Remote review found duplicate metadata copy when a partner had no description and no website. Canonical branch was corrected in follow-up commit `0376b6244e127950d6c7ffb62331ad847b887d67`; use latest branch head, not the stale review branch.

Validation focus:
- empty/populated/logo-unavailable cases;
- website link validation remains backend-owned;
- no duplicated type/tier copy;
- responsive card layout.

### PR #10 — Footer

Good:
- switches from legacy `getSiteSettings()` to BE-15 `footer.global`;
- public site service already provides typed default/unavailable fallback behavior;
- social/contact/newsletter copy becomes CMS-driven.

Validation focus:
- published/default/unavailable states;
- empty or malformed external links do not create broken navigation;
- mailto behavior;
- footer layout across shared public pages and mobile widths.

### PR #11 — Homepage

Good:
- Stories -> BE-12;
- Gallery -> BE-13;
- Partners -> BE-14;
- major homepage content -> BE-15;
- removes fake collaborator and fake Story production fallback.

Known intentional compatibility:
- homepage still references legacy `getHomeHero()` and `getRuns()` as compatibility/fallback paths. Do not delete these blindly until BE-15 media coverage and BE-07 public event coverage are proven on staging/current data.

Validation focus:
- HomeMotionExperience regression;
- section empty states;
- BE-11 media delivery-null behavior;
- no runtime/hydration warnings;
- no fake brands/stories when backends return empty data.

### PR #12 — Events listing

Good:
- BE-07 list becomes authoritative when available;
- avoids simultaneous rendering of BE-07 events and legacy sessions;
- legacy sessions are only loaded when BE-07 listing fails.

Validation focus:
- successful empty BE-07 result must remain honestly empty rather than fall back to legacy sessions;
- unavailable BE-07 path may show compatibility sessions;
- cursor behavior;
- `/runs/[slug]` + registration routes remain unchanged and valid.

## Current main overlap note

The observed INT-01 main commit modifies auth/join/dashboard verification flows and does not directly modify the isolated Stories, Partners, Footer, Homepage or `/runs` files in these public cutover PRs. That reduces immediate textual-conflict risk, but every branch is now behind `main`; validation must use latest `origin/main` and integration must be forward-only.

## Merge acceptance checklist

For every public cutover PR:

- fetch latest `origin/main`;
- inspect semantic overlap, not only textual conflicts;
- run `npm run build`;
- run standalone TypeScript;
- run focused domain/browser tests;
- check mobile + desktop and 200% zoom for affected page;
- confirm no horizontal overflow;
- confirm no runtime/hydration warnings;
- confirm public MediaAsset consumers require `deliveryAvailable` + usable `url`;
- verify exact branch SHA used for validation;
- integrate one PR only;
- verify exact new main SHA and Vercel READY/core page smoke;
- checkpoint roadmap/docs before the next PR.

No force push, no blind `ours/theirs`, no bulk merge, no automatic legacy adapter deletion.
