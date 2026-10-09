# Pre-FE04 integration validation

Date: 2026-10-09 (Asia/Jakarta). Branch: `integration/pre-fe04-baseline`.

## Scope and architecture

Includes committed BE-01–06, FE-01–03, root AGENTS.md, engineering roadmap and all five approved Option A repairs. Uses existing consolidation `a91f910`, which follows merge `1670bae`. No FE-04, FE-05, BE-07, production migration or deployment was implemented by this task. Inherited legacy RSVP functionality does not complete planned event-domain work.

Full branch/commit/parent/contract mapping is in [ENGINEERING-ROADMAP.md](ENGINEERING-ROADMAP.md). All ten required foundation/repair/AGENTS tips were checked with `git merge-base --is-ancestor` against integration HEAD.

## Forward-only integration

An attempted multi-head/octopus merge refused conflicts without producing a merge commit. Sequential normal merges retained all approved repair histories:

| Integration commit | Included repair / resolution |
| --- | --- |
| c8ba7c2 | BE-01 repair 9dfbbf1; manifest retains all six domain test scripts, email dependencies and approved overrides. |
| 0682c57 | BE-02 repair e799fdd; retains combined manifest. |
| e0d2c64a | BE-03 repair 5b9ea38; retains combined manifest. |
| 6efd061 | FE-01 repair a40db36; manifest/lock conflicts reconciled by fresh deterministic lock generation. |
| c79b28d | FE-02 repair f7038c3; retains validated combined manifest/lock, preserving repair ancestry. |

Lock generation: removed only the isolated generated lockfile, then `npm install --package-lock-only --ignore-scripts` from the final manifest. No branch's entire lockfile was blindly selected. No force, legacy-peer-deps, shared rebase, squash, or force push. Feature dependencies include resend 6.13.0, server-only and PGlite. Direct approved dependency versions and override policy are unchanged.

Two existing browser audits needed integration-only reconciliation, not application changes: FE-01 now checks FE-02's Full name/Create account/Passwords do not match contract; workspace opens FE-03's active profile reference, checks Save changes, and waits for React handlers before clicking navigation. Existing validation, retained-input, viewport, controls and publish assertions remain. Initial stale selector and pre-hydration navigation failures were investigated and rerun; they are not hidden as product fixes.

## Install, graph and build

| Check | Actual result |
| --- | --- |
| npm ci --ignore-scripts | PASS; 259 packages installed, 260 audited, zero reported vulnerabilities; React Email deprecation notices remain. |
| npm run deps:check | PASS; full npm ls --all, no invalid/peer-invalid/broken extraneous graph. |
| npm run build | PASS; Next 16.3.8 production compilation, types, page data and route generation. |
| node node_modules/typescript/bin/tsc --noEmit --incremental false | PASS, separate from build. |
| npm run lint | FAILED, pre-existing unsupported Next 16 next lint command; no lint infrastructure change or false pass. |
| npm run db:migrate -- --dry-run | PASS offline; 9 migrations, 98 statements, no database access. |

Final auth-family versions exactly match [AUTH-DEPENDENCY-BASELINE.md](AUTH-DEPENDENCY-BASELINE.md). Each expected family package has one lockfile resolution, including nested Daveyplate UI 3.3.15. No api-key package, Better Call 2.x, Better Auth/core 1.7.x or stale Next 15. See [dependency-versions.json](pre-fe04-evidence/dependency-versions.json) and [deps.log](pre-fe04-evidence/deps.log).

## Rerun test matrix

| Command / suite | Result / count |
| --- | --- |
| npm run db:test | PASS 23/23 |
| npm run auth:test | PASS 18/18 |
| npm run email:test | PASS 19/19 |
| npm run member:test | PASS 21/21 |
| npm run member-card:test | PASS 6/6 |
| npm run rbac:test | PASS 19/19 |
| Backend total | PASS 106/106, zero skipped/cancelled/failed. |
| node scripts/verify-fe-02-contract.cjs | PASS one contract script; assertions are not exposed as a runner test count. |
| node scripts/verify-fe-03-contract.cjs | PASS one contract script; assertions are not exposed as a runner test count. |
| verify-fe-01.cjs | PASS 27 viewport cases, 5 interaction groups, 7 route regressions; zero errors. |
| verify-public-shell.cjs | PASS 80 viewport cases, 2 navigation checks, 1 motion group, 4 CSS zoom cases; zero assertion errors. |
| verify-workspace-fe01.cjs | PASS 10 workspace cases; zero errors after reconciliation. |
| verify-fe-02-browser.cjs | PASS 53 responsive cases, 35 flow groups, 1 accessibility group, 6 public regressions; zero errors. |
| verify-fe-02-visual.cjs | PASS one visual script: real-media screenshot, mobile registration, fixture code-verification assertions. |
| verify-fe-03-browser.cjs | PASS 41 cases (24 layout/zoom, 17 outcome groups); zero errors. |
| verify-fe-03-visual.cjs | PASS 5 extended check groups; zero page errors; screenshots visually inspected. |
| Additional viewport/hydration probe | PASS 12 fresh-page cases at 320/375/768/1024; zero hydration warnings. |
| Local production smoke | PASS 15 route cases; public/auth 200, 5 member routes controlled anonymous sign-in state, reference routes 404. |
| Local auth SDK initialization | PASS route initialization; dummy loopback provider returns expected HTTP 502 NETWORK_ERROR. |

