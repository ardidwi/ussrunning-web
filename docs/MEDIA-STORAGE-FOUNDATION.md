# BE-11 Media Storage Foundation

## Boundary and deployment state

Server-only validation -> service -> repository -> storage adapter. Domain writers reference media UUIDs; binary data never enters Postgres. Existing `uss.media_assets` is reused. No Stories, Gallery, Partner, event/check-in, member identity or frontend behavior is implemented here.

Neon storage is enabled in the inspected project but has no buckets. No persistent provider is configured. Default `unconfiguredStorage` fails uploads with MEDIA_STORAGE_UNAVAILABLE. MemoryStorage is explicitly injected for development/tests, bounded to 32 MiB, rejected in production, non-persistent and returns no delivery URL. Do not use it for deployed persistence.

Production requires a separately configured persistent adapter, isolated bucket/prefix, server credentials with least privilege, create-if-absent writes, authoritative Content-Type/nosniff, and private access enforcement. The adapter must implement `put` and `deliveryUrl`; feature domains never select credentials/providers. No bucket or credentials were created by this task.

## Contracts

`lib/media/media-service.ts` exports uploadMedia, getMediaAsset, getPublicMediaAsset, listMediaAssets, updateMediaMetadata and softDeleteMedia. Inputs are unknown at the trust boundary and strictly allowlisted. Internal createMediaService permits trusted server adapter injection. No unrestricted upload route exists. These services require the Node.js runtime (Sharp and Neon), not Edge. Future request handlers must cap streaming request bodies before buffering and map MediaError/AccountError to stable responses; do not JSON serialize raw buffers or exceptions.

Upload: `{bytes: Uint8Array, mimeType, filename, altText?, caption?, visibility?}`. Private is default. Metadata: `{id, expectedVersion, altText?, caption?, visibility?}`. Archive: `{id, expectedVersion}`. List: `{limit?, cursor?, status?, visibility?}`, default limit 20, maximum 100, tuple cursor bound to filters.

DTO: id, url (nullable), deliveryAvailable, mimeType, sizeBytes, width/height (nullable for legacy records), altText, caption, active/archived status, private/public visibility, version, createdAt and updatedAt. Internal key/provider/public-url fields are stripped. No URL is invented when persistence/delivery is unavailable. Public reads expose only active explicitly public assets. Management uses existing cms.content.manage on trusted active/verified DB accounts (admin/super_admin), with transactional role/status rechecks. Member uploads are deferred.

## Validation and configuration

JPEG, PNG and WebP only; SVG, HTML and executable formats are rejected. Magic signature must match the declared MIME. Sharp 0.35.5 validates metadata and fully decodes raster contents with failOn warning and a pixel budget; animations/multiple pages are rejected. Originals are preserved. MIME, dimensions, byte size and SHA-256 are server-derived. SHA-256 is integrity metadata, not global deduplication: identical uploads remain independent assets.

Lazy server configuration: MEDIA_MAX_UPLOAD_BYTES=10485760 (10 MiB), MEDIA_MAX_DIMENSION=8192, MEDIA_MAX_PIXELS=16000000, MEDIA_UPLOAD_MAX_REQUESTS=10, MEDIA_UPLOAD_WINDOW_SECONDS=60, MEDIA_STORAGE_PREFIX=uss-media. Configure an environment-specific prefix and isolated provider environment. Invalid settings fail safely when used. Keys are prefix/server UUID/normalized extension; filenames never control paths. Filename max 255, alt text 512, caption 2000; text is plain data and rejects markup/control characters.

DB-backed per-actor upload reservations serialize through account row locks and count audit reservations in the configured window. Invalid full decodes/provider failures consume reservations. No anonymous uploads exist. Global/edge rate limiting and malware scanning are not implemented. Cheap rejection occurs before a reservation; request-layer body/rate controls are still needed before exposing routes.

## Persistence and concurrency

Migration 012 adds original_filename, checksum_sha256, visibility, archived_at and optimistic version; existing URLs are retained and marked public. Existing fields: UUID, storage provider/key, public_url, MIME, bytes, dimensions, alt/caption, uploader, status and timestamps. Storage key remains unique. A status/created_at/id index supports bounded library reads. No feature-specific table or new table is introduced.

Binary identity (including uploader/dimensions/checksum/key) cannot be updated; DELETE/TRUNCATE are guarded. Replacement uploads create a new asset, then the consuming feature changes its reference. Metadata changes/archive and minimized audit writes are atomic; concurrent stale edits return MEDIA_CONFLICT. External storage IO occurs outside DB transactions. Successful object write followed by failed metadata commit may leave an orphan: never automatically delete it.

## Retention and delivery

Soft deletion archives only assets with no known FK or current/historical JSON references. Historical snapshots are conservatively retained; false positives block deletion. References include profiles, event cover, story cover/social/body, partner logos, gallery and CMS/revisions. Future feature writers must lock/check active media when attaching references; the FK alone does not enforce active status. No automatic destructive cleanup or restore is implemented.

Orphan discovery later compares provider object inventories to storage keys and all references, with a documented operator-approved grace period. No physical-delete method is exposed now. Archived records and bytes remain retained. URLs may be public immutable object URLs or server-generated short-lived private URLs; private URLs must never be cached publicly or logged. Provider implementations define expiration/cache policy; HTTPS is required except local development. Public/private metadata alone cannot revoke a publicly cached binary: a future provider must enforce this boundary. Next/Image consumers must allowlist the real provider host; no image transformation/CDN platform is introduced.

## Audit and errors

Audit actions: media.upload.requested, media.created, media.metadata.updated, media.archived. Only asset/actor IDs and changed field names are stored; no bytes, filenames, captions, signed URLs or secrets. Runtime grants are unchanged and append-only audit constraints preserved.

Stable media codes: MEDIA_UNSUPPORTED_TYPE, MEDIA_TOO_LARGE, MEDIA_INVALID_CONTENT, MEDIA_INVALID_DIMENSIONS, MEDIA_VALIDATION_ERROR, MEDIA_NOT_FOUND, MEDIA_FORBIDDEN, MEDIA_STORAGE_UNAVAILABLE, MEDIA_CONFLICT, MEDIA_IN_USE, MEDIA_UPLOAD_FAILED, MEDIA_RATE_LIMITED, MEDIA_NOT_CONFIGURED, MEDIA_UNAVAILABLE. Existing account lifecycle errors are preserved. Infrastructure exceptions are sanitized.

## Future consumers

Stories/Gallery/Partners/site content can reuse typed IDs/DTOs and authorized service methods. A future event QR centerLogoMediaId references a media UUID; no logo or identity data is embedded in event-pass tokens. Avatar upload, feature writers, production adapter, malware scanning, streaming endpoints, private delivery staging and physical cleanup remain separate work.
