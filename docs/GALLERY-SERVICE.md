# BE-13 Gallery Service

## Boundary and model
Server-only validation -> service -> repository -> Neon/Postgres. BE-11 MediaAsset delivery serialization is reused unchanged; no upload/provider, Stories, scanner, auth or frontend changes.

Migration 014 creates uss.galleries: UUID, immutable unique slug, title, nullable description, draft/published/archived status, private/public visibility, optional event/cover UUID references, creator, integer version, timestamptz created/updated/published/archived dates. Existing gallery_items retain their legacy event/story/media references; additive nullable gallery_id, alt_text_override and removed_at associate new collection items. Existing legacy rows remain unassigned and untouched. No media URL or binary is duplicated.

Gallery item identity/media/parent is immutable. Active parent/media and parent/order are unique; existing unassigned legacy rows are outside these partial constraints. Existing gallery item UUID/caption/sort_order/created_at are reused. Gallery version serializes all metadata/item/lifecycle writes, so separate item versions are unnecessary. Gallery revisions are immutable, version-unique records with creator/action/date, metadata and active item ID/media/order snapshots. Captions are deliberately not copied into snapshots; full restoration is not implemented.

## Lifecycle
Creation is draft. Publish requires at least one active image item, eligible cover if present, and public media for public galleries. Public event-linked publication requires a public non-draft/non-cancelled/non-archived event. Private publication stays managed-only. Published collections must be unpublished to draft before metadata/item edits. Archive retains timestamps, records, items and media/history. No hard delete or restore. Scheduling is deferred: no product requirement justified it.

## Slugs and concurrency
Server title normalization uses NFKD ASCII separators and a bounded base, with gallery fallback. A transaction advisory lock serializes identical bases; collision uses the new UUID suffix, backed by unique slug. Clients cannot set/edit slug, creator, identity, publication status or permission. Title changes keep slug stable.

Every write uses expectedVersion except creation. A SECURITY INVOKER database function locks the active verified actor, trusted DB role assignments, then Gallery; checks lifecycle/version and referenced records before mutation. Existing cms.content.manage role membership is admin/super_admin. No client roles/account IDs. Function, Gallery mutation, item changes, revision and minimized audit are one transaction. Mandatory history/audit failure rolls back all writes. External delivery/storage IO is not held inside mutation transactions. Existing auth/session guards remain first boundary.

## Items and ordering
addGalleryItem appends at the next nonnegative order; active duplicate media is rejected. removeGalleryItem marks the reference removed (retained history), never deletes MediaAsset. Caption/alt update replaces both optional text values; omitted fields become null. Override absence permits consumer fallback to MediaAsset altText, never raw filename.

Reorder requires exactly all active item UUIDs, no duplicates/foreign/omitted items, current Gallery version. Parent locking serializes additions/removals/reorders. Temporary negative order values free the positive unique positions inside the transaction before assigning ordinal 0..n-1. Failed reorder returns GALLERY_ORDER_CONFLICT with no partial write. Collection cap is 1000 active items (service protocol constant and DB invariant); chunked/large-library reorder is future work. Gaps after removal are valid; ordering remains sortOrder + UUID. Offset/order is never client-controlled on add/update.

## Reads, media and visibility
Managed reads use trusted cms.content.manage plus repository authority checks. Public list/detail/items gate published + public + publication time reached, non-archived, at least one item, every active item/cover active and public JPEG/PNG/WebP. A now-private/cancelled event or media makes the entire public Gallery fail closed. Removing item references requires draft. Managed archive/history remain available.

Explicit cover is optional, without a fabricated URL or implicit first-item database write. Feature consumers may display a first-item preview explicitly. Joined media metadata is serialized through BE-11 resolveMediaAsset; delivery unavailable returns url:null / deliveryAvailable:false. Queries do not create N+1 media reads. Public DTO omits creator, account/event IDs, status/version/draft/audit/storage internals. Public item IDs are opaque editing-independent identity, not authority. Treat caption/alt/description as plain text, never HTML.

## FE-11 contracts
lib/gallery/gallery-actions.ts wraps services in {ok:true,data} | {ok:false,code}.

- createGallery({title,description?,visibility?,eventId?,coverMediaId?})
- updateGallery({id,expectedVersion,changes}) with same editable field allowlist
- publishGallery / unpublishGallery / archiveGallery({id,expectedVersion})
- listManagedGalleries({limit?,cursor?,status?,visibility?}), getManagedGallery({id})
- listPublicGalleries({limit?,cursor?}), getPublicGalleryBySlug(slug)
- listManagedGalleryItems({id,limit?,cursor?}), listPublicGalleryItems({slug,limit?,cursor?})
- addGalleryItem({id,expectedVersion,mediaAssetId,caption?,altTextOverride?})
- updateGalleryItem({id,expectedVersion,itemId,caption?,altTextOverride?})
- removeGalleryItem({id,expectedVersion,itemId})
- reorderGalleryItems({id,expectedVersion,itemIds})
- listGalleryRevisions({id,limit?,beforeVersion?}) returns metadata and nextBeforeVersion

Mutations return updated ManagedGallery, including current version; clients refresh bounded item pages after item changes. Item/list cursor scopes bind parent and public/managed filters, preserve timestamp precision and use stable tuple order. Lists default 20/max100. Concurrent item mutations require restarting pagination after version changes; no snapshot isolation across independent read pages is claimed. Reference selectors/pickers use existing BE-07/11 managed contracts. No new frontend routes or universal CMS history entity expansion.

## Validation/errors
Title 240, description 4000, caption 2000, alt1000 characters; trim plain strings and reject markup/control characters, nested/extra fields, invalid UUIDs/versions/cursors, excessive lists and arbitrary order authority. Errors: GALLERY_NOT_FOUND, FORBIDDEN, CONFLICT, SLUG_TAKEN, INVALID_STATE, INVALID_CONTENT, INVALID_INPUT, MEDIA_INVALID, INVALID_REFERENCE, NOT_PUBLISHABLE, UNAVAILABLE, ITEM_NOT_FOUND, ORDER_CONFLICT (all prefixed GALLERY_), plus existing account lifecycle codes. SQL/provider errors remain sanitized.

## History, retention and privileges
Audit actions gallery.create/update/publish/unpublish/archive/add/item/remove/reorder include revision ID and changed-field names, not captions or file bytes. listGalleryRevisions provides protected bounded metadata; full snapshots/restore and generic CMS Gallery history presentation remain future scoped integrations. A DB retention guard supplements unchanged BE-11 logic for Gallery cover/history; current/removed gallery_items already prevent MediaAsset archival. Conservatively retained references may require a later audited cleanup policy. No physical cleanup is run. Runtime template deliberately grants mutation-function EXECUTE, revokes revision UPDATE; no DELETE/TRUNCATE/schema/ledger privileges. Apply grants to new tables after approved migration; existing runtime roles are not silently granted by app startup.

## Staging limits
No persistent migration applied. Migration 014 must be rehearsed with approved runtime grants in isolated Neon staging. Real independent Neon concurrency, trusted active admin session QA, query plans and persistent media adapter/credentials remain pending. PGlite transaction fixtures are not production concurrency proof. No malware scanning/upload/bulk upload/physical cleanup, scheduling, restoration, search engine or feature-specific storage added. Existing public frontend remains unchanged; FE-11 must explicitly wire contracts and handle null delivery, version conflict and pagination. Known Next16 next lint and broader hydration audit remain open.
