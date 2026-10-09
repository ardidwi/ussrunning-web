# BE-06 RBAC and audit/revision read foundation

Sources: PRD, ERD, database foundation, account lifecycle, email verification and member profile/card contracts. Current request scopes BE-06 to authorization and read-only history; role/status mutation, CMS CRUD/publishing, snapshot writers and restore remain future services. No new role, schema, route, auth dependency or legacy cutover.

## Trusted authorization

Authentication stays Neon Auth. BE-02 resolves the provider session into the current USS account. `getAuthorization()` then checks fresh DB account status/verification plus joined account_roles/roles. Provider role/email bootstrap, request accountId/role, localStorage and UI visibility never authorize these services. Unknown DB role codes fail closed. The existing active-account guard supplies UNAUTHENTICATED / EMAIL_NOT_VERIFIED / ACCOUNT_SUSPENDED / ACCOUNT_DEACTIVATED. Missing account and unavailable DB use controlled codes.

Application-owned permission matrix in lib/authz/permissions.ts:

| Permission | member | admin | super_admin |
| --- | --- | --- | --- |
| profile.read.self / profile.update.self / member_card.read.self | Yes | Own only | Own only |
| cms.content.manage / stories.manage / partners.manage / events.manage | No | Yes | Yes |
| audit.read | No | Operational only | Yes |
| audit.read.all | No | No | Yes |
| users.manage / roles.manage / settings.manage | No | No | Yes |

Manage permissions reserve future domain CRUD; they do not implement CRUD, override own-profile ownership or authorize unchecked request IDs. All operational content permissions currently have identical admin/super_admin scope, with separate names for future services. Registration/check-in permissions will be added with their actual service policy rather than unused speculative capabilities.

Guards: `requirePermission(permission)`, `requireAnyPermission(nonEmptyPermissions)`, `requireRole(exactRole)` return server-only AuthorizedAccount (current account + DB roles). Exact role guard does not infer admin role membership from super_admin; permissions implement capability inheritance. Invalid/absent permission returns INSUFFICIENT_PERMISSION. Raw SQL/provider errors become AUTHORIZATION_UNAVAILABLE. No elevation/assignment/revocation/status mutation endpoint is introduced. Public provisioning still assigns member only. Admin cannot self-elevate; reserved capabilities require the trusted super_admin DB role.

Future CMS services call requirePermission before processing protected data and recheck/lock authorization in their write transaction. Role/status changes must coordinate on the account row and append minimized audit in the same transaction. Runtime broad DELETE is deliberately absent; a future role-revocation service requires reviewed narrow grants/design. These read helpers do not solve admin ownership bootstrap or arbitrary server-credential compromise.

## Audit contract

Server Action `getAuditHistory(filters={})` in lib/audit/audit-actions.ts returns HistoryResult<AuditPage>. Types are in audit-types.ts. No REST duplicate, public endpoint or frontend change. Filters: limit, cursor, from, until, actorId, action, entityType, entityId only; unknown keys are rejected after authorization.

Admin sees only entity types site_content/story/partner/event AND matching positive-listed actions `<entity>.created|updated|published|scheduled|archived|restored`. A content-looking action attached to an account/security entity is excluded. Unknown future action categories are excluded until explicitly reviewed. super_admin may query all categories but receives the same minimized DTO. Member has no administrative history access.

AuditDTO: id, actor (accountId + safe bounded displayName or null), action, entityType, entityId, revisionId, occurredAt, metadata.changedFields. No current role guessed as historic actor role, provider ID, email, recipient, IP hash, request/session IDs, raw change summary or old/new PII values. Changed field names are a bounded positive list, not caller arbitrary text. No audit edit/delete/overwrite exists. Existing append-only triggers/runtime grants are unchanged.

## Pagination and validation

Central HISTORY_POLICY: default 25, maximum 100 rows, 4096-byte input, 512-character cursor. Integer limits only. UUIDs validate before SQL casts. Action/entity labels use a bounded literal syntax; no LIKE wildcard/raw query. UTC timestamps must be real calendar instants with Z (up to six fractional digits). Audit default window is last 30 days, maximum 366 days per request; longer history must be queried in bounded windows. Excessive/reversed/malformed ranges are rejected. Empty results are valid.

