# BE-02 validation — 2026-10-08

Branch feature/auth-account-provisioning starts at reviewed BE-01 0aaacbe. Worktree C:/Users/ardid/Documents/ussrunning-web-db was clean before edits. The UI checkout and other agents' changes were not reset, stashed or discarded. No production database/auth service was accessed or modified.

## Commands actually executed

| Check | Actual result |
| --- | --- |
| npm ci --ignore-scripts | Passed: 262 packages added, 263 audited, 0 reported vulnerabilities; existing auth peer/deprecation warnings remain. |
| npm run build | Passed after clean install; all 16 existing routes compiled. |
| node node_modules/typescript/bin/tsc --noEmit --incremental false | Passed after final runtime edits. |
| npm run db:test | Passed 23/23 foundation tests after clean install, including unchanged legacy sentinel and runtime grants. |
| npm run auth:test | Passed 18/18 after clean install. Real PostgreSQL SQL/transactions, mocked provider/transport/request context. |
| npm run db:migrate -- --dry-run | Passed offline: 8 files / 90 statements; no target connection. |
| npm run lint | Failed: the existing next lint command is unsupported by Next.js 16 and treats lint as a project directory. No lint tooling changes. |

npm 11.21.0 was invoked through bundled pnpm dlx because npm is absent on PATH. No npm install/dependency addition was needed. package-lock.json is unchanged. The own-account DTO normalizes verification timestamps to ISO strings.

## Audit 1 — Edge cases

18 auth tests cover new/repeated/parallel provisioning, single profile/member relation, independent permanent unique member/barcode IDs and immutable constraints, missing name (NULL), missing email/provider ID, case-insensitive duplicate email and changed provider email, partially existing account repair without status/profile overwrite, mandatory role failure/atomic rollback/retry, pending verification guard even with provider verified flag, active access, email-bound/idempotent activation and rollback in the caller transaction, suspended/deactivated denial and non-reactivation, unauthenticated no-write behavior, ignored client role/account ID, safe config/provider/DB errors, non-owner grants, pre-migration legacy compatibility and failure-closed unexpected DB errors, real config accessor contract, SQL-looking names/IDs remaining bound data and no app password columns.

Parallel Promise.all requests run on PGlite, which serializes transactions. This checks idempotency and constraints, not real independent-session lock contention. A staging concurrency rehearsal is still required. Provider callbacks are not relied upon; account access retries safely. Missing schema is controlled failure in new services; the legacy status adapter skips only genuine pre-migration absence. Provider email changes require reconciliation; no automatic identity merge/backfill is performed.

## Audit 2 — UI impact

Compared with BE-01, app/, components/, public/, login/join actions and RSVP/content logic have no diff. Route structure and auth proxy remain unchanged; build compiles all old routes. Only lib/session.ts integrates a mapped suspended/deactivated-account check, with its existing null/redirect response behavior. No pending-verification legacy screen or visual redesign is introduced. No live browser/provider-cookie/OAuth/signup/recovery test was performed, so compilation/source comparison is not claimed as end-to-end production auth validation.

## Audit 3 — Security and performance

All executable new auth access modules import server-only; boundary actions have no identity/role/verification input. Provider response is whitelisted; accounts resolve by trusted provider ID. No passwords, provider tokens, cookies, secrets or raw SQL errors are returned/persisted/logged. SDK logging is silent. Queries bind values; UUID activation input validates before cast. Account/profile/member relation provisioning is one READ COMMITTED HTTP transaction with a provider-key advisory lock, bounded 15-second lock wait and final unique constraints. Runtime grants pass unchanged. Identity lookups are indexed and account SQL is one fixed batch, not a per-item N+1 loop. React caching remains request-scoped; guards must be rechecked/locked within later protected write transactions when status can race.

Activation is an internal transaction helper requiring already validated/consumed email-bound proof in the same transaction. It is not exposed as a Server Action and does not generate/send email. The HTTP adapter is batch-only; BE-03 must compose proof/activation atomically in SQL or provide a genuine interactive Neon transaction executor, never independent HTTP query calls. Existing legacy email/provider-role bootstrap policy is unchanged and not copied into USS member provisioning; BE-06 still owns its RBAC cutover/audit.

## Audit 4 — Git

Only BE-02 auth/account modules, optional-name forward migration, minimal legacy status integration, test script/tests and documentation are newly changed. Migrations 001–007, BE-01 runner/ledger/checksum/runtime grants/accessor, RSVP hardening and frontend assets are unchanged. Remove generated next-env.d.ts changes before commit. No push/merge, branch cleanup or production deployment is performed by this task. BE-01 PR #7 remains the prerequisite; this branch is based on its reviewed commit rather than recreating it.

## Audit 5 — Code quality

No debug auth dumps/console statements, no new dependency, ORM, auth provider or migration engine. One typed own-account DTO, safe error taxonomy and shared new-session/account adapters. Legacy session adapter remains intentionally compatible rather than silently changing its role/identity model. Input-free actions are ready for FE-02 once the identity crosswalk and verification UX are staged. Full usage and BE-03 boundary are documented in AUTH-ACCOUNT-LIFECYCLE.md.

## Remaining risks and next step

Real Neon multi-session concurrency, SDK session/cookie/revocation behavior, deployed role privileges and historic identity crosswalk need isolated staging rehearsal. Do not expose new USS IDs to legacy members until preserving existing IDs is verified. New active guards enforce verification; legacy pending-verification gating awaits explicit UX/cutover integration. Resend/email proof consumption, expiry/reuse, cooldown/rate limits, notification retry and official no-reply sender belong to BE-03. No production migrations were run, provider production configuration changed or real emails sent.
