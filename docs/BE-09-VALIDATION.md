# BE-09 validation

Branch feature/event-pass-service starts from main 26e29f2c1fa3ea4c7ee09f646ca2107e66a1b051. Other worktrees, auth setup and FE-07 preserved.

Actual checks:
- npm ci --ignore-scripts PASS: 259 installed / 260 audited, zero reported vulnerabilities; inherited email-package deprecations.
- deps:check PASS, approved dependency manifest/lock unchanged.
- Production build and standalone TypeScript PASS. Final delivery build follows the exact source checkpoint.
- All Node regression suites 219/219 PASS (184 inherited +35 new Event Pass), zero failures/skips.
- Fresh migrations and rerun PASS; real in-memory 009 -> 010 upgrade preserves existing pass UUID/hash/status/issuedAt and marks legacy format 0; synthetic next-migration failure/ledger-race tests now derive their next version rather than colliding with actual 010.
- Offline migration dry-run PASS; no database accessed.
- next lint FAILED due inherited unsupported Next 16 next lint command. No lint/dependency remediation included.

Coverage: owner/managed issue/read, PII-free DTO/hash-only persistence, idempotent and eight parallel requests, token uniqueness, all registration/account/event eligibility states, cross-owner and forged authority denial, correct-event protected resolver, malformed token/member barcode rejection, expiration, key rotation/removal/missing config, stale DB authority, terminal managed revoke, registration cancellation/reapply/cancellation-metadata-only invalidation, event/account invalidation, mandatory audit failure rollback, immutable protocol/composite FK, compatibility/backfill/rerun, least-privilege runtime invoker triggers, audit/pass delete denial, fixture issue/cancel race and fresh post-lock snapshot.

Security/performance audit: no password/provider/session/email/member barcode copied; no raw token/hash/key in audit; no debug logs; lazy server-only key config; parameterized SQL; indexed singleton hash/registration/account lookups and separate indexed invalidation targets; lock order and READ COMMITTED fresh snapshot documented; no external call inside DB transaction; no check-in, payment, public token-resolution endpoint or frontend changes. Runtime has no destructive audit/history privileges. Invalidation triggers are invoker functions with PUBLIC execute revoked.

Limits: PGlite serializes transactions, so fixture races are NOT independent Neon concurrency/load/deadlock proof. Apply 010 and configure separate Event Pass keys only after staging/backup rehearsal; neither is executed here. Existing frontend does not yet consume these actions. No real pass issued, persistent DB changed, email sent, provider config modified, reissue or scanner implemented. Reissue remains a documented future managed generation/history design; revoked credentials cannot be restored through ordinary issuance.

Git/main/deployment evidence is verified after the final push and reported with the exact SHA/READY state. Main movement is reconciled forward without force push or history rewrite. Human manual product audit remains pending.
