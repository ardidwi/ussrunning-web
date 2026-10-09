# FE-04 / FE-05 integrated-main delivery — 2026-10-09

## Discovery and ancestry

Initial local main and origin/main: 8eb9e394c2c6b7aa60221232d3f64b02394e7c84.
Actual FE branch head: 8961f0d187806adcde2e5a3aabd76b9771f181c3.
Verified integration baseline: ffccaa0a75edce41595d8a8d376659d655b8de3f.
Common ancestor of FE and baseline: a91f910baf6d1b11e045a8fc69cf420287a9651b.

Actual first-parent FE history: a91f910 -> 3f7df20 -> 4d3f410 -> b427fae -> 8961f0d. The baseline independently adds five approved dependency repair branches and broader audit reconciliation. Neither head contained the other (4 FE-only / 14 baseline-only commits at discovery). Main advanced concurrently through policy commit b00142baf5b59ea31a1b49c87d867bf46cf4857b, merge f4c6fcb2fcb32c5d3c6f916bd7d8cd4b3168b0a9, and documentation 05a8d3c7a69929cd2487792bf429a3d8ee9512cd. These newer main commits were preserved.

Candidate branch: integration/fe04-fe05-delivery, created from verified baseline. Merge 6cd80d2 preserves FE history; 3ea26fb incorporates the current-main policy merge; bc9cb39 incorporates the later main documentation checkpoint. All merges were normal forward-only merges with zero conflicts. Policy was integrated from its actual commit, not copied/recreated. Root AGENTS matches b00142b. package.json and package-lock.json match ffccaa0 byte-for-byte: approved overrides/resolutions, resend, server-only and PGlite are preserved. FE-04/05 were not reimplemented.

The only executable correction is test commit 71faf0174b493c637e1d8ad286ef6710d5490afe: an existing RBAC cursor fixture could place .123456 in the future relative to the default audit end. Move the test timestamp one second into the past and assert it is before now. All microsecond/tie/cursor/duplicate assertions remain. Backend production code is unchanged.

## Fresh validation on the integrated candidate

| Gate | Actual result |
| --- | --- |
| npm ci --ignore-scripts | PASS: 259 installed / 260 audited / zero reported vulnerabilities; existing React Email deprecation notices. |
| npm run deps:check | PASS: full npm ls --all, no invalid graph; approved manifest/lock unchanged. |
| npm run build | PASS, including final repeat after policy integration and test correction. |
| Standalone TypeScript | PASS: node node_modules/typescript/bin/tsc --noEmit --incremental false, including final repeat. |
| Backend regressions | PASS 106/106: DB23, auth18, email19, profile21, card6, RBAC/history19. |
| FE-04/FE-05 Node tests | PASS 19/19: card8 + permissions/history11. |
| Card/CMS browser assertions | PASS 36/36: layout/state/navigation30 + interaction6. |
| Form audit | PASS 27 responsive cases, 5 interaction groups, 7 route regressions. |
| Public shell audit | PASS 80 responsive cases, 2 navigation checks, 1 motion group, 4 CSS-zoom cases. |
| Workspace audit | PASS 10 cases. |
| Auth audit | PASS 53 responsive cases, 35 flow groups, 1 accessibility group, 6 public regressions. |
| Member audit | PASS 41 cases on unchanged rerun; visual script PASS 5 extended groups. |
| Contract scripts | FE-02 and FE-03 scripts PASS; runner does not expose numeric assertion counts. |
| Auth visual script | PASS real-media screenshot, mobile signup and code-verification checks. |
| Strict static UI audit | PASS zero findings/errors/warnings. |
| Local production smoke | PASS 15/15: eight public/auth routes, five member routes, admin and production reference guard. No card/fixture data for anonymous role-query requests; reference 404. |
| npm run lint | Known FAILED: Next16 unsupported next lint resolves nonexistent /lint directory. No tooling/dependency drift to hide it. |
| git diff --check | PASS. |

Initial backend run: 105/106 due to the future-timestamp fixture; failure log preserved and corrected full suite rerun passes 106/106. Initial member audit: 40 cases passed and one Chrome navigation ERR_NETWORK_IO_SUSPENDED; original report preserved. The unchanged rerun passes 41/41. Initial browser adapter used 127.0.0.1, which current Next dev-origin handling blocked; localhost adapter works without application/config changes. No assertion was removed or suppressed.

Historical evidence was not overwritten. The delivery browser adapter reuses the existing scripts, changes only local host/output destinations and closes failed audit browsers. New evidence is under fe04-fe05-delivery-evidence, including JSON results, raw logs and screenshots. Bundled external Playwright and installed Chrome were used; no new project framework/dependency.

Hydration: 11 captured warnings across the broader form/public/auth audits; zero page exceptions. Card/CMS and member audits captured no hydration warnings. Diffs include audit-inserted zoom/caret styles; timing is a possible contributor, not a proven application root cause. No suppression or unrelated UI fix. FE-QA root-cause audit remains PLANNED. CSS zoom is not native browser-zoom certification; physical touch/assistive/device QA is outstanding.

## Operational scope and limitations

FE-04 consumes canonical BE-05 owner-only reads, controlled lifecycle/network/service feedback, responsive reusable member identity/card, safe avatar fallback, backend-issued permanent barcode v1, and identical SVG export. No identity generation, credential, event entitlement or attendance claim. SVG download/rendering tested; real verified Neon sessions and physical/printed code scanning were not tested. Independent native BarcodeDetector is unavailable in this Chrome runtime.

FE-05 consumes verified backend permission projection with one frontend can/canAny/hasRole abstraction, permission-aware navigation and guarded server reads. Members see no administrative capabilities; admin operational versus super_admin elevated visibility is tested. Presentation is not authorization: backend requirePermission/requireAnyPermission/requireRole remain security authority.

Audit is bounded to default25/max100 and default30/max366-day windows, with exact microsecond-window cursor propagation, safe actor labels and changed field names. Revision previews use four existing entity types and typed partial scalar snapshots; no complete-version/restore claim or action.

Protected legacy CMS writers, media mutations, users/roles/settings mutations and identity crosswalk are not integrated. Full operational CMS remains PLANNED. Auth non-login and profile adapters still require separate BE-02/03/04 cutover; integration alone does not complete those flows. Real independent Neon member/admin/super_admin sessions, deployed grants and revocation remain staging/development-session QA. Domain tests use PGlite and mocked provider/transport, not production auth/email/DB evidence.

Roadmap FE-04 and FE-05 are DONE within these scoped limits. Foundation checkpoint is locally VERIFIED; manual human product audit remains pending. Next: auth/profile adapter cutovers and real-role/device QA, then protected CMS writers/crosswalk and module editors. Hydration root-cause and lint modernization remain separate tasks.

## Main / Vercel delivery record

After validation the candidate is pushed, fetched current main ancestry is rechecked, and main is fast-forwarded to the exact validated candidate through its clean existing worktree, then pushed normally. If remote main advances, preserve it and revalidate material changes. Final main/origin SHA, Vercel deployment ID/READY state/SHA/URL and deployed core-page results are reported after execution, avoiding a self-referential documentation SHA or unnecessary redeploy loop. Main Vercel is the EARLY DEVELOPMENT manual product-review environment, not certified production readiness. No old deployment is promoted.

Safety: no force push, published history rewrite, destructive DB operation, production migration, real email delivery or dependency upgrade. Existing Vercel Git deployment from main is authorized; no environment, storage, project or DNS reconfiguration. Backend production contracts and FE implementations remain intact. Changes authored by this delivery: the deterministic test fixture, roadmap status/dependencies, this report and fresh validation evidence.
