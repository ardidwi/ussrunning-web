# BE-10 validation evidence

Resumed existing feature/event-check-in-service at e24222b. Worktree was clean; no BE-10
source had been saved before interruption. Schema/resolver audit, isolated worktree and
npm ci completed previously. Dirty FE-07 root worktree preserved; no reset/stash/discard.

Validation results are recorded after execution. Local fixtures are PGlite PostgreSQL,
not independent Neon connections. Live isolated staging remains pending (prior 10/10 branch
quota, no safe task-owned connection). No persistent migration, auth configuration, token
semantics, member identity or frontend changes. Manual device audit is not automated proof.

## Feature checkpoint (before concurrent FE-07 reconciliation)

- npm ci --ignore-scripts: PASS; 259 packages installed, 0 reported vulnerabilities.
- npm run deps:check: PASS; dependency versions and lockfile unchanged.
- npm run build: PASS, rerun on final backend source.
- Standalone TypeScript: PASS, noEmit/incremental false.
- BE-10: 35/35 PASS.
- Full regression: 254/254 PASS, 0 failed/skipped.
- Migration dry-run: PASS, 11 migrations parsed; offline, no DB accessed.
- Fresh/010 upgrade/legacy retention/rerun/constraints/rollback: PASS in local PGlite.
- Local browser: 20/20 route/viewport cases at 320/1366, reference route 404,
  0 page errors, 0 hydration warnings in these probes (broader hydration audit remains open).
- Existing npm run lint: FAIL, next lint treats lint as a nonexistent project path in Next 16.
  Tooling was not changed.
- Neon: read-only inventory reconfirmed 10 live branches; no safely isolated BE-10 connection.
  Independent Neon connection concurrency/migration staging remains PENDING.

Five-stage audit: eligibility/duplicate/concurrency/audit failure/missing configuration tested;
no frontend modification; server authority/parameterized SQL/minimal DTO reviewed; scoped Git
diff and dependency baseline reviewed; no logs/debug endpoints/token persistence introduced.

Concurrent main advanced to 6baf018 (FE-07). Its frontend/docs/test changes will be merged
forward into this task branch and the combined tree revalidated before main delivery.

## Integrated checkpoint

Forward merge b6635683586d063eee2bc6b654401412a87fba85 preserves concurrent FE-07
6baf018bfda83e832c1685a900010d6e8ee943c7 without conflict or frontend edits.
Combined npm run build and standalone TypeScript PASS. Full integrated regression
270/270 PASS, 0 failed/skipped; BE-10 remains 35/35. Dependency manifest/lockfile identical
to validated baseline. Combined local browser 20/20 PASS, 0 page errors/overflow/warnings,
reference route 404. Broader hydration/unsupported lint/staging limits remain unchanged.

Feature/main pushes and deployment SHA/READY are verified after this documentation
checkpoint and reported in final delivery to avoid self-referential commit churn.
No production/default Neon SQL write, auth provider configuration change or physical scan.