Existing browser scripts ran against localhost:3104 through an in-memory port adapter because several scripts hardcode port 3000. Bundled Playwright and installed Chrome were used without new dependencies. The adapter also captured console hydration events, without suppressing them. Production runtime used localhost:3105, no real credentials, and only dummy loopback auth. Fresh evidence is stored separately from historical task evidence; regenerated historical screenshots/reports are restored before commit.

## Authentication and product limits

PGlite/domain tests transpile production modules and mock provider/transport boundaries; they do not prove independent Neon sessions, live cookies, deployed least-privilege roles, production auth or email delivery. Local SDK initialization is separate evidence from provider sign-in/up/out. No safe staging provider was configured or tested. No production service traffic was sent.

FE-02 still connects existing provider login only; other auth operations remain AUTH_UNAVAILABLE. FE-03 still uses provisional DTOs and fails closed with PROFILE_UNAVAILABLE for authenticated production profile operations. Foundation completion means delivered scoped contracts/UI/tests, not a completed live backend/frontend cutover. Explicit adapter integration, identity/RBAC crosswalk, elevated-role ownership/revocation, realistic query plans and staging role/provider tests remain future scope.

## Hydration

Status: **reproduced**. Public-shell audit captured four hydration console errors; FE-02 browser and visual audits captured two each. Public-shell warnings occurred on about, stories, login and join during CSS zoom/screenshot cases, despite zero assertion failures. Reported diffs include test-mutated html zoom and input caret-color styles. This suggests an audit timing contribution, but is not a proven application root cause. Raw console evidence is preserved. No suppression or unrelated UI refactor was performed. Keep FE-QA Hydration Warning Root Cause Audit PLANNED and distinguish fresh unmodified-page probe results from the broader audit.

## Original checkout and main safety

Starting branch: feature/member-card-rbac-frontend. Starting HEAD: a91f910baf6d1b11e045a8fc69cf420287a9651b. Starting main and origin/main: 8eb9e394c2c6b7aa60221232d3f64b02394e7c84. Original checkout was dirty; initial status is preserved in original-worktree-start.json.

Concurrent external work committed original FE changes, advanced its HEAD and removed the nested integration checkout. Integration commits were recovered by repairing its missing Git pointer, moving only that integration checkout to the sibling path, and restoring its committed sources. No original dirty files were copied, modified, staged, committed, reset or discarded by this task. Byte-for-byte preservation cannot honestly be certified because external activity changed those files and the temporary starting hash snapshot was no longer available; initial Git status/output remains recorded. External FE-04/05 work is excluded from this baseline.

Final main/remote checks, integration commit/push and worktree states are recorded after validation. No merge to main, force push, shared rewrite, production deployment or production migration is authorized or performed.

## Verified checkpoint and reproducibility

All required integration gates passed at foundation/audit reconciliation commit 1be95f5322929f3c4d53f53d939951868172aa83; documentation commits follow this tested state. Integration = VERIFIED within the exceptions above. Lint is a known pre-existing failed command, hydration remains reproduced (8 captured warnings, zero page exceptions), and 12 fresh unmodified-page probes captured none. No warning was suppressed. FE-04/FE-05/BE-07 remain PLANNED.

Audit reconciliation commit: 1be95f5. Historical evidence and generated AGENTS/next-env changes were restored; root AGENTS blob matches a91f910 exactly. Local servers were stopped. Original branch concurrently reached 8961f0d187806adcde2e5a3aabd76b9771f181c3 and was clean at final inspection; this task did not modify its work. main and origin/main still match the starting SHA, including independently checked origin remote main.

For reproduction, install/build/typecheck and run the six package test scripts plus the two contract scripts listed above. Start an isolated development server on 3104 with no production credentials, then run `node docs/pre-fe04-evidence/browser-runner.cjs <audit-name>` for each of the seven verify-* browser/visual audit names in the matrix. The adapter uses each existing script's original filename/module context and substitutes localhost:3104 in memory, also setting FE_BASE_URL/FE03_URL and recording console events. FE-03 executes both layout and flow groups and writes its combined report under the supplied mode name. Local production smoke used port 3105 with a dummy loopback auth URL and no database/email configuration. Preserve new output separately and restore generated files in the isolated checkout.
