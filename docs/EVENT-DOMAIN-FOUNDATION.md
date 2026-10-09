# BE-07 — Event Domain Foundation

Scope: server-only event persistence and contracts using BE-01 schema and BE-06 `events.manage`. No UI, auth cutover, registration, payment, passes, check-in, scanner or CMS permission redesign.

## Model and persistence

`uss.events` already supplies immutable database-generated UUID, unique public slug, editable event type code, title/summary/JSON description, location/map, timezone, absolute start/end timestamps, registration window, nullable capacity and waitlist metadata, visibility, status and cover-media reference. Existing partner/gallery/custom-field and registration/pass/check-in relations remain untouched. No new tables, migration, indexes or grants are necessary. Existing unique slug, UUID/relationship identity anchors, timezone/date/capacity constraints and restrictive history FKs are preserved.

Event type is an administrator-managed code (for example community/trail/race), not a fixed application taxonomy. BE-07 description is a bounded plain-text `{paragraphs: string[]}` document, suitable for a future editor; arbitrary rich HTML/config is rejected. No attendee/account PII enters the event DTO or snapshot. Editorial fields are public-content data, not a place for participant contact information.

Slug is explicitly supplied, deterministically normalized (lowercase, Latin diacritics removed, spaces/underscores to hyphens) and unique. No random suffix or identity derived from title/date. Ordinary updates do not rename a slug; a future dedicated rename/alias flow can honor the PRD's editable slug without silently breaking stable public URLs. Each create uses the existing fresh UUID default. No clone service yet.

## Boundaries and operations

- `event-types.ts`: safe event/public DTOs, typed create/update/transition inputs and page contract.
- `event-policy.ts`: stable lifecycle, public states and centralized bounds.
- `event-validation.ts`: payload allowlist/size, plain text, UUID, explicit-zone calendar dates, IANA timezone, window ordering, integer positive capacity, HTTPS map links, bounded description and filters.
- `event-repository.ts`: parameterized SQL, deliberate column projection, fresh authority checks and transactional writes.
- `event-service.ts`: existing permission guard, merged-update validation, public projection, pagination and domain results.
- `event-actions.ts`: sole server-action transport, `{ok:true,data}` or `{ok:false,code}`; no raw SQL/provider messages.

Public: `getPublicEventDetail(slug)`, `getPublicEventList(filters?)`. Managed: `createManagedEvent(input)`, `getManagedEventDetail(id)`, `getManagedEventList(filters?)`, `updateManagedEvent({id,expectedVersion,changes})`, `changeEventLifecycle({id,expectedVersion,status})`. Internal services have equivalent typed return contracts. No new route or existing public page cutover; `public.*` and legacy RSVP/content fallback behavior are preserved.

DTO includes id, slug, eventType, title, summary, description, startsAt, endsAt, timezone, venueName, locationText, mapUrl, registrationOpensAt, registrationClosesAt, capacity, waitlistEnabled and status. Managed DTO additionally includes visibility, coverMediaId and version. Public DTO omits those management fields, author, eligibility config, email overrides, participant data, roles, session/provider identifiers and history. Optional public media expansion is deferred until a safe media contract exists.

## Lifecycle and publication

- draft → published / archived
- published → draft / registration_open / registration_closed / cancelled / archived
- registration_open → registration_closed / cancelled
- registration_closed → registration_open / completed / cancelled
- completed / cancelled → archived
- archived → draft

No implicit timer or same-state transition. Restore from archive is a new draft transition, not historical revision restoration. Published/open transitions validate the current content. Public reads require `visibility=public`, null archived_at and status published/registration_open/registration_closed/completed/cancelled. Cancelled public events remain informational; draft/archived/member-only/private records return the same EVENT_NOT_FOUND as a missing slug. Public list cannot ask for draft status. Lifecycle `registration_open` is metadata only here; BE-08 must enforce real eligibility/window/capacity and cannot treat it alone as entitlement.

## Authorization, transactions and concurrency

Existing trusted `events.manage` admits active verified admin/super_admin; member/anonymous/inactive users cannot manage. Caller-supplied roles, creator IDs or authority are rejected. Services reuse existing guards; repository reads recheck fresh DB authority in the same query. Writes lock the actor account, current role grants and event in consistent order, then recheck authority using a fresh ReadCommitted snapshot. Role deletion and account suspension cannot bypass the write guard. Active referenced media is share-locked during the write.

One transaction updates/creates the event, appends its next revision and inserts the audit. Failure of any mandatory step rolls back all three. Read content version is a canonical SHA-256 of the DB row with absolute timestamp epochs, not a JS-truncated updatedAt. Stale/concurrent submissions return EVENT_CONFLICT. Unique slug collisions return EVENT_SLUG_CONFLICT; no credential/token authority is associated with version hashes.

Audit uses BE-06 positive-listed event.created/event.updated/event.published/event.archived. Cancel/close/reopen changes are event.updated with status in changedFields. Audit stores field names and revision linkage, no content values or participant PII. Revision snapshots use established snake_case keys so BE-06 safe partial previews work; historical rows remain append-only. No audit mutation or revision-restore endpoint.

## Pagination and errors

List default 20, maximum 50, ascending `(starts_at,id)` keyset, fetch limit+1. Filters: eventType; managed lists additionally status. Cursor is bounded base64url data containing timestamp/UUID/filter binding, never authentication authority. Exact DB fractional timestamp is retained when applying cursors. Ordering is explicit even after aggregation; empty results stay empty and never generate demonstration events.

Maximum request JSON 32 KiB, description 30 paragraphs / 2000 characters each; title 200, summary 1000. No new cache for mutable sensitive management state. Existing `(status,starts_at,id)` and unique slug indexes support current lookup patterns; optional event-type/visibility aggregate listing indexes should follow representative Neon EXPLAIN evidence, not speculative duplication.

Codes: EVENT_VALIDATION_ERROR, EVENT_NOT_FOUND, EVENT_SLUG_CONFLICT, EVENT_CONFLICT, EVENT_INVALID_TRANSITION, EVENT_MEDIA_NOT_FOUND, EVENT_UNAVAILABLE, plus existing auth/authorization codes. No unbounded filter/SQL identifier is accepted.

## Compatibility and next scope

No legacy data backfill, schema cutover, auth environment/provider/profile changes, Member Card change or FE-04/05 modification. USS rows created outside this service with a different description shape need an explicit content crosswalk before public cutover; do not silently overwrite them. Persistent migrations were not run.

BE-08: transactional registration/eligibility, idempotency, capacity and cancellation policies; reconcile legacy registered/checked-in states with USS confirmed/waitlisted without regressing current hardening. Event passes and attendance remain BE-09/10. Invitation-only access can build on existing private visibility/eligibility configuration through a dedicated entitlement service. Pricing, transport/add-ons and capacity buckets require future typed normalized contracts, not fabricated data or generic unbounded JSON in this foundation. Media and sponsor links already have schema anchors but their managed services are not implemented here.

Staging gates: real Neon independent transactions/role revocation, runtime grant deployment and representative query plans. PGlite serializes test transactions and is not real distributed Neon concurrency evidence. Existing hydration audit, unsupported next lint, barcode scanning/reissue and revision restore limits remain open.
