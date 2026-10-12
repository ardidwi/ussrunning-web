# BE-14 Partner / Sponsor Service

## Architecture and identity
Validation -> server-only service -> parameterized repository -> transactional database function. Reuses uss.partners, uss.event_partners and BE-11 MediaAssets. No binaries, duplicate logo URLs or feature-specific storage logic.

Canonical partner: UUID, immutable server slug, name, plain-text description, HTTPS website URL, logoMediaId, type (partner/sponsor/collaborator), optional tier token, visibility, isGlobal, validity window, status, sortOrder, optimistic version and timestamps. Event association: stable UUID, eventId, partnerId, tier override, placement, validity window, active/inactive status, position and version.

## Lifecycle
Create draft. Edit draft/inactive only; deactivate active records before editing. Activate requires name and eligible logo. Deactivate active; archive retains canonical records and associations. Restore deferred. Slug normalization is server-owned, remains stable on rename, and collisions receive full random UUID suffix.

## Authorization / FE-13 contracts
Existing partners.manage permission requires trusted active/verified admin or super_admin. Service guards and DB transaction authority checks both apply. No client role/account authority.

lib/partners/partner-actions.ts returns {ok:true,data} or {ok:false,code}.
Public: listPublicPartners, getPublicPartnerBySlug, listEventPartners.
Managed: listManagedPartners, getManagedPartner, createPartner, updatePartner, activatePartner, deactivatePartner, archivePartner.
Event: listManagedEventPartners, getManagedEventPartner, attachPartnerToEvent, updateEventPartner, detachPartnerFromEvent, reorderEventPartners.
Mutations require expectedVersion where an existing record changes. Event relationships require eventId plus relationship ID. Cross-event manipulation is rejected. Detach marks inactive; reattach preserves relationship identity.

## Presentation and ordering
Tier is a normalized token <=40 characters, [a-z0-9][a-z0-9_-]*, not a hardcoded business taxonomy. Placement is event_page/event_pass/sponsor_section; these are bounded domain values, not component names or style tokens. Extensions require contract/migration review.
Global order is server-assigned append order plus UUID tie-breaker. Event reorder requires exact complete active set with individual expectedVersion, <=100 relationships. Event locking, temporary positions and unique active position index make reorder atomic. Canonical partner locks serialize revision numbering across events.

## Public visibility and pagination
Public records must be active/public, not archived, currently valid and reference eligible public logo. Global list requires isGlobal. Event list additionally requires public eligible event and active/current association. Public DTO excludes account IDs, storage keys, audit/revision metadata and managed lifecycle fields.
Default page20/max100. Filter/event-scoped validated cursors. Managed lists createdAt/UUID descending; public global/event lists position/UUID ascending. Joined media prevents N+1 queries.

## Media and content security
Logo references active JPEG/PNG/WebP; public partner requires public media. BE-11 serializer returns url:null/deliveryAvailable:false when delivery is unconfigured. Canonical logo MediaAsset ID supports future explicit QR branding; no automatic logo selection, QR rendering or token changes.
URLs must be absolute HTTPS without credentials. Script/data/http schemes, controls and malformed URLs rejected. Text remains plain data; raw HTML rejected.

## Audit / revisions
Canonical or relationship mutation, immutable partner revision and minimized audit are atomic. History failure rolls back all writes. Relationship changes increment canonical version, preserving one revision sequence. Audit contains IDs/changed field names, not full descriptions. BE-06 history recognizes partner activation/deactivation and event attach/update/detach/reorder actions.

## Migration / compatibility
015_partner_sponsor_service.sql adds columns, indexes and invoker functions to existing tables. Archived legacy partners stay archived; other legacy partners default draft/private/non-global, associations inactive. Existing legacy fields, URLs, tiers, sort_order and associations remain retained. Revision numbering follows existing maximum. Inactive legacy tier labels remain readable as bounded plain text; new/updated active tier inputs use the strict token contract. Legacy unsafe HTML/URLs require explicit audited remediation before strict service serialization/activation; no silent rewriting. Existing public.* frontend flows remain unchanged.
Runtime grants add execution of two invoker functions, not history mutation privileges. Existing ledger/checksum runner controls reruns. No persistent migration performed.

## Errors / limitations
Stable PARTNER_* errors cover missing/forbidden/conflict/slug/state/content/input/media/reference/publication/unavailable/URL/event/relation failures. Infrastructure internals are sanitized.
Persistent storage, approved migration/runtime-grant staging deployment, real independent Neon concurrency and trusted admin session validation remain prerequisites. Local transaction tests are not production proof. Bulk operations, global reorder, restore, future QR configuration and richer placement policy deferred. Next16 next lint limitation unchanged.
