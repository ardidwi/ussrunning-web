# BE-03 validation — 2026-10-08

Baseline: BE-02 `1827780a4d658e97ad68d4a4a0312b3ebc73bba9`. Branch: `feature/email-verification`. Work performed in the isolated backend checkout; the shared UI checkout was not reset, stashed or edited.

## Executed checks

| Check | Actual result |
| --- | --- |
| Official dependency install | Final `npm install resend@6.13.0 --save-exact --ignore-scripts` passed; 0 reported vulnerabilities |
| `npm ci --ignore-scripts` | Passed; 267 packages installed, audit 268, 0 reported vulnerabilities. Existing Neon Auth peer/deprecated transitive warnings remain |
| `npm run build` | Passed on Next 16.3.8; existing routes plus new `/api/account/verify-email` compiled/prerendered as appropriate, with no email/DB configuration |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `npm run db:test` | 23/23 passed, including invocation of new issue/consume functions using the non-owner runtime role |
| `npm run auth:test` | 18/18 passed, BE-02 provisioning/session/lifecycle/legacy guards unchanged |
| `npm run email:test` | 19/19 passed, actual production TS transpiled for tests with mocked provider/transport and real PGlite SQL |
| `npm run db:migrate -- --dry-run` | Passed, 9 files / 98 statements; offline only, no database accessed |
| `npm run lint` | Failed: existing `next lint` script is unsupported by Next 16 and treats `lint` as a nonexistent project directory. No lint pass claimed; infrastructure unchanged |
| `git diff --check` | Passed |

Npm was invoked through the bundled pnpm launcher (`pnpm dlx npm@11`) because npm is absent from the Windows PATH. SQL test suites ran sequentially. An early PGlite attempt failed due to shared-machine ArrayBuffer allocation pressure; subsequent full suite runs passed. An initial build attempt started before dependency installation completed and could not resolve `next`; the completed-install build passed. No errors are being represented as successful checks.

## Five-stage audit

1. **Edge cases:** pending/active/suspended/deactivated, bound vs old/unbound proof, expiry, consumption/reuse, malformed/unknown/revoked token, changed email, one-outstanding constraint, server cooldown, rolling limit, parallel resend/consume, both verify/resend orderings, status changes, failed issuance/activation rollback, provider failure/throw/timeout, accepted-provider/failed-DB outcome, idempotent delivery claim, missing config and unavailable DB covered. Promise.all/interleavings execute in PGlite's single-session scheduler; this is not a live Neon independent-connection concurrency rehearsal.
2. **UI impact:** no existing page, component, style, auth catch-all route or login/join behavior changed. Only an additive backend API confirmation route and server contracts were introduced. Existing routes build. No browser/deliverability/UI runtime audit was performed or claimed.
3. **Security/performance:** 256-bit random proofs; only SHA-256 hashes and immutable email fingerprints persisted. No passwords, member identities, API keys, raw proofs, provider error payloads or session data in audit/delivery metadata. Parameterized SQL; trusted origin and input-free own-account issuance; anonymous caller has no email lookup. Functions invoker-only, explicit search_path and PUBLIC revoke; runtime EXECUTE tested. Common account lock, indexed hash/account-history queries and no external I/O inside a DB transaction. Code-owned auth templates. Existing partial unique/indexes reused. Verified actual pinned SDK does not log an embedded-secret provider response through mocked fetch. No claim of global/IP rate limiting or complete distributed provider delivery is made.
4. **Git:** branch derives from BE-02, changes limited to BE-03 services/API/schema/grants/config/dependency/tests/docs. Migrations 001–008, migration runner, BE-02 provisioning/status/session, frontend/layouts and legacy `public.*` implementation remain unchanged. Build-generated `next-env.d.ts` was restored to baseline; no other agent edits discarded. No push, merge or branch cleanup performed.
5. **Code quality:** no application console/debug dumps, raw provider errors, dead helper copies, private SDK overrides, queue platform or duplicate DB client. `sendTransactionalEmail` returns provider-neutral delivery outcomes; only verification service maps them to its own codes. Forward 009 deliberately composes activation in SQL for Neon HTTP, preserving BE-02's internal helper and policy.

## Files

Added:
- `database/migrations/009_email_verification.sql`
- `lib/auth/email-verification.ts`
- `lib/auth/verification-actions.ts`
- `lib/email/types.ts`, `config.ts`, `proof.ts`, `templates.ts`, `service.ts`
- `lib/email/providers/resend.ts`
- `app/api/account/verify-email/route.ts`
- `tests/email-verification.test.mjs`
- `docs/EMAIL-VERIFICATION.md`
- `docs/BE-03-VALIDATION.md`

Modified:
- `.env.example`
- `database/runtime-grants.sql`
- `docs/DATABASE-FOUNDATION.md`
- `package.json`, `package-lock.json`
- `tests/database-foundation.test.mjs` (future synthetic migration version advanced to 010; runtime function execution assertions added)

## Remaining staging risks

See [email lifecycle](EMAIL-VERIFICATION.md) for full contracts, defaults, DNS/environment and rollback policy. Independent Neon concurrency/permissions/transport rehearsal, actual approved staging mail, sender domain/DNS verification, fragment preservation through mail clients and disabled click tracking, FE-02 result presentation, upstream signup/global abuse controls and legacy identity crosswalk remain. Timeout cannot abort this SDK transport; proof stays valid and stale queued/sending rows require reconciliation/resend. No automatic worker/retry or webhook delivery confirmation is claimed. Re-audit logging/dependencies before upgrading pinned Resend. Database recipient data remains operational PII requiring deployment access/retention policy.

**No real email sent; no production migration, Resend production configuration/domain/DNS change, production deployment or merge performed.** Local PGlite fixtures and mocked Resend/fetch only. BE-04 recommended next: member profile service using existing active-account guards and immutable identity rules.
