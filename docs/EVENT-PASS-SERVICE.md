# BE-09 Event Pass service

Builds on BE-07/08 and existing BE-02/06 guards. No UI, provider, member barcode, payment or attendance changes.

## Identity and persistence

`uss.event_passes` remains one UUID row per registration, enforced by existing UNIQUE(registration_id). Registration owns account identity; no PII is copied. Migration 010 adds event_id with backfill, composite registration/event FK, format_version (legacy 0 / new 1), token_key_id and revoked_reason. Existing hashes/statuses are retained. A compatibility insert trigger derives missing event_id from registration for legacy inserts. Event/pass/token/format/key/issuance/expiry identities are immutable; revoked/expired statuses cannot be revived. RESTRICT relations and runtime no-DELETE policy retain history.

One partial active-event index supports event-wide invalidation. Existing unique registration and hash indexes support exact reads/lookup; no new tables or dependency are introduced. New invoker trigger functions revoke PUBLIC execution and do not elevate privileges. Existing runtime table grants cover the added columns; no new runtime grant needed.

## Token protocol

`USS-EVENT:1:<43-character canonical base64url>` contains only 256-bit HMAC output. Backend generates a cryptographically random UUID per new pass candidate, then HMAC-SHA256 over a domain-separated version/pass UUID/event UUID/registration UUID message using a dedicated random 32-byte key. Only SHA-256 of the full payload and the non-secret key ID are persisted. Raw token is reconstructed for authorized presentation and checked against the persisted hash with timingSafeEqual. No PII, sequential IDs, permanent member barcode, passwords or session proof appear in the payload. Domain binding and separate prefix prevent confusion with member identity or auth verification.

Server-only lazy config: EVENT_PASS_TOKEN_KEYS is a JSON object mapping key IDs to 64 hex characters; EVENT_PASS_TOKEN_KEY_ID selects the current issuing key. Generate each secret with crypto.randomBytes(32). Never commit/log a real key or put it in NEXT_PUBLIC configuration. Changing keys under an existing key ID is forbidden operationally. Add a new key ID and retain previous keys for outstanding cards; existing issuance returns the previous stable token. Missing/malformed/removed/wrong key yields EVENT_PASS_NOT_CONFIGURED and never breaks unrelated page imports/build. Hash lookup and managed revocation do not require token reconstruction or the keyring.

The value is an event-scoped credential, NOT login authority, attendance proof or automatic check-in authorization. Do not log/track raw payloads or place them in analytics/URL query strings. FE may render QR/barcode; no image/PDF/QR is generated here. Operational abuse controls and screenshot-sharing risks remain part of BE-10/staging.

## Exact eligibility

Every issue/read/resolve rechecks trusted server/DB state: actor active and verified; managed actor has current events.manage role permission; registration belongs to owner unless managed; matching event; registration confirmed and cancelled_at NULL; target account active and verified; event status published/registration_open/registration_closed, not archived, visibility not private, eligibility_config empty, and current time before ends_at when configured. Signup window/start time alone does not prevent a confirmed attendee receiving a pass after registration closes. With no end configured, lifecycle remains the expiry boundary. Pass expires_at snapshots configured event end when issued; extending an event does not silently extend an issued credential. Expired/revoked/legacy protocol pass is refused. Draft/cancelled/completed/archived, unknown invitation rules, waitlist/pending/rejected/cancelled never issue usable passes.

## Atomic issuance and concurrency

Repository transactions use READ COMMITTED, 15-second lock timeout, account rows (actor + managed target, ordered UUID) -> actor role rows -> event row -> registration/pass. The final statement uses a fresh snapshot after event lock acquisition. Registration cancellation uses the same event lock; previous concurrent issuance/cancellation is visible before the decision. One SQL statement inserts pass and mandatory minimized issuance audit, returning existing pass on valid repeated requests. No read-then-write without locks, external call or network provider transaction. Unique registration/hash constraints are final duplicate safeguards; unused concurrent random candidates are discarded. Empty read does not issue.

## Revocation and reissue boundary

