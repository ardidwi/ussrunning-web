# Public Content Retirement Audit

Status: post-cutover retirement checkpoint. This document records what is integrated and what still requires proof before removal. It does not authorize destructive cleanup by branch name or guesswork.

## Integrated public cutovers

The required public sequence was completed atomically and each source candidate passed the strengthened remote CI gate (`npm ci --ignore-scripts`, dependency graph, TypeScript, full Node domain/integration suite, production build) before integration.

| Surface | Authoritative contract | Main commit | Exact Vercel development deployment |
| --- | --- | --- | --- |
| Stories | BE-12 | `615a02573197abf392ea1d373005a22b72cf23af` | `dpl_FxYuoQC7j8jhvXtvvT254iYh1gRT` READY |
| Partners | BE-14 | `ca5c1d5b18f71ab0bd1540352ee6f4b740feb509` | `dpl_GW84qNMYPSvEAnQexM3MriiguHj8` READY |
| Footer | BE-15 `footer.global` | `015fc9ffe5419ea4b140c79940d209c2a9c87f39` | `dpl_4k4in8q7aKUruZcPmZmjndEMTK1v` READY |
| Homepage | BE-12/13/14/15 | `6a086e14255b7660a6525dc7892e44ebef3d08f8` | `dpl_5im1quCmz6kCNEdD8hPNHkC8e4FH` READY |
| Events listing | BE-07 | `a976cb1fdff22eface4a3ba104da5b46acf620b9` | `dpl_283agacJpyy5K6ju7tH4Zsmt2oXH` READY |

Browser/manual product smoke remains a separate evidence category. Automated access to protected Vercel deployment URLs is currently blocked by connector authorization/protection, so no browser pass is inferred from deployment readiness.

## Fallback policy now enforced

Editorial/presentation defaults are allowed only where they cannot masquerade as authoritative domain state.

- Stories: BE-12 success with zero published items may show the centralized `story-starter` presentation content. BE-12 failure shows unavailable feedback instead.
- Partners: BE-14 supplies the partner records. A valid empty catalog retains only the partnership editorial presentation; service failure is explicitly unavailable. No fake partner records are injected.
- Footer and typed site-content slots: BE-15 owns approved typed defaults. Defaults contain presentation copy only and never runtime secrets or domain records.
- Homepage: CMS/site-content presentation remains visible when safe; empty/failure handling is distinct for Stories, Partners and Gallery. Fake brand records were removed.
- Events: BE-07 is authoritative for `/runs`. A valid empty set and service failure are distinct; unavailable authoritative event data is never replaced with demo event records.

Never use fallback content for registration state, capacity/remaining slots, price, role/permission, account lifecycle, attendance, event pass/QR, payment state, sponsorship relationships or any other authoritative operational record.

## Legacy `lib/content.ts` candidates

Legacy helpers remain until every consumer is proven migrated. Do not remove an export solely because the primary route moved.

### `getStories()`

Primary public Stories and homepage Stories no longer depend on this legacy query. Removal still requires repository-wide consumer proof. If no consumer remains, retire the direct `public.stories`/media join and its old seed path in one focused cleanup.

### `getPartners()`

Primary Partners and homepage partner data now use BE-14. Removal requires proof that no other consumer imports the legacy name-only adapter.

### `getMediaCollection()`

Homepage Gallery now uses BE-13 delivery-safe DTOs. Remove the direct media-collection query only after all remaining consumers are enumerated and migrated.

### `getRuns()` / `getRunBySlug()`

`/runs` listing now uses BE-07 and no longer falls back to demo records on service failure. These helpers must not be removed yet: homepage/event-detail/auth surfaces may still contain compatibility or presentation dependencies. `/runs/[slug]` compatibility remains an explicit gate. Retire only after route crosswalk, inbound-link coverage and registration behavior are proven.

### `getHomeHero()` / `getLoginHero()` / `getCmsSection()`

Homepage is partially migrated to BE-15 but still retains compatibility presentation helpers. Login/auth visual migration belongs to FE-14 and must not alter auth policy, return URLs, verification tokens, provider/session behavior or account lifecycle. Retire legacy CMS table access only after those exact consumers are migrated.

### `getSiteSettings()`

Footer now uses BE-15 `footer.global`. Remove only after proving no other social/contact consumer still imports it.

## Media exposure rule

Public UI may render media only when the authoritative DTO reports delivery availability and provides a usable URL. Storage keys, private origins, provider credentials, upload inputs and unavailable media must never be exposed as public delivery URLs.

## Branch cleanup gate

A merged or `review`-named branch is not automatically deletable. Before cleanup verify all of the following:

1. canonical implementation is integrated in current main;
2. branch has no unique required commit;
3. no open PR or active workflow references it;
4. no roadmap/checkpoint requires the branch as the only preserved evidence.

Only then delete the local/remote branch and prune refs.

## Remaining public-content work

- FE-13 Partner/Sponsor CMS: local Codex work exists but was not yet present on the remote repository at this checkpoint; do not reconstruct or overwrite it from this audit.
- FE-14 Dynamic Site Content Editor: still required for managed homepage/login/register/footer editorial updates.
- `/runs/[slug]` and other legacy event compatibility consumers require a separate exact audit before legacy event adapters are removed.
- Manual/browser Vercel product audit remains outstanding where connector protection prevents automated access.

This checkpoint closes the atomic public listing/content cutover sequence, not the wider engineering roadmap or staging/production readiness program.
