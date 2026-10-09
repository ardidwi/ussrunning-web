# Member foundation integration revalidation - 2026-10-09

Starting main/origin: 05a8d3c7a69929cd2487792bf429a3d8ee9512cd.
Backend head: fc1c097d3574154a120b0c76d3bc4aa8094e4e46 (BE-05 fd0d955 and separate BE-06).
Frontend head: 8961f0d187806adcde2e5a3aabd76b9771f181c3.
Pre-FE04 baseline: ffccaa0a75edce41595d8a8d376659d655b8de3f.

## Forward-only ancestry

The isolated candidate 71faf0174b493c637e1d8ad286ef6710d5490afe already contained all five requested refs as ancestors. Reused the existing normal FE merge 6cd80d2, preserved newer main through 3ea26fb/bc9cb39, and retained its deterministic audit pagination fixture fix 71faf01. No task reimplementation or dependency regeneration. AGENTS/package manifest/lockfile match the newer main baseline.

While revalidation ran, another delivery advanced main/origin to 6e3e8ca18c752a319e1a0e7ae361c5cdd63cfa44. That update adds documentation/evidence only; application and dependency trees are unchanged. This isolated branch fast-forwarded to it, preserving its roadmap and all evidence. No current merge conflict; the historical combined dependency reconciliation is retained. Final task changes are fresh validation evidence and this roadmap checkpoint only. Shared UI/release/integration worktree changes were not reset/stashed/discarded.

## Actual fresh checks

| Check | Result |
| --- | --- |
| npm ci --ignore-scripts | PASS: 259 installed, 260 audited, 0 reported vulnerabilities; deprecated transitive email warnings remain |
| npm run deps:check | PASS exit 0, approved auth graph preserved; only optional Resend render peer absent |
| npm run build | PASS Next 16.3.8, all routes compile |
| TypeScript --noEmit --incremental false | PASS |
| DB / auth / email / profile / card / RBAC-history | PASS 23 + 18 + 19 + 21 + 6 + 19 = 106/106 |
| FE-04 / FE-05 Node tests | PASS 8 + 11 = 19/19 |
| FE-02 / FE-03 contract scripts | PASS both scripts (no runner assertion count exposed) |
| FE-04/05 browser | PASS 30 layout assertions, 6 interaction assertions; native decoder unavailable |
| Form audit | PASS 27 responsive, 5 interaction groups, 7 route regressions |
| Public shell | PASS 80 responsive, 2 navigation, 1 motion, 4 CSS-zoom groups |
| Workspace | PASS 10 cases |
| Auth browser | PASS 53 responsive, 35 flows, 1 accessibility, 6 public regressions |
| Auth visual | PASS existing visual script |
| Member browser / extended visual | PASS 41 cases + 5 extended groups |
| Local production smoke | PASS 15/15 routes; design-system correctly 404, anonymous protected reads controlled |
| Lint | Known FAIL: unsupported next lint script interprets lint as a project directory |
| Diff/scope | PASS; no application/dependency/schema/grant changes authored by this revalidation |

Fresh raw Node/browser results and console records: [final-integration-evidence/summary.json](final-integration-evidence/summary.json), with per-suite logs. Existing scripts run through the saved adapter using isolated port 3114 and fresh output paths. No historical result overwritten, assertion suppressed or application configuration changed. Npm uses bundled pnpm dlx npm@11 because npm is absent from PATH. SQL uses in-memory PGlite, provider/email boundaries mocked. Local production uses port 3115 with dummy loopback auth only. Both owned servers stopped; Next-generated AGENTS/next-env edits restored. Selected narrow card/CMS and auth/profile screenshots retained; bulk regenerated screenshots omitted.

Hydration remains OPEN: 9 console hydration warnings across public/auth browser/visual audits, zero page exceptions; card/CMS/member audit captured none. Audit-injected zoom/caret styles appear in diffs but are not a proven root cause. No suppression or hydration fix. Physical touch/native zoom/assistive/device scan and real Neon session/roles remain separate evidence categories.

## Scope and delivery

BE-05, BE-06, FE-04 and FE-05 are DONE within documented foundation scope. FE-04 preserves owner-only stable identity and SVG export; a barcode is not authorization/event entitlement. FE-05 is presentation and protected read-only history, not a completed operational CMS. Production auth non-login/profile adapters still need explicit cutover.

Known limitations preserved: real authenticated Neon role/session staging, physical barcode scans, controlled barcode reissue, protected CMS writers/legacy crosswalk, full revision comparison/restore, hydration root-cause audit and lint modernization. No migration, persistent DB operation, real email, environment/domain/provider change or dependency upgrade. No force push, rebase, reset of others' work or published-history rewrite.

This documentation checkpoint is pushed/integrated forward; final main/origin SHA and Vercel deployment ID/READY/exact SHA/core-route evidence are reported after execution. Existing Git integration deploys main; no old deployment promotion. Manual audit URL: https://ussrunning-web-seven.vercel.app . Human product audit remains pending. Next: explicitly scoped auth/profile cutovers and real-role/device QA; protected typed CMS writers later.
