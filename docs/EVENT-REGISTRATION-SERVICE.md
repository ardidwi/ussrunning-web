# BE-08 — Event Registration Service

Server-only registration foundation, building on BE-07 and existing account/authorization guards. No auth/provider configuration, FE-06 integration, payment, event passes, check-in/scanner or CMS writer UI. Existing legacy `public.*` RSVP implementation remains unchanged.

## Data and lifecycle

Use existing `uss.event_registrations`: DB-generated UUID; immutable event/account identity; unique `(event_id,account_id)`; status; first registered timestamp; cancellation timestamp; source and timestamps. Account UUID references permanent member identity; no email/name/phone/barcode duplication. Existing migration 007 prevents reassignment. No new migration, table, index or runtime grant needed.

Supported transitions: new/cancelled → confirmed or waitlisted; pending/confirmed/waitlisted → cancelled. Only enabled waitlists receive full-event applicants. Rejected and pending cannot self-confirm; their future administrative approval workflow is not implemented. A repeated confirmed/waitlisted booking returns its existing row while signup remains eligible. Cancel retries return the existing cancelled record without duplicate audit. Cancelled re-application reuses the UUID and first registeredAt, clears cancelledAt, and fully rechecks eligibility/capacity. No deletion or automatic waitlist promotion.

## Eligibility and access

Trusted current account must be authenticated, verified and active. No request account/role/status/source authority. Signup requires registration_open, public or members_only visibility, no archive marker, start time not reached, opensAt null or reached, closesAt null or not reached. Open boundary is inclusive; close/start are exclusive. Private events and unpublished/archived events fail closed. Nonempty eligibility_config and active required custom fields return REGISTRATION_CONFIGURATION_UNSUPPORTED; invitation/custom-answer services must be implemented explicitly before those events can accept signup. No fabricated entitlement or ignored required consent.

Owners read/cancel their own records; protected history remains accessible after event publication changes. Managed list/detail/cancel use existing events.manage for active admin/super_admin and fresh DB role checks. Admins cannot create registrations for arbitrary account IDs through this service. Managed lists require an event UUID. Owners cannot enumerate another registration; cross-event identifiers are rejected. No public registration-list endpoint.

## Cancellation policy

Pending/confirmed/waitlisted can cancel for published/registration_open/registration_closed/cancelled events. Owner deadline is event start, except cancelled events allow owner cleanup. Admin may cancel after start in allowed lifecycle states. Completed/archived/draft events are not cancellable; an existing check-in blocks owner and admin cancellation. No check-in writes/API added. Repeated already-cancelled requests are harmless even after event archive.

Cancellation payload requires expectedVersion from the read DTO. SHA-256 canonical row version includes absolute timestamp epochs; it is a concurrency token, not authentication. A stale cancellation after re-registration returns REGISTRATION_CONFLICT rather than cancelling the new booking. Server-generated cancellation timestamp and append-only audit actor/initiator/from/to status provide cancellation metadata without free-text PII.

## Locking and capacity proof

Every mutation uses one ReadCommitted transaction with separate statements: timeout → actor account FOR UPDATE → current role rows FOR SHARE → event FOR UPDATE → fresh mutation/count statement. The separate event lock statement is essential: after waiting, the next statement sees the preceding committed registration. There is no service-side availability read used for capacity.

Same event applicants serialize on its row. Inside that lock, occupancy counts confirmed registrations plus any existing checked-in registration, each once. Capacity null is unlimited metadata. If count < capacity, confirm; otherwise waitlist only when enabled, or EVENT_CAPACITY_FULL without changing/creating the row. Unique event/account remains the final identity safeguard. Concurrent retries cannot create another identity. Cancelled re-registration uses exactly this same path.

BE-07 managed capacity edits already lock the same event. A minimal integration guard now rejects a lower capacity than occupied slots with EVENT_CAPACITY_CONFLICT; registration and event edits cannot race past each other. Cancellation uses the same event lock and frees a slot after commit. Future promotion/approval/BE-09 entitlement/BE-10 attendance services must respect this lock order, current registration status and capacity protocol. Arbitrary privileged SQL is not protected by an aggregate CHECK constraint; runtime DB credentials remain trusted server-only.

Atomic mutation appends registration.created/updated/cancelled audit with registration identity, eventId, status transition, initiator and changed field names. An audit failure rolls back the registration and slot. Registration changes do not create content revisions. Generic BE-06 super-admin audit.read.all can inspect these minimized records; existing admin CMS audit positive-list is preserved, so broader operational registration-audit presentation needs a deliberate future policy extension. Administrative registration lists are available now.

## Contracts and boundaries

`lib/registrations`: types/policy, strict validation, errors, service, repository and server actions. Request values are parameterized. No raw SQL/provider error or complete account row crosses the action boundary.

- registerCurrentAccountForEvent({eventId})
- getCurrentRegistration({eventId,registrationId})
- getCurrentRegistrationHistory({eventId?,status?,limit?,cursor?})
- cancelCurrentRegistration({eventId,registrationId,expectedVersion})
- getEventRegistration({eventId,registrationId})
- getEventRegistrations({eventId,status?,limit?,cursor?})
- cancelEventRegistration({eventId,registrationId,expectedVersion})

Results: `{ok:true,data}` or `{ok:false,code}`. DTO: id, event `{id,slug,title,startsAt,timezone,status}`, registration status, registeredAt, cancelledAt, updatedAt and version. Managed DTO additionally exposes accountId for later authorized operations, without PII or admin notes. No member barcode or pass token returned.

Pagination defaults 20, max 50, descending immutable first registeredAt and ascending UUID. Exact UTC microseconds are retained; cursor binds trusted account scope, event filter and status. Request max 2 KiB/cursor max 512 bytes. Existing account/date and event/status indexes support these paths. Empty history returns an empty list. No cached mutable entitlement or per-row N+1 query.

Domain codes: REGISTRATION_VALIDATION_ERROR, REGISTRATION_NOT_AVAILABLE, REGISTRATION_CLOSED, REGISTRATION_NOT_FOUND, REGISTRATION_NOT_CANCELLABLE, REGISTRATION_PENDING, REGISTRATION_REJECTED, REGISTRATION_CONFIGURATION_UNSUPPORTED, EVENT_CAPACITY_FULL, REGISTRATION_CONFLICT, REGISTRATION_UNAVAILABLE plus existing auth/permission codes. No frontend string parsing or local role authority.

## Future boundaries

BE-09 consumes the stable confirmed registration UUID/event/account relation. It must recheck current confirmed entitlement before issuing/using passes and revoke/deny after cancellation; this task issues no tokens and changes no existing pass records. BE-10 must use the event lock and refuse cancelled/non-entitled attendance. Notifications, invitation proofs, custom answers, waitlist promotion and registration UI are not activated here. Existing public/USS identity crosswalk and authenticated flow staging remain explicit prerequisites for frontend cutover.

Local PGlite transaction and parallel fixture tests validate SQL/ordering, not independent real Neon sessions or production load. Real Neon concurrency, deadlock/load behavior, live runtime grants and query plans remain staging validation. No persistent database migration or operational signup was performed.
