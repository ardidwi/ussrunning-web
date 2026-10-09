# BE-01 — Production database foundation

Sources: [PRD](PRD-USS-RUNNING.md), [ERD](ERD-USS-RUNNING.md), [implementation plan](IMPLEMENTATION-TASKS-USS-RUNNING.md), [CMS boundary](CMS-FOUNDATION.md). This is schema/access infrastructure; provisioning, verification endpoints, publishing services, scanner and email delivery remain BE-02+.

## Repository audit and compatibility

The repository already uses @neondatabase/serverless 1.2.0, Managed Neon Auth 0.5.0-beta, Next 16.3.8 and React 19.2.6. Existing query/getSql/isDatabaseConfigured imports use lib/db.ts. Existing auth catch-all route delegates to Neon Auth; sessions/passwords remain provider-owned. Existing actions write public.user_profiles, events, event_registrations, cms_pages/cms_sections, stories, media_assets, media collections, site_settings, legal_consents, newsletter_subscriptions and admin_activity. No migration source or .env.example existed. The package lock was older than package.json; npm install reconciles it without changing the declared provider/framework versions.

lib/cms.ts and DemoProvider remain isolated browser demo types/localStorage; no automatic copying of demo accounts, roles, content or data URLs into production. Their role preview never authorizes database operations. The application demo and current public routes are unchanged.

**Compatibility boundary:** the ERD has incompatible replacements for existing public models: auth-user FK versus account UUID, registered/waitlist/checked_in versus confirmed/waitlisted plus attendance, start_at versus starts_at, CMS sections versus revision pointers, and inline RSVP pass_code/qr_payload versus separate hashed event_passes. These cannot be silently rewritten in BE-01. The canonical new model is created in schema **uss**; legacy public tables and neon_auth are untouched. New repositories must explicitly query uss.*; existing services continue querying public.*. This is a staged cutover, not a second live registration engine. PR #4 hardening is included as an unchanged prerequisite merge because main had not included it. No capacity service is added to the new model.

A fresh foundation database contains uss tables only; it does NOT synthesize the undocumented legacy public schema to make old services work. BE-02+ must migrate authenticated accounts, profiles/consents, preserve existing IDs with a verified crosswalk, reconcile duplicate emails and decide status/pass mappings before switching reads/writes. Never truncate/drop public tables or blindly regenerate established member IDs. Historical public passes require explicit rotation/migration policy; their plaintext legacy payloads are not backfilled here. The earlier backend lock/bootstrap patch remains on its separate backend branch and is not mixed into BE-01.

## Access layer

lib/db/client.ts is the only runtime Neon accessor; lib/db.ts re-exports it for compatibility. All executable DB modules import server-only, so a client component import fails at build time. getSql caches the lightweight HTTP query function per connection URL; it does not maintain an idle TCP pool. query binds external values through params and preserves existing SQLSTATE/constraint handlers. querySafe is opt-in for future repositories and normalizes failures without including provider messages, SQL, credentials, row data or causes. getSql remains available for existing atomic transactions. lib/db/types.ts contains stable domain states and wire row types only, not client authority.

Repository conventions:
- Developer-owned SQL, explicit schema and SELECT columns; values are $1/$2 parameters or Neon tagged substitutions. Never interpolate user values or identifiers.
- Session/authorization checks precede protected queries; account_roles is persistence, not a public registration role field. Provisioning later whitelists fields and assigns only member.
- Batch related reads/join or paginate; no generic repository that issues one query per rendered item. No client render initializes a DB client.
- JSONB is restricted to rich content, safe snapshots, preferences, dynamic answers/configuration and safe metadata; searchable identity/contact/date/state fields are columns. No binary data columns.

## Environment / commands

Use Node 22+ for the optional --env-file-if-exists loader. Copy .env.example to .env.local and set secrets outside Git. DATABASE_URL is the server-only runtime URL (normally pooled). DATABASE_URL_UNPOOLED is optional and preferred for migration deployment; the runner falls back to DATABASE_URL. Existing NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET / USS_SUPER_ADMIN_EMAIL are preserved, not required for executing schema migrations. There is no NEXT_PUBLIC database variable.

```bash
npm install
npm run db:migrate -- --dry-run  # offline SQL/checksum plan; no target is queried
npm run db:migrate -- --status   # read-only target ledger/status; requires URL
npm run db:migrate               # explicitly apply pending migrations
npm run db:test                  # isolated PostgreSQL WASM tests; no live credentials
npm run build
npx tsc --noEmit --incremental false
```