Owner cancels through BE-08; managed explicit revocation requires events.manage and exact event/registration/pass identity. Revocation is idempotent and retains the row. Migration triggers atomically revoke active passes and append system audit when registration leaves confirmed or gains cancellation metadata, account loses active/verified eligibility, or event becomes unpublished/cancelled/completed/archived/private/unsupported eligibility/past end. Audit failure rolls back the source change and pass change together. Account/event status restoration or cancelled re-registration NEVER revives a revoked token. Effective lookup also rechecks all current eligibility and expiration, including changes not yet persisted as status.

Reissue is deliberately NOT implemented. Existing UNIQUE(registration_id) and immutable token rules define one lifetime credential; revoked/expired passes return controlled codes. A future managed security service must introduce explicit immutable generation history, one active generation constraint, new random candidate/hash and atomic old-generation invalidation + reissue audit. It must not overwrite/delete history or reactivate an old token. Normal reads/profile updates never rotate any identity. Operational re-registration after invalidation therefore requires that future reissue workflow; do not claim it supported now.

## Contracts

Server actions in lib/passes/pass-actions.ts:
- issueCurrentEventPass / getCurrentEventPass({eventId,registrationId})
- issueEventPass / getEventPass({eventId,registrationId}) â€” events.manage
- revokeEventPass({eventId,registrationId,passId}) â€” events.manage

Typed result `{ok:true,data}` / `{ok:false,code}`. EventPassDTO: id, registrationId, eventId, active status, issuedAt, expiresAt, formatVersion:1, barcode:{value,formatVersion:1}. No owner email/phone/provider/member barcode/internal key/hash or audit data. Revocation result contains safe identifiers/status/revokedAt/reason, no raw token. Unknown account/role/status/format fields and oversized or malformed payloads are rejected; request bound 1 KiB. Exact singleton lookups need no unbounded list API.

Domain errors: EVENT_PASS_VALIDATION_ERROR, EVENT_PASS_NOT_FOUND, EVENT_PASS_NOT_ELIGIBLE, EVENT_PASS_REVOKED, EVENT_PASS_EXPIRED, EVENT_PASS_PROTOCOL_UNSUPPORTED, EVENT_PASS_NOT_CONFIGURED, EVENT_PASS_UNAVAILABLE plus existing auth/authorization codes. SQL/provider exceptions never reach the client.

## BE-10 contract and audit

Protected server-only resolveManagedPass({eventId,value}) requires events.manage, validates canonical v1 payload, hashes it, resolves exact indexed active pass and rechecks confirmed registration/correct event/eligible account. Returns only {passId,registrationId,eventId,accountId,formatVersion:1}. No public token-resolution endpoint, scanner action, camera or check-in write is introduced. BE-10 must combine fresh eligibility resolution with idempotent unique registration check-in within its own shared event-lock transaction; a prior returned resolution is not durable authorization and must not be trusted after cancellation. It must define check-in window/checkpoint/staff policy, replay/duplicate scanning handling and safe operational errors.

Audit uses event_pass.issued / event_pass.revoked, safe pass/event/registration UUIDs, format version, initiator and system reason. No raw token/hash/key/PII stored in audit. Explicit managed audit has trusted actor; invalidation triggers use NULL actor/system initiator, with original account/event/registration change retaining its own actor trail. Existing append-only protections and BE-06 admin audit visibility policy remain unchanged; broad authorized audit scope is not automatically new CMS writer UI.

## Deployment and validation boundary

Apply migration 010 via the existing checksum/ledger/advisory-lock runner after backup/staging rehearsal. No app-startup migrations. Configure dedicated pass keyring separately from Neon Auth. This task tests fresh schema, 009->010 legacy backfill, rerun, invoker runtime privileges, atomic audit rollback and SQL fixture races; PGlite serializes transactions, so independent Neon-session concurrency/load/deadlock proof remains staging work. No persistent migration or real pass issuance is implied by Vercel READY. Existing frontend does not yet consume these actions; FE-07/08 are separate tasks. Scanner/check-in/payment remain out of scope.