Audit cursor carries exact PostgreSQL microsecond timestamp, UUID and fixed from/until window. Order: created_at DESC, id ASC. Next pages inherit the original window, preventing clock drift; clients keep filters unchanged or restart pagination. Revision cursor carries entity/parent/version/UUID and rejects use on another parent. All cursors are opaque pagination positions, unsigned and never authorization credentials. Editing a cursor cannot widen role scope because every query rechecks scope. No total-count query or offset scan.

History query rechecks DB role/status in the SAME snapshot as returned rows, even if the role/status changed after the initial guard. Lost permission during that interval returns INSUFFICIENT_PERMISSION rather than data. Reads valid at their snapshot cannot retract data after a later committed suspension; this is ordinary transaction semantics. No mutable permission cache or per-row N+1 actor queries. One joined authorization read and one history query after existing provisioning/session guard.

## Revision contract

Actions in lib/revisions/revision-actions.ts:
- getRevisionHistory({entity,entityId,limit?,cursor?}) -> HistoryResult<RevisionPage>
- getHistorySnapshot({entity,entityId,revisionId}) -> HistoryResult<RevisionDetail>

Entity is a closed union site_content/story/partner/event, mapped to the actual existing revision table, parent FK and domain manage permission. No caller table/column identifier. Metadata includes revision UUID, parent UUID, version, action/status, timestamp and safe actor. List omits snapshot entirely. Missing detail/wrong parent returns HISTORY_NOT_FOUND; existing parent with no revisions returns empty history. Neither draft nor published history is public.

Detail is a discriminated union, `snapshotScope:"safe_preview"`, with an explicit **partial** typed snapshot:
- Site content: headline, description, ctaLabel.
- Story: title, slug, excerpt, status, featured, sponsored.
- Partner: name, slug, description, visible, featured.
- Event: title, slug, summary, status, startsAt, endsAt, timezone, venueName.

SQL fetches only these bounded scalar keys (max 2048 bytes/value), not arbitrary whole JSON. Service suppresses unsafe HTML/control/email/obvious secret-bearing text, then returns typed fields. This defensive heuristic is not a universal PII detector: future writers must validate approved editorial data at source. Rich body, arbitrary nested CMS configuration, URLs, raw secrets and operational PII are deliberately excluded from generic previews. Legacy nested content may produce an empty preview; future entity-specific CMS read schemas should deliberately extend the projection rather than expose raw JSON. Historical full DB snapshots remain intact; preview DTOs cannot reconstruct/restore content. Future authorized restore creates a NEW revision and audit, never overwrites history.

Stable errors: existing auth codes, INSUFFICIENT_PERMISSION, AUTHORIZATION_UNAVAILABLE, HISTORY_VALIDATION_ERROR, HISTORY_NOT_FOUND, HISTORY_UNAVAILABLE. Frontend consumes codes, not exception text. Services sanitize direct SSR errors as well as actions.

## Schema, privilege and compatibility audit

No migration/index/grant needed. Existing audit_created/actor_time/entity_time indexes support bounded window queries; revision UNIQUE(parent,version) and PK support list/detail. Query plans/data volume should be measured in real staging before adding an action-only or JSONB index. SQL values are parameterized; only code-owned maps supply identifiers. No database/client/logging credentials or new connection engine. Existing non-owner runtime grants permit SELECT while append-only history UPDATE/DELETE/TRUNCATE remain denied.

Legacy public.* and lib/session.ts provider/email role behavior stay unchanged. This is an additive USS contract, not proof that legacy CMS now uses new RBAC. FE-05/new USS CMS must consume these guards/contracts; planned legacy RBAC/crosswalk cutover needs its own reviewed migration. No UI/route, provisioning, email activation, identity/lifecycle or dependency changes. Own-profile/card services retain their existing ownership guards.

Remaining staging work: real Neon independent sessions/transport/non-owner deployment role, historical identity/role crosswalk, index query plans at scale, source validation for future rich snapshot writers and explicit audited elevated-role ownership/revocation policy. FE-04 can consume BE-05; FE-05 can consume read/permission contracts. Next backend service should implement domain-typed CMS content writes with atomic revision + publish pointer + audit and these permissions, without silently replacing legacy persistence.
