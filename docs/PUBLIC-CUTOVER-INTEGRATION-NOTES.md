# Public Cutover Integration Notes

Status: remote integration handoff. No production merge authority is implied by this document.

Latest observed `main`: `e0b4d292ee7e29863eadc52fb259ecd284310d78` (`docs: record INT-01 delivery and email configuration gate`), with INT-01 source integration at `b3e74d3c3f0367c9af380da820dd43ab5d81b1e7`. INT-01 is DONE for source integration and the repository marks controlled Preview/Development email configuration as ready, while real provider/email/crosswalk/Neon QA remains blocked externally. INT-02 is still recorded as PLANNED; do not infer it is complete from the existing six-field BE-04 adapter.

Every public branch must re-audit current `origin/main` immediately before validation/integration.

## Safest integration order after INT-02

Do not combine public candidates into one mega-merge. After INT-02 reaches a documented DONE checkpoint on current main, integrate one candidate at a time:

1. PR #8 / `feature/public-stories-cutover`
2. PR #9 / `feature/public-partners-cutover`
3. PR #10 / `feature/footer-site-content-cutover`
4. PR #11 / `feature/public-home-site-content-cutover`
5. PR #12 / `feature/public-events-primary-listing`
6. PR #13 / `feature/public-content-retirement-audit`

Why this order:
- Stories and Partners are isolated route-level migrations with the smallest blast radius.
- Footer is shared globally, so it should follow after two lower-risk public cutovers have proven the merge/deploy path.
- Homepage aggregates BE-12/13/14/15 and should only land after Stories/Partners/Footer are stable.
- Events keeps an intentional compatibility fallback and therefore belongs after the lower-risk content migrations.
- Retirement/audit docs come last so dead-adapter decisions are based on the actually integrated tree, not candidate assumptions.

Email/provider configuration QA does not need to wait for FE-13/FE-14/BE-18, and current INT-01 docs explicitly mark INT-02 completion as non-blocking for controlled auth/email configuration. However public cutover integration should still wait for INT-02 if the goal is to minimize concurrent-main churn during profile contract completion.

## INT-01 fallout / BE-15 auth content overlap

Current auth source behavior and BE-15 content contracts are not fully aligned yet:

- `app/login/page.tsx` still owns hardcoded presentation copy for login/forgot/reset/verify.
- `components/auth/AuthShell.tsx` still reads legacy `getLoginHero()` and `getRuns()` from `lib/content` for the login visual and next-run presentation.
- `app/join/page.tsx` still owns hardcoded register presentation copy.
- BE-15 already defines `login.visual`, `auth.login`, and `auth.register` typed public slots with approved defaults.

This is not an INT-01 correctness failure: INT-01 correctly owns authentication orchestration/security, while BE-15 owns editorial presentation. Do not reopen INT-01 merely to move copy. FE-14 / a later explicit public auth-content cutover should migrate these presentation surfaces without changing auth lifecycle, provider session, verification proof, resend, recovery, or account-state semantics.

Lifecycle copy guard:
- the current verify description says verification happens before the account becomes active;
- frontend wording must never become lifecycle authority;
- BE-02/BE-04 remain authoritative for post-verification account status;
- any future CMS copy should avoid promising automatic activation when another backend gate may apply.

Recommended future presentation split:
- `login.visual` -> AuthShell left-side visual/copy/media only;
- `auth.login` -> normal login heading/description only;
- forgot/reset/verify flow copy remains code-owned until explicit typed slots exist; do not overload `auth.login` for all auth states;
- `auth.register` -> join/register intro and form-heading presentation only;
- no CMS slot may control auth policy, return URLs, account state, verification tokens, resend eligibility, password rules, provider authority or session behavior.

## INT-02 remote pre-audit

Current main already has the BE-04-backed own-profile read path wired through `loadMember()` -> `getOwnMemberProfile()` -> `projectProfile()`, and `/dashboard/profile` renders `MemberProfileForm` when the projection is ready. This confirms the roadmap note that the six-field adapter is connected, but it does not complete the full BE-04 presentation contract.

Observed gaps that INT-02 should inspect rather than blindly rewrite:

