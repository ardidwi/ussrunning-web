# Public Content Retirement Audit

Status: remote audit candidate. This document does not authorize destructive cleanup by itself.

Starting main: `c1e78d6f6a2776765bcc75439b49483a2c6acc96`.

## Purpose

Retire legacy public-content adapters only after the corresponding contract cutovers have been locally validated and integrated one-by-one. Do not bundle all public cutovers into one merge.

Required integration order:

1. Stories -> validate -> merge
2. Partners -> validate -> merge
3. Footer -> validate -> merge
4. Homepage -> validate -> merge
5. Events listing -> validate -> merge
6. Re-audit `lib/content.ts` usage
7. Remove only adapters proven dead

## Existing remote cutover candidates

- `feature/public-stories-cutover` -> BE-12 public Stories contract
- `feature/public-partners-cutover` -> BE-14 public Partners contract
- `feature/footer-site-content-cutover` -> BE-15 `footer.global`
- `feature/public-home-site-content-cutover` -> BE-12/13/14/15 public contracts
- `feature/public-events-primary-listing` -> BE-07 public Events list

Each branch must pass local build, standalone TypeScript, route-specific browser regression, latest-main conflict review, and runtime/hydration checks before merge.

## Legacy `lib/content.ts` retirement candidates

`lib/content.ts` currently contains direct-table/public-schema reads and presentation fallbacks that predate the newer backend contracts. These are candidates for retirement only after all consumers are proven migrated.

### Candidate: `getStories()`

Legacy behavior:
- reads `public.stories` directly;
- joins `public.media_assets.public_url` directly;
- falls back to a seeded presentation Story when the query fails or returns empty.

Target:
- BE-12 public Stories service is authoritative.
- No demo Story should appear in production because backend data is unavailable or intentionally empty.

Removal gate:
- `/stories`, `/stories/[slug]`, homepage Stories, and any other callers no longer import `getStories()`.

### Candidate: `getPartners()`

Legacy behavior:
- reads `public.partners` directly;
- exposes only names;
- bypasses BE-14 public visibility/lifecycle/media mapping.

Target:
- BE-14 public partner contract is authoritative.

Removal gate:
- `/partners`, homepage partners, and all other public consumers use BE-14.

### Candidate: `getRuns()` / `getRunBySlug()`

Legacy behavior:
- reads legacy `public.events` fields directly;
- hardcodes Jakarta timezone formatting and status mapping;
- uses presentation fallback runs when DB is not configured;
- directly reads `media_assets.public_url`.

Target:
- BE-07 public event list/detail is authoritative.

Removal gate:
- `/runs` and `/runs/[slug]` no longer depend on legacy fallback for production behavior;
- existing canonical `/runs/[slug]` compatibility is preserved;
- registration behavior remains FE-07/BE-08 owned.

Do not remove event fallback until local regression proves current production/staging data exists in the BE-07 path and removing fallback will not blank existing public event content unintentionally.

### Candidate: `getHomeHero()` / `getLoginHero()` / `getCmsSection()`

Legacy behavior:
- accesses older `public.cms_pages` / `public.cms_sections` tables;
- embeds hardcoded presentation fallback copy and Unsplash URLs.

Target:
- BE-15 typed site-content slots.

Removal gate:
- homepage hero uses `homepage.hero`;
- login visual/copy use `login.visual` and `auth.login`;
- register copy uses `auth.register`;
- no remaining caller depends on legacy CMS tables.

Do not retire login/register helpers while INT-01 auth cutover is active unless the auth agent has already migrated those exact imports.

### Candidate: `getSiteSettings()`

Legacy behavior:
- reads `public.site_settings` directly;
- hardcodes Instagram, Strava and contact email fallbacks.

Target:
- BE-15 `footer.global`.

Removal gate:
- footer and any other social/contact consumers use BE-15.

### Candidate: `getMediaCollection()`

Legacy behavior:
- reads media collection tables and `public_url` directly.

Target:
- BE-13 public Gallery contract / BE-11 delivery-safe MediaAsset mapping.

Removal gate:
- all public gallery/media consumers use backend public DTOs rather than DB storage fields.

## Media exposure rule

Public UI may consume only delivery-safe media DTOs. Do not expose or infer:

- storage keys/object keys as public URLs;
- provider credentials;
- internal bucket/container identifiers;
- private origin URLs;
- signed upload inputs;
- media records whose delivery state is unavailable.

A public image should render only when the authoritative DTO says delivery is available and provides a usable public URL. `url: null` must remain an honest unavailable state.

## Hardcoded public copy audit

### About page

`app/about/page.tsx` currently hardcodes mission, timeline, hero, story, and CTA copy.

This content is CMS-eligible conceptually, but BE-15 currently defines only homepage, login/register, and global footer slots. Do not invent `about.*` keys inside FE code and do not overload unrelated homepage slots. If dynamic About content is desired, add a separately approved backend slot/schema expansion after FE-14 is stable.

### Membership page

`app/membership/page.tsx` currently hardcodes benefits, steps, hero, and CTA copy.

BE-15 has `homepage.membership`, but that slot is not a general Membership-page document contract. Do not silently reuse it for `/membership`. Dynamic Membership-page content requires an explicit backend contract expansion.

## Branch safety / cleanup

Do not delete remote review/validation branches based only on naming.

Before deletion verify:

1. branch has no commits absent from the canonical implementation branch or `main`;
2. no open PR or documentation references the branch;
3. implementation commits are preserved;
4. current main contains the intended code if the branch was already integrated.

No force push, reset, history rewrite, or blind branch deletion.

## Final retirement gate

Only remove legacy adapters when all of the following are true:

- all known public consumers are migrated;
- build and standalone TypeScript pass;
- public route browser regressions pass;
- no hydration/runtime warnings are introduced;
- media unavailable/null states remain honest;
- public empty data remains empty instead of showing demo records;
- latest `origin/main` was re-audited immediately before integration.

If any consumer remains uncertain, keep the adapter and mark it deprecated instead of deleting it.
