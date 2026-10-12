# BE-10 Check-In / Scanner Service

## Boundary and FE-09 contract

`lib/checkin/check-in-actions.ts` exports `scanEventPass(input: unknown)`.
Input is exactly `{ eventId: UUID, value: "USS-EVENT:1:<canonical opaque value>" }`.
The existing BE-09 validator rejects extra keys and oversized/malformed payloads. Permanent
`USS-UUID` member identifiers are never accepted. No client account/role/device authority.

Success: `{ ok: true, code: "CHECK_IN_SUCCESS" | "ALREADY_CHECKED_IN", data: ScannerDTO }`.
DTO contains event UUID/title/timezone, member ID/display name, registration UUID/confirmed
status, attendance UUID/pass UUID (nullable for legacy attendance)/UTC timestamp/checked_in
status. It deliberately excludes email, phone, account/provider IDs, profile data, token/hash.
Name is plain data: frontend must render as text, not HTML.

Failures: PASS_INVALID, PASS_REVOKED, PASS_EXPIRED, WRONG_EVENT,
REGISTRATION_CANCELLED, REGISTRATION_NOT_CONFIRMED, ACCOUNT_INELIGIBLE,
CHECK_IN_DISABLED, CHECK_IN_NOT_OPEN, CHECK_IN_CLOSED, CHECK_IN_WINDOW_UNCONFIGURED,
CHECK_IN_RATE_LIMITED (bounded retryAfterSeconds), CHECK_IN_NOT_CONFIGURED,
FORBIDDEN, SERVER_ERROR, and existing authentication/lifecycle codes. CONFLICT is reserved
for a future controlled concurrency workflow. Unknown token returns PASS_INVALID; authorized
staff may receive WRONG_EVENT for a known token outside selected event. No lookup is public.

FE-09 must select an event, send the untouched event-pass payload, display stable results,
respect retryAfterSeconds and avoid automatic unbounded retries. Repeating an eligible scan
within the window returns original attendance, not another row. Camera/image decoding,
physical-device QA and scanner UI are separate frontend work.

## Authorization, eligibility and windows

Existing `events.manage` is sufficient: active verified admin/super_admin only. No new role
or permission hierarchy. Account/roles are rechecked after transaction locks. Selecting an
event is not authority; the trusted operator is resolved from the server session.

BE-09's resolver remains authoritative for hashed-token lookup, protocol, revocation,
expiry, event scope, confirmed registration and active verified target account. It retains
its existing published/registration_open/registration_closed, non-private, unarchived,
empty eligibility configuration, event-end restrictions. Cancelled/archived/private,
invitation eligibility not yet implemented and ineligible registrations fail closed.

Additional attendance policy requires checkin_enabled. Effective open = checkin_opens_at
or starts_at; close = checkin_closes_at or ends_at. Missing close or close <= open fails
closed. Open inclusive, close exclusive, using PostgreSQL absolute time. Event timezone
is returned for display. Existing configurable timestamps support early-open; no arbitrary
hour offset or invented late-validity extension. BE-09 pass/event expiry remains an upper
bound even if an explicit check-in close is later. Completed events are not eligible.

## Atomicity and concurrency

`validation -> check-in service -> attendance repository effect -> protected BE-09 resolver`.
A narrow server-only PassEffect composes developer-owned SQL into BE-09's final statement;
no request supplies SQL. Existing issue/read/revoke/resolve behavior is unchanged.

One Neon HTTP ReadCommitted transaction locks actor/target accounts in UUID order, actor
role assignments and event, then resolves/locks registration/pass in a separate fresh
statement AFTER lock waits. The SAME statement evaluates attendance policy, inserts
attendance and its mandatory audit. No external network or preflight resolver gap.
Event locking serializes scans per event, trading initial throughput for correctness and
compatible account/event/pass lock order. Existing UNIQUE(registration_id) is final duplicate
protection. The waiting transaction sees the previous committed attendance and returns
ALREADY_CHECKED_IN. Audit failure rolls back attendance and rate accounting. Database errors
are sanitized; clients can retry safely. No optimistic deletion or unprotected ON CONFLICT
shortcut. Real two-connection Neon proof remains a staging gate, not inferred from fixtures.

## Persistence and audit

Forward migration 011_check_in_pass_relation.sql adds nullable event_pass_id to check_ins
and a composite FK to event_passes(id, registration_id, event_id), ON DELETE RESTRICT.
Legacy rows retain NULL; migration does not invent retrospective pass evidence. New service
always inserts the resolved pass UUID. Existing registration/event FK and unique attendance
remain. Proof/pass relation, actor and timestamp become immutable; DELETE/TRUNCATE blocked.
Runtime grants remove attendance UPDATE; legacy checkpoint/metadata schema compatibility
remains but this service exposes no edits. No reversal/manual override/search is implemented.

Audit `check_in.created` contains only attendance entity UUID, actor UUID and event,
registration/pass UUIDs. Repeat scans emit no duplicate attendance audit. No token, hash,
name, email or phone is logged. Administrative history remains append-only.

## Abuse protection

Small check_in_scan_limits table stores one operator/event counter and DB-clock fixed-window
start. No PII/token/device metadata. Server-only configuration is lazy:
CHECK_IN_RATE_LIMIT_MAX_REQUESTS default 120 (1..10000),
CHECK_IN_RATE_LIMIT_WINDOW_SECONDS default 60 (1..3600).
UPSERT is atomic, counter capped; valid-shape unknown-token attempts count as well as successes.
Malformed input rejects before SQL; unauthenticated requests reject before domain work.
This is shared DB-backed operator/event rate limiting, not IP/global DDoS protection.
Rows scale with trusted operator/event pairs; no anonymous token-per-row accumulation.

## Deployment and deferred work

Use existing migration runner and ledger; never run migration on app startup. Reapply
reviewed runtime-grants template for the new table and reduced attendance grants. Test
fresh, 010 upgrade with legacy attendance, rerun and dry-run before isolated deployment.
No default/persistent Neon writes are authorized by this implementation. Keep BE-09 token
keys/configuration unchanged. Roll forward; reverting application code does not erase
attendance or require removing additive columns. No down migration/destructive rollback.

Live Neon staging validation pending: last read-only inventory reported 10/10 branches,
no task-owned isolated connection; no branch was deleted/reused. Local PostgreSQL fixtures
validate actual SQL/constraints/rollback but serialize requests and are not independent
Neon-connection concurrency proof. Manual lookup/reversal, scoped staff assignments, scanner
UI/device/camera QA, production load tests and operational cleanup policy remain deferred.
