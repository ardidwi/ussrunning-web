# BE-07 validation

Isolated branch feature/event-domain-foundation from main d28ab503613fcd71c2e259d05530306d84c9b39f. Auth worktree and frontend changes excluded. No dependency versions, auth/session/environment or permission architecture modified.

- npm ci --ignore-scripts: PASS; 259 installed / 260 audited, zero reported vulnerabilities. Existing transitive email deprecation notices remain.
- npm run deps:check: PASS; approved graph unchanged.
- Next build and standalone TypeScript: PASS (final source rechecked before commit).
- Combined Node/PGlite regression: 144/144, zero failures/skips (existing backend 106, FE 19, event foundation 19).
- Focused final event regression: 19/19; lifecycle/create/read/update/publication, private/draft exclusion, allowlist/spoofing, duplicate slug rollback, capacities/dates/windows, optimistic concurrency, permission revocation/status races, bounded pagination, media checks, minimized audit, required audit rollback and BE-06 revision/audit integration.
- Offline migration dry-run: PASS, existing migrations 001–009 parsed; no database accessed. Full DB regression tests fresh migration, rerun/checksums/ledger/rollback/constraints; no new migration needed.
- Existing lint limitation: next lint is unsupported on Next 16; reported separately, not repaired here.

Tests use ephemeral PGlite and trusted-provider fakes; no real member, provider, persistent DB or email. SQL-backed permission races are deterministic tests, not live distributed concurrency evidence. No registration/pass/check-in implementation. Public pages are unchanged; event server actions do not cut over legacy Runs yet. Deployed main state/SHA/core-route smoke is reported after push to avoid self-referential documentation.

Audit: parameterized values; developer-owned column/table structure; strict write allowlist; lifecycle and public filtering server-side; active account/role rechecks; account/role/event/media locks; single atomic event+revision+audit transaction; immutable history/grants preserved. No PII in event contracts or audit values. Future real Neon grant/locking/query-plan checks remain staging work.
