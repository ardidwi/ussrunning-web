# BE-12 Stories / Editorial Service

## Scope and compatibility

Server-only validation -> service -> repository -> Postgres, with existing RBAC, immutable history and BE-11 media references. Existing `uss.stories`, story revisions and DB-owned taxonomy are reused; no second editorial database or rich-text framework. Existing public.* data and public page rendering are untouched. FE-10/public adapters must explicitly adopt these contracts after approved isolated migrations/configuration. No persistent migration was executed here.

## Model

UUID; stable unique slug; title; explicit/fallback excerpt; body paragraphs; DB contentType and optional categoryId; coverMediaId; trusted authorAccountId; draft/scheduled/published/archived status; private/public visibility; featured; publishAt/publishedAt; existing created/updated/archive timestamps; optimistic integer version. Actor/editor references live in revisions and audit records rather than duplicated author PII.

Migration 013 adds visibility (safe private default) and version. Version backfills from greatest existing revision number to avoid collisions; existing identity/body/revisions survive. It adds status/created/id managed pagination and visibility/status-filtered publication-date public pagination indexes. UUID/slug/created_at are immutable; physical delete/truncate rejected. Existing author FK remains reusable for a future audited legacy crosswalk; client authorship mutation is not supported. No old migration was edited.

Existing sponsor/partner/tag/SEO/social/CTA fields and relationships remain intact, but their writers/enrichment are not added in this minimal foundation. Content types/categories remain DB-owned; no editable taxonomy hardcoded/seeded by this task. getStoryReferenceData reads active selectors (100 maximum with truncated flag); missing/inactive references return STORY_INVALID_REFERENCE. Taxonomy administration is a later scoped capability.

## Content and safety

Body contract is `string[]` of plain paragraphs, matching the current legacy public renderer. Maximum 100 paragraphs, 4000 characters each and 64000 serialized UTF-8 bytes. Title max 240, excerpt max 600. Trim input, reject raw HTML/angle brackets/control content, nested objects and unbounded payloads; no server HTML sanitizer or markdown execution is introduced. Explicit excerpt is preserved; a missing/null excerpt uses bounded paragraph text. Consumers must render text as text (e.g. React paragraphs), never dangerouslySetInnerHTML. HTML entity strings remain literal text. Future structured-block format needs an explicit versioned contract; no claim of sanitizing arbitrary HTML.

Read validation fails closed for unsupported/unsafe USS legacy body shapes. No historical content is rewritten. Public list returns summaries without body; detail returns validated paragraphs. Managed list also omits body; getManagedStory provides edit content. Cover alt/caption remain plain BE-11 data and must not be interpreted as HTML.

## Slugs

Server normalizes initial title with NFKD/ASCII word separators, max 100 base characters, fallback `story` for non-ASCII-only titles. An advisory transaction lock on the normalized base serializes collision handling; existing base gets a full UUID suffix from the new Story identity. Database unique slug is final protection. Clients cannot supply or change slug. Title edits preserve URLs. Slug changes/redirect policy are deferred to a dedicated audited workflow.

## Lifecycle and publication

Create -> draft. Draft/scheduled may update with expectedVersion, but a scheduled article whose publication time is reached cannot be edited until unpublished. Draft/scheduled -> published validates title, nonempty paragraphs, author reference, active configured taxonomy and active image cover. Covers are required for publication; public stories require public covers. Private publication is managed-only.

Draft/scheduled -> scheduled requires a valid future absolute timestamp; server clock is authoritative. Scheduling already existed in PRD/schema, so it is supported without a background worker: public reads include due scheduled rows using publishAt. Storage status remains scheduled after availability; no hidden background mutation or fabricated publish audit occurs. Public queries also exclude future published_at or publish_at values, archived records and non-public/ineligible media. All due-time gating is SQL/server-time, never browser authority.

Published/scheduled -> draft via unpublish, removing public exposure; then edits may occur. Any non-archived state -> archived retains content/history. Archived mutation/restore and repeated lifecycle transitions return controlled invalid state; no restore implemented. Publish/update requests must include the current version, and stale/parallel writes conflict. Publishing overwrites no historical revision.