- The presentation contract currently exposes only six editable fields: full name, phone, city, Instagram, emergency contact name, emergency contact phone.
- BE-04 policy vocabulary also contains birth date, gender, jersey size, running preferences, avatar media, marketing consent and privacy consent. INT-02 should decide which are in approved V1 UI scope and which remain intentionally deferred; do not silently drop backend fields or add new UX without scope evidence.
- `profile-adapter.ts` projects frontend validation limits (`minimumPhoneDigits: 7`, `maximumPhoneDigits: 15`, plus per-field max lengths). INT-02 should verify these values come from an authoritative shared policy/contract and are not presentation-only drift.
- The adapter maps backend optimistic `profile.version` to frontend `revision`; preserve this expectedVersion/conflict behavior exactly.
- The adapter blocks suspended/deactivated and non-active/unverified accounts in presentation. Backend lifecycle remains authoritative; frontend state mapping must not mutate or infer activation.
- `MemberProfileForm` already has loading/disabled/error/conflict/dirty-state behavior. INT-02 should extend/repair contract coverage without regressing layout stability, unsaved-change protection, mobile behavior or field-level validation.

Remote branch-name search did not expose a dedicated `int-02` or profile-cutover branch at this checkpoint. That does not prove Codex has not started unpublished/local work; always inspect the agent worktree and current remote refs before creating any overlapping branch.

## Legacy adapter dependency map

`lib/content.ts` currently contains the legacy adapters that remain relevant to public surfaces:

- `getStories()` -> old public Stories listing/fallback; target BE-12.
- `getPartners()` -> old partner-name read; target BE-14.
- `getSiteSettings()` -> old footer social/contact read; target BE-15 `footer.global`.
- `getMediaCollection()` -> old gallery/public_url read; target BE-13 + BE-11 safe MediaAsset DTOs.
- `getHomeHero()` / `getCmsSection()` -> old CMS tables; target BE-15 homepage/auth slots.
- `getLoginHero()` -> old auth visual CMS path; target BE-15 `login.visual` after auth orchestration is stable.
- `getRuns()` / `getRunBySlug()` -> old public Events/session compatibility; target BE-07 while preserving proven fallback until retirement is safe.

Retirement is allowed only after all consumers are proven migrated on latest `main`, build/TypeScript/browser checks pass, and no demo/fake production data returns on backend empty/unavailable states.

## Duplicate branch safety audit

Observed duplicate/review branches:

- `feature/public-stories-cutover-review` pointed to the same inspected head SHA as the canonical Stories cutover: `9ec70370ad812f7bab4ecfa5a137fc6a2e150dee`.
- `feature/public-partners-cutover-review` points to the original Partners implementation SHA `3c78c77057b225ba968ac58b176ea52c2a12ab33`; canonical Partners has since advanced to include follow-up cleanup, so the review branch must not become the merge source.
- `feature/footer-site-content-cutover-review` pointed to the same inspected footer implementation SHA `37b72e39542571e9ec511de192674c382fccdc2a`.
- `feature/public-home-site-content-review` points to `3a2a13fe156bbbf0e6ba66b47c171bf5b8b8a10c`, an ancestor of canonical homepage head `4b53f61f89e011962ff6e99b07f83a3fa9358b64`; it is stale, not canonical.
- `feature/public-cutover-validation` and `feature/public-cutover-validation-bundle` both pointed to old main `c1e78d6f6a2776765bcc75439b49483a2c6acc96` and contained no public cutover implementation at inspection time.

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

INT-01 modified auth/join/dashboard verification flows and does not directly modify the isolated Stories, Partners, Footer, Homepage or `/runs` files in these public cutover PRs. Current documentation checkpoint `e0b4d292` advances main again without changing those public candidate files. Textual conflict risk remains low, but semantic revalidation is still required because shared contracts, layout, auth shell state and deployment baseline moved forward.

INT-02 status at this observation point: PLANNED in the roadmap; no dedicated `int-02` or profile cutover branch was discoverable remotely by branch-name search. This is only a remote observation, not proof that an agent has not started unpublished/local work.

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