Production migrations are never run at startup/build. Use an isolated Neon staging branch/snapshot first, review status and backup/restore plan, then invoke the migration command in the deployment job with a migration-owner connection. This task does not provision a Neon project/branch or modify a live database. Existing extension installs must be accessible in the connection search_path (standard Neon public); if relocated, review that deployment before applying.

## Migration protocol

001_extensions: pgcrypto/citext, uss namespace, timestamp/history guard functions.
002_identity: accounts, roles, assignments and hashed verification artifacts.
003_content: media/profile, CMS revisions, editorial taxonomy/stories and Partners/history.
004_events: events/history, relations, custom fields/answers, registrations, hashed passes, attendance and gallery.
005_notifications_audit: neutral templates/deliveries and cross-domain audit history.
006_reference_protection: only three system role seeds; timestamp/history triggers and public privilege revocation.
007_event_identity_anchors: forward review fix preventing registration/pass/check-in/custom-field identity rebinding across events or members; mutable operational fields remain editable.
008_profile_bootstrap: permits a missing full name during trusted account provisioning.
009_email_verification: immutable email fingerprint on proofs, atomic invoker issue/consume functions, explicit runtime EXECUTE grants. See [BE-03 lifecycle](EMAIL-VERIFICATION.md).

The runner tracks version/filename/SHA-256 checksum/applied_at in uss_migrations.schema_migrations. Line endings are normalized before hashing. Names are ordered three-digit prefixes. Already-applied source changes, missing files, renamed files or non-prefix histories fail closed. Never rewrite an applied migration; add a new numbered file. No CREATE TABLE IF NOT EXISTS masks a conflicting application schema.

One READ COMMITTED transaction applies the pending batch and ledger entries. A transaction advisory lock serializes runners. A fresh post-lock statement verifies the planned ledger has not changed; a concurrent loser fails safely and must rerun. Lock wait is capped at 15 seconds. Any migration failure rolls back the entire pending batch, including ledger writes; rerun after resolving the cause. There is no partial per-file success or automatic rollback/down migration. Migration files must contain transaction-compatible SQL and no BEGIN/COMMIT/ROLLBACK. A later concurrent index build needs a separately designed migration protocol, not an accidental exception here. Status/dry-run logs contain filenames/checksums/counts only; database failures are sanitized with SQLSTATE where safe. Offline dry-run validates lexical structure, not the target database or privileges.

## Table inventory (29 domain tables)

Identity: accounts, member_profiles, roles, account_roles, email_verification_tokens.
CMS/editorial: site_content, site_content_revisions, story_content_types, categories, tags, stories, story_revisions, story_tags, story_partners.
Media/brands: media_assets, gallery_items, partners, partner_revisions.
Events: events, event_revisions, event_partners, event_custom_fields, event_registrations, registration_field_values, event_passes, check_ins.
Operations: notification_templates, notification_deliveries, audit_logs.
The migration ledger is an additional infrastructure table.

## Constraints and indexes

- UUID PKs/default gen_random_uuid; no title/date/slug-derived identity. Event UUID updates are rejected. Member ID and barcode defaults are opaque USS-prefixed UUIDs, unique and immutable with provider mapping/account UUID. They contain no PII and never authenticate. Only a privileged offline import should supply historical identity values; future public services must ignore caller-provided IDs.
- citext unique email; provider ID/member ID/barcode and Story/Event/Partner slugs unique (their unique indexes serve lookups).
- FK ownership for profiles, grants, content authors/editors, assets, registrations and history. One event/account registration, one pass/registration, unique pass hash, one check-in/registration. Composite FK requires check-ins, dynamic answers and related notification registrations to reference the same event.
- Stable lifecycle states use CHECK constraints. Editable Story types/categories/tags are DB records; no fake or editable taxonomy is seeded. Account active requires email_verified_at. Positive-or-null capacity; chronological event/registration/check-in/partner/pass windows. Event timezone is checked against PostgreSQL's timezone names. NULL capacity means unbounded; draft events still require a valid start.
- Token hashes are lowercase 64-character SHA-256/HMAC hex. Plaintext tokens cannot satisfy this shape. Verification has one outstanding artifact per account/purpose; resend later invalidates outstanding rows (including expired rows). Expiry/consumed/invalidation checks and immutable artifact guards prevent rebinding/revival; consumption/activation must still be transactional in BE-03. Low-entropy codes require a keyed hash and rate limits later, not an unkeyed guessable digest.
- Revision numbers are positive and unique per entity. Published CMS pointer requires the same content record's published revision. Revision and audit UPDATE/DELETE/TRUNCATE are rejected by database triggers. History snapshots and log summaries must be validated/redacted by BE-06; JSON shape checks cannot identify secrets hidden under arbitrary keys.
- Indexes cover role reverse lookup, account status, token account/expiry, public Story dates/status scheduling/category/author, visible Partner order, event status/start, active field ordering, registration event/status and account/date, reverse partner/tag relations, pass hash/registration, attendance event/time, gallery order/entity, queued/failed notifications/time/recipient-account/provider IDs and audit actor/entity/time. No redundant email/slug/token indexes are added on top of UNIQUE. No generic JSONB GIN indexes until query evidence requires them.