## Authorization and transactions

All managed reads/writes reuse cms.content.manage: trusted active/verified admin or super_admin, never client roles/account IDs. BE-06 stories.manage history permission has the same current role membership and remains unchanged. Public list/detail need no session and contain no internal account IDs, story version/draft metadata, storage keys or audit data. Author exposes only safe displayName.

Writes lock the actor, role assignments and current Story, then recheck authority/version/state in a fresh READ COMMITTED statement. Media/type/category rows are checked/locked while attaching or publishing. Story + new immutable revision + minimized audit are one transaction; mandatory audit failure rolls back all writes. Slug creation uses its own scoped advisory lock. No external storage IO occurs in editorial transactions. Real independent Neon connection validation remains a staging gate; fixture concurrency is not production proof.

## Media

Reference media UUIDs, never duplicate URLs in Story persistence. Reuse BE-11 delivery serialization via resolveMediaAsset (repository-validated record), joining metadata in the Story query rather than N+1 media reads. Storage/provider semantics are unchanged. Missing/archived/unsupported covers reject mutations; private covers cannot publish publicly. Active metadata with unavailable delivery is valid: cover.url=null, deliveryAvailable=false, dimensions/alt text/reference still usable. No deployed upload capability is assumed. Historical cover IDs are retained in revision snapshots, so archive/delete remains conservatively blocked by BE-11 references.

## Contracts

`lib/stories/story-actions.ts` is the FE server-action boundary, wrapping typed service DTOs in `{ok:true,data}` or `{ok:false,code}`.

- createStory(content): server author/UUID/slug, initial draft.
- updateStory({id, expectedVersion, changes}): allowlisted partial changes; server merges/validates under optimistic version.
- publishStory / unpublishStory / archiveStory({id, expectedVersion}).
- scheduleStory({id, expectedVersion, publishAt}).
- getManagedStory({id}); listManagedStories({limit?,cursor?,status?,visibility?}).
- getStoryReferenceData(): bounded active type/category choices.
- getPublicStoryBySlug(slug); listPublicStories({limit?,cursor?}).

Content allowlist: title, excerpt, body, contentType, categoryId, coverMediaId, visibility, featured. No role/status/author/slug authority from mutation payloads.

List limits default 20 / maximum 100. Descending timestamp+UUID tuple cursors bind managed/public scope and filters, preserving DB microseconds. Public ordering uses COALESCE(published_at,publish_at); managed ordering uses created_at. No full-text/title search introduced (BE-19). Public list executes one query with bounded cover joins. Lists omit bodies to bound payload size. Future public adapters must invalidate editorial caches upon writes; current public frontend remains legacy-compatible, not cut over here.

Stable codes: STORY_NOT_FOUND, STORY_FORBIDDEN, STORY_CONFLICT, STORY_SLUG_TAKEN, STORY_INVALID_STATE, STORY_INVALID_CONTENT, STORY_INVALID_INPUT, STORY_MEDIA_INVALID, STORY_INVALID_REFERENCE, STORY_NOT_PUBLISHABLE, STORY_UNAVAILABLE plus existing account lifecycle codes. SQL/provider exceptions never reach clients.

## History

Actions: story.created, updated, published, scheduled, unpublished, archived. Each revision stores the bounded typed content snapshot, slug/state/publication times and trusted editor; audit stores revision linkage and changed field names only, not article body. Cover changes are recorded in update changedFields/revision; slug cannot change. Existing BE-06 revision preview remains a safe partial allowlist, not full restore. No history edits/deletes.

## FE-10 and remaining gates

FE-10 can consume typed detail/list, optimistic mutations, lifecycle, reference selectors, safe media and existing protected history APIs. Actual deployed writes require approved migration 013 (and BE-11 012), DB reference records and trusted active sessions. Persistent storage adapter/credentials remain unconfigured; preview must handle null delivery. Rich blocks, tags/SEO/disclosure/partner enrichment, taxonomy management, full restore, slug redirects, search and production role/concurrency QA remain explicitly separate work. No Gallery, Partner, site-content, auth/pass/check-in or FE-08/09 behavior changed.
