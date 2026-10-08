# BE-01 validation — 2026-10-08

Branch: feature/db-foundation. Baseline: origin/main 8eb9e39 plus an unchanged prerequisite merge of RSVP hardening from PR #4. No remote database was modified.

## Commands actually executed

| Check | Result |
| --- | --- |
| npm install --ignore-scripts | Passed: 262 packages; audit reported 0 vulnerabilities. Existing auth peer/deprecation warnings remain. |
| npm ci --ignore-scripts | Passed from updated lockfile; audit reported 0 vulnerabilities. |
| npm run build | Passed after clean install; all existing routes compiled. |
| node node_modules/typescript/bin/tsc --noEmit --incremental false | Passed. |
| npm run lint | Failed: existing script invokes next lint, unsupported by Next 16; reports invalid project directory /lint. Lint tooling was not changed in BE-01. |
| npm run db:test | Final run passed 22/22 tests with real PostgreSQL WASM, citext and pgcrypto. |
| npm run db:migrate -- --dry-run | Passed: six files, 83 SQL statements, offline checksum plan. No database connection. |
| node --check on both migration scripts | Passed. |
| git diff --check | Passed. |

npm 11.21.0 CLI was bootstrapped through the bundled pnpm dlx because npm was not installed on PATH. Normal documented npm commands invoke the same scripts. Dependency scripts were skipped during installation; production compilation was separately verified. Initial inaccurate test assertions (table count and RESTRICT SQLSTATE) were corrected without weakening constraints. Later optimized WebAssembly compilation exhausted shared-machine memory; db:test now uses baseline-only WebAssembly compilation with one worker. The final npm test command passed with unchanged SQL assertions.

## 1. Edge cases

Validated a fresh empty domain schema (29 tables), rerun/idempotence, checksum/order drift rejection, atomic rollback of a failed migration/ledger, stale post-lock plan rejection, duplicate email/provider/member ID/barcode/Story/Event/Partner slug/registration/pass/hash/check-in, invalid role/account relations, wrong-event custom answers/check-ins, capacity and date/timezone constraints, FK delete protection, immutable account/event identity, consumed/invalidated artifact non-revival, append-only history, published revision ownership, missing configuration and redacted database-unavailable errors.

The migration race test simulates a committed ledger change before the transaction acquires/checks its snapshot. It does not prove live multi-session advisory-lock behavior over Neon transport. Legacy public sentinel rows survive migration.

## 2. UI impact

No new frontend/public route/layout/style/component/asset changes. App/components/public, DESIGN.md, UX-CONTRACT.md, lib/content.ts and README.md match the hardening prerequisite baseline. Existing auth provider and action signatures remain unchanged. The central query facade preserves raw SQLSTATE/constraint classification for existing signup error handling. The new schema is not silently wired into old flows.

## 3. Security and performance

Executable access modules are server-only; no NEXT_PUBLIC database URL or database credentials in client sources. Only blank env placeholders exist. SQL values are bound; migration dynamic identifiers come from fixed local arrays, and ledger literals are validated local versions/checksums. Failure/status logs exclude credentials and raw tokens. Opaque unique identifiers, token hashes, FK/check constraints and indexed critical lookups are present. App-role test verifies normal insert/select works while history update/truncate, account deletion and ledger access fail. Schema/public privilege revocation and reviewed non-owner grant template exist. No binary data or large ORM introduced; one cached Neon HTTP accessor, no client-render database engine and no N+1 module service introduced.

Actual deployment role permissions, relocated extensions, Neon connection/DDL transport and live legacy schema have not been inspected. These require staging rehearsal. Future services still own authorization, secret redaction, token expiry/consumption rules and capacity transactions; schema is not a substitute.

## 4. Git

Work occurs in its own worktree C:/Users/ardid/Documents/ussrunning-web-db. UI checkout and its in-progress document edits were not reset/stashed/discarded. Foundation changes concern schema, migration tooling, DB access, environment/dependency metadata, focused tests and documentation only. PR #4 prerequisite is preserved verbatim. No push, automatic merge, production deployment or post-merge branch cleanup performed.

## 5. Code quality

One runtime DB implementation plus backwards-compatible re-export, explicit schema-qualified SQL, deterministic numbered migrations/checksum ledger, stable domain types, built-in Node test runner, no debug statements in runtime access code. CLI status/error output is intentional and sanitized. No duplicate active registration or CMS persistence engine. Detailed compatibility/cutover and future transaction requirements are in DATABASE-FOUNDATION.md.

## Remaining work

Rehearse on a Neon staging branch with the intended migration/app roles and a snapshot of existing public records. Plan explicit backfill/crosswalk and service cutover; never regenerate established identities blindly. BE-02 is next: account provisioning/auth mapping/member-role lifecycle, preserving Managed Neon Auth. BE-03/06 and later modules implement verification, RBAC services, revisions/audit, registration/pass/check-in and delivery behavior. Existing lint tooling and auth dependency warnings remain separately tracked.

## Final review rerun — 2026-10-08

Initial working tree was clean at d717dc0. origin/main remains 8eb9e39. All six original migrations and runtime-grants.sql are unchanged. Review found that an existing registration could be rebound to a different event/account, moving its pass with it. Forward migration 007_event_identity_anchors locks registration/pass/check-in/custom-field ownership; operational statuses, timestamps, notes, checkpoint metadata, profile and event editorial fields remain mutable. It explicitly revokes PUBLIC function execution because schema-scoped default privileges cannot override PostgreSQL global defaults. A focused regression verifies these transitions. DATABASE_URL presence semantics preserve the existing no-demo-fallback rule even for invalid whitespace configuration.

Re-executed npm ci --ignore-scripts (passed, 0 reported vulnerabilities), npm run build (passed), standalone TypeScript check (passed), npm run db:test (23/23 passed), and offline migration dry-run (seven files, 89 statements, passed). Re-executed npm run lint: failed because the existing next lint command is unsupported by Next.js 16. npm was invoked through pnpm dlx npm@11 as documented above. No package installation change was required during review.

No unintended destructive DDL, SECURITY DEFINER escalation, operational cascade deletion or mutable profile/editorial-field immutability was found in the six original migrations. History remains append-only; restricted operational foreign keys and same-event composite relations are preserved. Runtime grants require a fresh non-owner role without broader inherited privileges; future role revocation needs a deliberately scoped service/grant policy. Real Neon permissions and concurrent-session behavior still require staging rehearsal.

The diff against main includes the unchanged PR #4 prerequisite in README.md, app/dashboard/actions.ts and lib/content.ts because main does not yet contain that hardening. The newly authored work is BE-01 only; the full PR diff is therefore not strictly foundation-only until PR #4 merges. No frontend implementation was changed. No production migration, cutover, BE-02 implementation or automatic merge was performed. This review prepares a PR; the earlier no-push note describes the initial implementation handoff.
