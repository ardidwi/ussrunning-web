# BE-04 validation — 2026-10-08

Baseline: BE-03 `f7dd0a4796eda94ac818dd6a6da2098d4e42c0c0`. Branch: `feature/member-profile-service`. Isolated backend worktree was clean before changes; no UI agent changes were reset/stashed/discarded. See [member contracts and policy](MEMBER-PROFILE-SERVICE.md).

## Actual checks

| Check | Actual result |
| --- | --- |
| `npm ci --ignore-scripts` | Passed, 267 packages installed/268 audited, 0 reported vulnerabilities. Existing Neon Auth peer/deprecated dependency warnings remain |
| Dependency installation | No `npm install` or new dependency required; package-lock unchanged |
| `npm run build` | Passed after final code changes on Next 16.3.8; all existing routes compiled, no DB/email configuration required |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Passed after service error sanitization |
| `npm run db:test` | 23/23 passed |
| `npm run auth:test` | 18/18 passed |
| `npm run email:test` | 19/19 passed; provider mocked, no real mail |
| `npm run member:test` | Final 21/21 passed |
| `npm run db:migrate -- --dry-run` | Passed offline; unchanged 9 migrations/98 statements, no target access |
| `npm run lint` | Failed: pre-existing `next lint` unsupported by Next 16, interprets lint as missing project directory. No lint pass claimed/tooling changed |
| `git diff --check` | Passed |

Commands use bundled `pnpm dlx npm@11` because npm is absent from Windows PATH. SQL suites run sequentially using existing baseline-only WASM flags; fixtures and runtime-role tests use PGlite memory only. TypeScript production modules are transpiled for tests, SQL unchanged; only provider/current-account context/Neon transport are substituted. Existing real guards and safe errors execute in profile tests. PGlite serializes transactions, so Promise.all/interleavings do not prove independent Neon sessions or deployed SDK cookies.

## Five-stage audit

1. **Edge cases / anti-hotfix:** minimal/partial/missing profile, allowed normalized PATCH, explicit clearing optional values, unknown/immutable/account/provider/email/role/status/timestamp keys, malformed dates/future/extreme age/valid leap date, phones, HTML/control/oversized text, bounded/deep/cyclic preferences, completion 0/20/60/100 semantics, legal vs marketing evidence, no-op/repeated acceptance, stale/parallel/rapid update conflicts, status recheck after lock, archived/foreign/unknown/non-image avatar, unsafe avatar URL, unavailable DB/malformed historical preferences, mandatory-audit rollback, runtime role and sanitized direct service errors exercised. Version canonicalization is timezone-independent and detects mutation when timestamps intentionally match. Test-only triggers and roles remain in the isolated in-memory DB, not migration source.
2. **UI impact:** app/components/public/routes/styles and legacy dashboard/profile/login/join flows have no diff against BE-03. Existing route build passed; no visual redesign or new API route. Frontend operations/DTO/error/optimistic-retry contracts documented. No live browser/provider-session cutover or rendering/scan test performed or claimed.
3. **Security/performance:** trusted existing active-account guard for all operations; fresh read state and post-lock write eligibility checks. Own UUID exclusively server-resolved, identity keys rejected, no elevated admin path. Developer-owned column map with parameterized values. Existing DB member/barcode immutability untouched. Profile+consent+field-name-only audit atomic; no PII values/secrets/session identifiers in log/error/audit metadata. SSR and action errors sanitized. Owner-only minimal barcode DTO. Avatar FK plus active/owner/raster validation and media share lock; no uploads. No new clients/credentials/cache/indexes/role queries; one intentional profile/media join after existing provisioning and fixed update batch. Runtime non-owner grants tested unchanged. No schema/migration required.
4. **Git:** atomic BE-04 branch based directly on supplied BE-03 commit. Only lib/member modules, test/script and two new documents changed. Migrations 001–009, runner/ledger/checksum/grants, DB/auth/email/RSVP/content/legacy profile code and package-lock untouched. Build-generated next-env.d.ts restored before commit. No push, merge, branch cleanup or production deployment performed.
5. **Code quality:** reusable shared lifecycle guards, one validation/policy/completion definition, typed explicit DTOs, one fixed repository and safe service/action boundaries. No debug output, duplicated DB client, dead migration, permanent fixture data, extra package/framework or administrative feature. No temporary screenshot/UI fixes.

## Files

Added:
- `lib/member/profile-types.ts`
- `lib/member/profile-policy.ts`
- `lib/member/profile-errors.ts`
- `lib/member/profile-validation.ts`
- `lib/member/profile-completion.ts`
- `lib/member/profile-repository.ts`
- `lib/member/profile-service.ts`
- `lib/member/profile-actions.ts`
- `tests/member-profile.test.mjs`
- `docs/MEMBER-PROFILE-SERVICE.md`
- `docs/BE-04-VALIDATION.md`

Modified: `package.json` (member:test command only).

## Remaining limits

Rehearse real Neon independent-session profile/status/media races, HTTP transport and deployment privileges before enabling FE-03/04. Historical legacy profile/member identity/consent/preferences crosswalk is still required; no destructive backfill or dual write occurred. Unexpected missing profile returns PROFILE_NOT_FOUND after BE-02's normal bootstrap/recovery, with trusted reprovisioning/operational remediation documented. Unknown stored preference shape is controlled failure pending reviewed transformation. No complete policy-versioned consent/withdrawal ledger, media upload/private URL service or barcode visualization/scanning is claimed. Post-commit read failure/status change can produce controlled response failure despite committed mutation; reload/reconcile rather than blind retry. No production-ready/browser-integration claim.

No production migration, production DB change, auth/provider config change or real email occurred. Branch not pushed or merged. Member-card data contract is sufficiently covered; recommend **BE-06 RBAC + Audit/Revision Foundation** next, with card rendering remaining frontend scope.
