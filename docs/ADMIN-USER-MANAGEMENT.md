# BE-17 Admin User Management

## Boundary and authorization
Uses existing uss.accounts/member_profiles/account_roles, BE-02 trusted session, BE-04 lifecycle guards and BE-06 permission policy. No second identity table, provider change, role writer or frontend route. `users.manage` already exists and belongs only to super_admin; ordinary admin/member cannot list/read/mutate accounts. No broadening of the role hierarchy. The server service resolves the actor; repository reads and invoker mutation independently recheck active + verified + trusted DB role. Client input identifies the target only, never the actor. DB credentials remain server-only; SQL values are parameterized.

## FE-15 contracts
Import Server Actions from lib/admin-users/user-actions.ts and DTOs from user-types.ts:
- listManagedUsers({limit?,cursor?,status?,verified?,role?,search?,memberId?,createdFrom?,createdTo?}) -> {items,nextCursor}.
- getManagedUser({id}) -> ManagedUserDTO.
- suspendUser / deactivateUser / activateUser({id,expectedVersion,reason}) -> {id,code:'USER_STATUS_UPDATED'}; reload detail to obtain a new version.
All actions return {ok:true,data} or {ok:false,code}; no raw database/provider exception. A successful mutation is a committed change, not a provider-session revocation or successful subsequent read. There is no arbitrary profile edit, role/permission editing, member ID/barcode rotation, verification override, bulk operation or resend action.

DTO: id, displayName, operational email, memberId, status, emailVerified/emailVerifiedAt, read-only system roles, createdAt, updatedAt, statusChangedAt, lastLoginAt, version; profile {exists,fullName,city,marketingConsent,privacyConsentAt}. Missing profile is represented honestly without repair/overwrite. Email is necessary for exact identity/support lookup; full name/city provide a limited profile cross-check. No barcode, phone, birth date, emergency contact, provider ID, role-grant metadata, proof/hash, session token, credential or audit reason is returned. Treat the entire managed DTO as privileged PII; do not log it or expose it publicly. lastLoginAt reflects existing stored evidence only, not newly implemented provider login tracking.

## Search and pagination
Default20, max100; 4KiB request cap. Cursor creation timestamp DESC / UUID ASC, bound to normalized filters, preserving PostgreSQL submillisecond precision. Cursor is a pagination position, not authorization. Name search is a literal display-name prefix (3–100 chars), email search is case-insensitive exact match; user LIKE wildcards are escaped. Profile full-name substring search is not implemented. Member ID is exact, normalized uppercase, UUID-format checked. Status/verification/role filters use database state. Date boundaries must be paired timezone-qualified ISO timestamps, ordered, max366 days, inclusive. Unknown fields/roles/states, impossible dates and oversized filters fail closed. No total-count/unbounded listing or heavy full-text infrastructure. Existing email/member uniqueness and role/status indexes reused; creation/UUID and lower(display_name) prefix indexes added for actual query paths. Query-plan benchmarking on large real datasets remains BE-19.

## Lifecycle and optimistic concurrency
State names and verified-account invariant are unchanged:
- active -> suspended or deactivated.
- suspended -> active (verified only) or deactivated.
- deactivated -> active (verified only).
- pending_verification -> deactivated only through this service. Pending -> active remains BE-03 proof consumption; this service never grants verification, even from provider metadata.
- Repeated same-state commands are invalid state (or conflict when submitted with stale version); no duplicate audit.
Every operation requires a plain-text reason5–500 chars. HTML/control characters, unknown fields and nonpositive/unsafe expectedVersion are rejected. Reasons are internal audit notes: operators must avoid personal/secrets-heavy text. Status mutation does not change email, profile, roles, member ID/barcode, verification timestamp, registrations/passes/attendance or history. Reactivation is an explicit operational reversal of suspension/deactivation for an already verified account. Pending/unverified deactivated accounts require a future dedicated recovery workflow; no silent restore/bypass.

