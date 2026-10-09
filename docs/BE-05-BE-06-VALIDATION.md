# BE-05 / BE-06 validation - 2026-10-09

Baseline BE-04: 2077e177a8364ba2e5ebb9a34ab4c019c1193965. Clean isolated backend checkout, branch feature/member-card-rbac-foundation. Shared UI and integration worktrees were not modified/reset/stashed. No dependency versions/lockfile changed.

## BE-05 checkpoint (before BE-06)

- npm run build: passed, Next 16.3.8, existing routes compiled.
- node node_modules/typescript/bin/tsc --noEmit --incremental false: passed after narrowing the safe failure return type.
- DB 23/23, auth 18/18, email 19/19, profile 21/21, new member-card 6/6: passed using built-in Node runner, production TypeScript transpilation, unchanged SQL and in-memory PGlite.
- git diff --check: passed. Build-generated next-env.d.ts restored.
- No installation needed at this checkpoint; existing dependencies used, no version/lockfile edits.

Audit: owner-only active guard and fresh DB state; forged IDs/roles have no authority, stable reads and protocol v1, no PII in barcode/extra DTO fields, profile update cannot rotate identities, exact legacy card action shape retained, missing profile/DB safe failures. Shared BE-04 joined read extracted rather than duplicated. No frontend/routes/UI changes, migration/index/grant required or production operations. Dedicated DTO/protocol documented for FE-04. Append-only/identity constraints unchanged.

PGlite serializes transactions; these tests do not prove independent Neon sessions, deployed provider cookies or barcode visual scanning. Historical identity crosswalk/runtime privileges/real transport and FE rendering remain staging work. No production-ready claim.

## BE-06 checkpoint

BE-05 committed first as fd0d955. BE-06 then adds authorization/history services in its separate commit.

| Actual check | Result |
| --- | --- |
| npm ci --ignore-scripts | Passed: 267 installed / 268 audited / 0 reported vulnerabilities. Existing Better Auth peer/deprecation warnings remain; no dependency remediation |
| npm run build | Passed after clean install on Next 16.3.8; all existing routes compiled |
| node node_modules/typescript/bin/tsc --noEmit --incremental false | Passed after final changes, before full SQL suites |
| DB tests | 23/23 passed |
| Auth tests | 18/18 passed |
| Email tests | 19/19 passed, providers mocked |
| Profile tests | 21/21 passed |
| Member Card tests | 6/6 passed |
| RBAC/audit/revision tests | 19/19 passed |
| npm run db:migrate -- --dry-run | Passed offline: unchanged 9 migrations / 98 statements, no DB access |
| npm run lint | Failed: existing Next 16 unsupported next lint script interprets lint as project directory; no tooling change |
| git diff --check | Passed after staging final scoped files |

SQL tests were executed sequentially with the exact Node commands defined by db:test/auth:test/email:test/member:test/member-card:test/rbac:test. Npm ci/build/lint/dry-run used bundled pnpm dlx npm@11 because npm is absent from PATH. Clean installation was not blocked here, but pre-existing peer conflicts still warrant the separate integration work; no package version or lockfile was changed. No npm install/new dependency was necessary.

### Five-stage final audit

1. Edge cases: pending/suspended/deactivated cards, stable duplicate reads, identity/role spoofing, no self-escalation, every role/permission boundary, invalid/oversized limits/inputs/cursors/UUIDs/date ranges, real calendar checks, microsecond/tie pagination, cursor parent isolation, missing revision/empty history, DB failure, fresh status/role checks and revocation interleavings tested. Safe snapshot covers all four actual tables. Parallel provisioning/email/profile regression suites passed unchanged.
2. UI impact: no diff from BE-04 in app/components/public, routes, provider/auth code or frontend dependencies. BE-04 flat card action retained; canonical FE-04 DTO documented. Existing routes compile, no browser/rendering/auth-cookie staging test claimed.
3. Security/performance: trusted session and DB permissions, no client identity authority, no role writes/elevation endpoints, lifecycle/permission recheck in the same snapshot as history rows. Admin operational audit scope is positive-listed; super_admin broader history still minimizes metadata. No raw summary/rich snapshot/PII contacts/provider/session IDs/secrets exposed by generic contracts. Bound parameters, closed identifier map, capped cursor pagination/JSON projection and joined actor data, no per-item N+1. Existing indexes/grants/append-only triggers and migrations untouched; runtime least-privilege tests passed. Defense text filtering is not a universal secret detector; future writers require source schemas.
4. Git: feature/member-card-rbac-foundation, BE-05 validated/committed before BE-06 implementation. Separate scoped commits, no squash. main stays 8eb9e394c2c6b7aa60221232d3f64b02394e7c84. No UI/integration worktree modified, push/merge/cleanup or dependency version change. Generated next-env.d.ts restored.
5. Code quality: centralized permission and pagination/projection policy, shared guarded member read, reusable safe errors and typed entity snapshots. No debug logs, secret dumps, new auth/database client, dead migration or temporary API endpoint. Tests contain synthetic in-memory fixtures only. No new package/framework.

### Files in BE-06

Added: lib/authz/{permissions,guards,errors}.ts; lib/history/{policy,validation,presentation,repository,errors}.ts; lib/audit/{audit-types,audit-validation,audit-repository,audit-service,audit-actions}.ts; lib/revisions/{revision-types,revision-validation,revision-repository,revision-service,revision-actions}.ts; tests/rbac-history.test.mjs; docs/RBAC-AUDIT-FOUNDATION.md.
Modified: package.json (test script only); this validation document.

### Remaining boundaries

Real independent Neon sessions/transport/non-owner deployment role, query plans at realistic volume, provider session behavior, approved elevated-role ownership/revocation design and legacy identity/RBAC crosswalk remain staging work. PGlite interleavings prove SQL/source behavior, not independent multi-session contention. Generic revision previews deliberately exclude full rich bodies/nested CMS configuration; future domain schemas must extend safe views before full CMS history comparison/restoration. No role/status mutation, CMS CRUD/writer/restore or legacy RBAC cutover implemented. Screen/print/export is a historical presentation, never proof of current status; FE scan/quiet-zone testing remains.

No production migration/DB/provider change, real email, production deployment, branch push/merge or main modification was performed. No migration/index was required. Backend contracts are ready for FE-04/FE-05 integration; next backend task is typed CMS content writes with atomic new revision/publish pointer/minimized audit using these permissions.