## Deletion, permissions and security

Archive/deactivate/cancel is the default. Operational/identity/media/history FKs use RESTRICT deliberately instead of the ERD's optional cascading profile/revision deletes: referenced accounts/entities cannot erase attendance/history. Pure story-tag and event/story association rows use CASCADE where safe; partner/media references remain restrictive. Registration answer rows cascade only with explicit privileged deletion of an otherwise unreferenced registration. History triggers further block cascaded history erasure. An owner can override protections; do not use owner credentials for future app traffic.

uss and uss_migrations are not granted to PUBLIC. Tables/functions revoke public privileges; table defaults are restricted. Schema-scoped function default REVOKE cannot override PostgreSQL global default EXECUTE; every new migration must explicitly REVOKE PUBLIC function execution (as 007 does), without changing legacy global defaults. Use a separate non-owner/non-superuser app role; database/runtime-grants.sql is a reviewed psql identifier-quoted template that grants USAGE plus SELECT/INSERT/UPDATE, excludes history UPDATE and never grants DELETE/TRUNCATE/schema CREATE or ledger access. It is not run automatically and does not create users/passwords. New migrations require deliberate privilege updates. Current legacy public access remains dependent on its existing deployment role. Database roles are not the same as application roles.

There is no browser Data API/RLS authority in this design: the server-only connection is trusted and future services authorize users explicitly. Do not expose its connection string. Provider sessions, passwords/API keys, raw verification/event tokens never belong in content/revisions/delivery/audit logs. notification_deliveries stores only provider-neutral recipient/reference/status/error summary; later services must sanitize error summaries and persist transient raw-token delivery material through a separate reviewed strategy, never log it. Hash columns are not frontend pass payloads.

## Transaction boundaries for later modules

- BE-02: application account + profile + member role provisioning in one DB transaction after verified provider mapping; remote provider creation is outside PostgreSQL and requires retry/reconciliation.
- BE-03: lock account/artifact, check expiry/consumed/invalidation, consume/invalidate all old tokens, verify and activate account atomically.
- BE-06: privileged role/status writes + append-only audit; publish snapshot + published pointer + audit under one transaction.
- BE-10/11: eligibility/window/capacity/uniqueness + registration + hashed pass + durable notification row atomically. Server capacity locking remains mandatory; schema alone cannot enforce maximum headcount.
- BE-12: authorized pass/event/window resolution + idempotent attendance + audit transaction.
- BE-13: external email is after commit, with durable retry status. Delivery failure cannot undo account/registration success.

## Tests and release limits

The db:test command uses baseline-only WebAssembly compilation with one worker to avoid memory contention on shared development machines; SQL assertions are unchanged. Node's built-in runner uses PGlite (PostgreSQL compiled to WASM) with real pgcrypto/citext: fresh schema, rerun, drift, rollback, duplicate email/identities/slugs/registrations/passes/check-ins, FK/event isolation, invalid date/capacity/timezone, immutable identity/history, published revision ownership, secret-redacted runner errors and reusable parameterized access. Test fixtures exist in memory only. This is SQL behavior testing, not a live Neon network/concurrent-session rehearsal; deployment permissions, transport, target legacy schema and existing-record backfill still need staging verification. No production-ready claim is made for future auth/CMS/business services.


Final review scope note: compared with main, the branch also contains three unchanged prerequisite PR #4 files (README.md, app/dashboard/actions.ts, lib/content.ts). All new implementation is BE-01; the full PR diff is not strictly database-only until PR #4 is merged into main. Do not remove those fixes to narrow the diff. Runtime grants assume a fresh non-owner role with no inherited extra grants; deployers must inspect role membership/ownership. DELETE-based role revocation/purging requires a later narrowly reviewed privilege grant or service design; broad DELETE is intentionally absent.
