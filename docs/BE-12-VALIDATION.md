# BE-12 validation evidence

## Resume and baseline

Resumed preserved feature/stories-editorial-service worktree from latest FE-08 main 99f448f4c4ad143209f08f8280ed494a235f6c6d, retaining BE-11 3ca433b. Existing schema/body/lifecycle/media/RBAC/service/repository/actions and migration 013 were already implemented. No restart, reset or unrelated source overwrite. Focused coverage grew from the earlier 33 tests to 35 (unsafe legacy/author input and sub-millisecond cursor precision). Final archive audit also verifies publication timestamps remain retained.

## Actual checks

- npm ci --ignore-scripts: PASS; 259 installed, 260 audited, 0 vulnerabilities. Existing transitive email deprecation warnings remain. No manifest/lock/dependency changes.
- npm run deps:check: PASS.
- Final production build: PASS (Next 16.3.8).
- Standalone TypeScript --noEmit --incremental false: PASS.
- BE-12: 35/35 PASS, 0 failures/skipped.
- Final integrated regression: 373/373 PASS, 0 failures/skipped, including FE-08 and all existing backend/media suites.
- Local production core browser: 20/20 PASS at 320px/1366px; home/about/runs/membership/stories/partners/login/join/member card/admin. Zero page exceptions/horizontal overflow/hydration warnings in these probes. Production design-system reference 404 guard passes.
- Migration 013: local fresh, 001-012 upgrade with retained legacy content/slug/revisions, version backfill, rerun, uniqueness/identity/retention constraints and mandatory audit rollback PASS. Offline dry-run PASS: 13 migrations; 013 has 8 statements. No persistent database accessed/applied.
- git diff --check: PASS.
- npm run lint: known FAIL; Next 16 next lint interprets lint as a directory. Tooling unchanged.

The first complete regression had one media migration test expecting only 012 while the upgrade correctly applied 012+013. It now asserts the complete pending migration list, preserving all original media retention checks and supporting future forward migrations; the final 373 suite passed. An extra /admin/stories smoke probe returned 404: this route does not exist in the current FE-05 shell; FE-10 remains future UI, so no frontend route was added. Smoke was rerun against the actual existing route inventory. One temporary auto-review 429 blocked script preparation; retry through the same approval path succeeded.

## Five-stage audit

Edge cases: draft/private/future/archived public denial; due scheduling, past/malformed calendar, invalid lifecycle, missing references/media, unavailable delivery, slug collisions, stale/concurrent edits, unsafe markup/legacy body, timestamp cursor precision and failure rollback.
UI impact: no page/layout/component/style/frontend route changes; legacy public.* compatibility retained. The new USS contracts are not silently connected to current public pages.
Security/performance: trusted cms.content.manage guard and post-lock DB checks; server UUID/slug/author; strict inputs; plain bounded paragraphs; no arbitrary HTML execution; parameterized queries; bounded cursor summaries without body/N+1 media queries; active/public cover checks. Public projection omits internal account IDs, draft/version/storage/audit fields. Fixture independent requests do not establish real Neon multi-connection proof.
Git: dedicated Stories scope; minimal additive migration; BE-11 provider semantics unchanged (only existing serializer reused to avoid extra DB queries); no auth/pass/check-in or concurrent FE rewrite. Final SHAs/READY evidence recorded after delivery rather than self-referential SHA churn.
Code quality: existing taxonomy/schema/history/permission reused, no new framework/dependency/debug endpoint/logging, no rich-text or feature-specific storage implementation.

## Remaining staging / FE-10 boundaries

No persistent migration, production data/storage operation, auth provider/config change or real email. Real independent Neon concurrency, active-role/session, runtime/query-plan and migration 012/013 staging remain pending. Persistent media delivery/credentials are still unconfigured; URL null is intentional. Taxonomy needs approved configured records; no fake editorial types seeded. Rich blocks, taxonomy management, slug redirects, revision restore, tags/SEO/disclosure enrichment and BE-19 search remain separate tasks. Live core smoke/READY evidence is not authenticated editorial workflow proof; human manual audit remains pending.