Migration018 adds accounts.version (starts1) and status_changed_at. All account UPDATEs increment version server-side, even if another internal caller changes display/login metadata; stale managed forms then conflict conservatively. status_changed_at is server-owned and changes only with status. Preexisting lifecycle timestamps are unknown/null, not backfilled from unrelated activity. Profile edits have their own BE-04 version and are not changed here.

## Protected access and concurrency
All own-account lifecycle actions are denied. All super_admin target accounts are protected in BE-17, including suspended/deactivated ones; ownership/security recovery belongs to a separately designed workflow, not a BE-17 backdoor. Attempting to disable the last active verified super_admin returns USER_LAST_SUPER_ADMIN; other self actions return USER_SELF_ACTION_FORBIDDEN; other protected targets return USER_PROTECTED. Protection derives from actual account_roles, never email literals. There is no new protected-user flag or guessed system email. Ordinary admin/member accounts may be managed by a different authorized super_admin.

Invoker manage_account locks actor and target account rows in UUID order, then relevant assignments/role rows, rechecks actor/target/protection/expectedVersion, writes status and audit in one transaction. Same-target concurrent updates serialize; only the first matching version can commit. Every super_admin target is blocked, so two BE-17 actions cannot jointly remove the last usable path. Future BE-18 grant/revoke workflows must coordinate these account/assignment locks AND preserve their own last-owner invariant; BE-17 does not claim to secure future arbitrary role writers or direct owner SQL. No auth-provider calls/network inside transaction.

## Verification and session effect
Verification is read-only. No resend integration is exposed: BE-03 own-account cooldown/proof flow remains authoritative, and BE-16 intentionally excludes legacy verification proof replay. Pending status cannot be manually activated. No Better Auth OTP/proof/provider/session implementation is added.

Suspend/deactivate leave the provider session cookie technically valid. Existing trusted guards and fresh DB lifecycle checks reject subsequent protected USS operations, including the legacy getCurrentUser compatibility boundary. No fake logout/session invalidation is claimed. Already completed or in-flight provider/network effects cannot be undone by status change. Immediate provider-session revocation and real authenticated stale-session QA remain follow-up; public pages remain public.

## Audit and errors
Successful transitions insert account.suspended/account.deactivated/account.reactivated with actor,target,DB timestamp,from/to status,changedFields:['status'],new version and bounded reason. Audit failure rolls back account version/status/time; history remains append-only. Reasons are not added to general admin DTOs or ordinary admin operational history allowlist. Super_admin history access continues through BE-06 audit.read.all. No event/body/profile/credential payload is logged.

Stable errors: USER_NOT_FOUND, USER_FORBIDDEN, USER_CONFLICT, USER_INVALID_STATE, USER_PROTECTED, USER_SELF_ACTION_FORBIDDEN, USER_LAST_SUPER_ADMIN, USER_VERIFICATION_UNAVAILABLE, USER_SEARCH_INVALID, USER_INVALID_INPUT, USER_UNAVAILABLE. Existing UNAUTHENTICATED / EMAIL_NOT_VERIFIED / ACCOUNT_SUSPENDED / ACCOUNT_DEACTIVATED and configuration codes are preserved.

## Deployment and remaining scope
Migration018 is additive; runtime-grants.sql explicitly grants invoker execute. No startup migration, persistent production/staging migration, provider reset, credential rotation or real email occurs in this task. Rehearse migration+runtime grants on an authorized isolated Neon branch before persistent cutover. Roll forward with a new migration; application rollback may leave additive metadata/indexes intact; never reset existing identity/history.

Local PGlite/provider-boundary regression proves SQL/transaction behavior but is not independent real Neon concurrency or live authenticated super_admin session proof. FE-15 can consume safe list/detail/lifecycle contracts now after approved schema/grants setup. BE-18 must implement elevated-role ownership/bootstrap/revocation separately. Advanced search/performance, bulk actions, provider-session revocation, full consent/privacy workflows and human operational QA remain deferred. No unrelated frontend redesign or content-domain semantics were changed.
