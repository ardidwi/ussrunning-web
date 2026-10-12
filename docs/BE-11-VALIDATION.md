# BE-11 validation evidence

Baseline: origin/main 0425feaa4715ea4f4f9cc0f287b771a855064a86. Isolated feature/media-storage-foundation worktree; concurrent frontend worktrees untouched.

- npm ci --ignore-scripts: PASS, 259 packages installed, 260 audited, 0 vulnerabilities. Existing transitive react-email deprecation warnings remain.
- npm run deps:check: PASS. Sharp 0.35.5 made an explicit direct dependency for authoritative raster decoding; this exact version was already resolved by Next. No auth/dependency version upgrade.
- npm run build: PASS (Next 16.3.8).
- Standalone TypeScript --noEmit --incremental false: PASS.
- BE-11: 37/37 PASS, including JPEG/PNG/WebP full decoding, corrupt/MIME mismatch/size/dimensions/path rejection, lifecycle/permission checks, optimistic conflicts, reference retention, safe errors/URLs, DB quota, post-storage authorization race and non-owner runtime grants.
- Migration 012: local PGlite fresh, upgrade from 001-011 with retained legacy URL/identity, rerun, identity/FK/delete guards and audit rollback PASS. Offline dry-run: PASS, 12 migrations, 012 has 10 statements. No persistent database accessed by dry-run.
- Full regression: 307/307 PASS, 0 failures/skipped (includes the final 37 media tests and existing backend/frontend contract suites).
- Local production browser smoke: 20/20 PASS at 320px and 1366px, ten existing routes, no horizontal overflow, zero page exceptions/hydration warnings in these probes; production design-system route 404. This is not real authenticated provider/storage proof.
- npm run lint: known FAIL: next lint interprets lint as a project directory under Next 16. Infrastructure unchanged.

Initial media tests exposed an untyped placeholder in archive SQL; fixed before passing 37 tests. An initial full test run launched alongside npm ci stalled and was interrupted/restarted after install; not counted as a pass. The first completed regression was 306/307, because the new delete guard fired before an old FK assertion. The test now proves both the new guard and original FK independently inside a rolled-back isolated fixture transaction; no integrity coverage removed.

## Five-stage review

Edge cases: tested unsupported/corrupt inputs, missing configuration, provider/DB failure, stale writes, repeated archive, referenced assets, identical content with independent ownership, unsafe URL, revoked authority and partial object/DB outcome.
UI impact: no page/component/style/route modifications; core desktop/mobile probes preserved existing public/member/admin shells.
Security/performance: server-only adapter/key configuration; parameterized queries; trusted active account/permission; per-actor shared DB quota; byte/pixel limits; index-backed bounded list; no raw binary in Postgres or PII/signed-URL audit; external IO outside transactions. Archive reference scanning is conservative and infrequent; later operational reference tracking may improve scale.
Git: atomic media scope; no changes to auth, pass/check-in semantics or concurrent frontend implementation. Delivery SHAs and Vercel READY evidence reported separately after push.
Code quality: no debug endpoints/logs, copied unused pass test helpers removed, existing permission/schema/migration runner reused.

## Persistent environment limitations

Neon storage read-only inventory: enabled but no buckets. No bucket created, object uploaded, production credential/provider configured, persistent migration executed or storage cleanup performed. Default uploads fail closed; only explicit development/test memory adapter was exercised. Live object persistence/private URL enforcement, real Neon migration/runtime concurrency and malware scanning remain pending approved isolated staging. Future routes need streaming body limits and edge/global abuse controls. Physical cleanup/recovery, restore and final media reference ownership policies remain future operations.

Human manual audit, real Neon auth role/session checks, physical barcode/camera scans, barcode reissue, revision restore, protected feature writers and broader hydration root-cause audit remain open. BE-12 Stories/Editorial service is next; do not infer it was implemented here.
