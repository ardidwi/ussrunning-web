# BE-15 Dynamic Site Content

## Discovery and boundary
Actual source surfaces inspected: app/page.tsx, components/HomeMotionExperience.tsx inputs, components/auth/AuthShell.tsx, app/login/page.tsx, app/join/page.tsx, components/SiteFooter.tsx, lib/content.ts and lib/cms.ts. Existing public.cms_sections/public.site_settings and browser demo remain separate compatibility paths. No feature domain data is moved into Site Content; no frontend or auth configuration is changed. FE-14 and the subsequent public-surface adapter must explicitly consume these contracts; legacy public routes are preserved in this backend-only task.

There is no existing global announcement surface; an invented banner is intentionally not added. Recovery/reset/verification/security consent copy, auth policy, route authority and navigation permission behavior remain code/security-owned. Header routes and arbitrary component names are not CMS payloads.

## Supported slots (schema protocol 1)
| Key | Typed payload |
| --- | --- |
| homepage.hero | enabled, eyebrow, established, headline, description, optional CTA, desktop/mobile MediaAsset IDs, focus/overlay percentages |
| homepage.membership | enabled, kicker, headline, description, optional CTA/image MediaAsset ID |
| homepage.manifesto | enabled, label, bounded plain-text paragraphs, footnote, optional CTA |
| homepage.marquee | enabled, bounded text |
| homepage.featured | enabled, bounded unique Story/Gallery/Partner/Event UUID arrays |
| homepage.sections | exact permutation of next_runs/manifesto/stats/partners/membership/stories/gallery |
| login.visual | enabled, kicker, headline, description, desktop/mobile MediaAsset IDs, focus/overlay |
| auth.login | eyebrow, heading, description |
| auth.register | enabled editorial copy, eyebrow, headline, description, formKicker/formDescription, optional background MediaAsset ID |
| footer.global | tagline, newsletter copy, copyright copy, HTTPS Instagram/Strava links, validated contact email |

Enabled on auth surfaces controls editorial presentation only, never authentication availability. Consumers derive year for copyright; no dynamic year is frozen as configuration. Unknown fields/keys, arbitrary nested JSON, raw HTML/scripts, oversized payloads and unsupported components fail validation. Plain text is data, not sanitized HTML; consumers must render text and never dangerouslySetInnerHTML.

Payload <=32KiB, long text <=4000, headlines400, labels240, CTA label120, each featured domain array <=12 unique UUIDs. Percentages finite0-100. CTA is {label,href}|null. Media IDs optional/null; no raw image URLs in payload authority. Full typed draft replacement prevents ambiguous merges; expectedVersion prevents blind overwrite.

## Lifecycle and persistence
Reuses uss.site_content and immutable site_content_revisions. Migration016 adds optimistic version and schema_version (legacy0/newtyped1), protects identity/deletion and provides invoker helpers. Legacy JSON, published pointer and revision sequence remain intact, excluded from typed reads until explicit audited adoption. No new tables/indexes: existing unique key resolves the finite slot registry efficiently.

Create draft. Update draft or published record: content is the working draft, while published_revision_id continues serving its own published immutable snapshot. DTO has publishedPayload/publishedVersion and hasUnpublishedChanges. Publish validates draft and references, creates a new published revision and advances pointer atomically. Unpublish clears pointer and returns draft; archive clears public availability and retains all history. Archived records are read-only; restore deferred. Duplicate create conflicts. Publishing an unchanged eligible draft is safe but creates an auditable revision.

## Fallback and public delivery
getPublicSiteContent(key), getPublicSiteBundle(surface), getHomepageContent(), getAuthSurfaceContent(login/register). Bundles use one SQL request, including media projection and reference eligibility in the same snapshot. Supported surfaces homepage/login/register/global. Public DTO contains typed key/payload, safe media, source published/default/empty, fallbackReason missing/invalid/unavailable and publishedAt. It omits actor IDs, draft/revision metadata, storage keys and credentials.

Hierarchy: valid current published pointer -> approved copies of existing source defaults -> null payload safe empty state if default cannot validate. No stale cached DB record or fake feature data is used. A valid enabled:false is never replaced by defaults. Invalid slot fails closed; unavailable DB returns safe defaults with explicit reason. Defaults have null media and empty featured IDs; no fabricated media URL. Existing frontend wiring is not silently switched away from legacy content.

## References / media
Uses BE-11 resolveMediaAsset serializer; url:null/deliveryAvailable:false is valid and must be handled by FE. Draft references may include private media/unpublished domain records for protected preview, but must exist and not be archived/ineligible. Publish/public reads require public current references. Story scheduling/cover eligibility, Gallery items/cover/event eligibility, Partner window/logo eligibility and Event lifecycle are checked against existing domain rules. References remain IDs, not duplicated titles/bodies/media URLs; consuming feature service owns serialization.

Mutations lock referenced domain rows and direct media in the same transaction as revision/audit. Public reads recheck eligibility: a featured record or media later becoming private/archived removes that slot from delivery in favor of approved defaults. Existing BE-11 current/history JSON retention detects Site Content MediaAsset IDs; no provider or cleanup semantics changed.

## Authorization and managed FE-14 contracts
Active verified account + existing cms.content.manage (admin/super_admin). Trusted session guards and transactional DB roles/lifecycle recheck; client claims never authority. Managed actions: listManagedSiteContent({status?,limit?,cursor?}), getManagedSiteContent({key}), previewSiteContent({key}), createSiteContentDraft({key,payload}), updateSiteContentDraft({key,expectedVersion,payload}), publish/unpublish/archiveSiteContent({key,expectedVersion}), reorderHomepageSections({expectedVersion,order}). Reorder updates the one typed draft atomically; publish makes ordering public. Exact-set ordering rejects unknown/duplicate/missing sections.

Managed list default20/max50, cursor key ordering and status binding; registry currently10 slots, no unbounded arbitrary key growth. Results use {ok:true,data}/{ok:false,code}. Existing AccountError lifecycle codes preserved. Site codes cover NOT_FOUND/FORBIDDEN/CONFLICT/INVALID_KEY/INVALID_PAYLOAD/INVALID_REFERENCE/INVALID_URL/INVALID_STATE/NOT_PUBLISHABLE/UNAVAILABLE; SQL/provider internals are not returned.

## URL / security
Internal CTAs use known public routes, with optional safe query/fragment and slug detail paths. Reject protocol-relative URLs, backslashes, control characters, encoded path separators, unknown admin/API routes and script/data/http schemes. External links HTTPS only without credentials. No URL is fetched by this service; link publication is not an SSRF fetch path. Footer contact is a validated address, never arbitrary markup.

## Audit / revision / caching
Mutation, immutable revision, pointer/version and minimized audit are one transaction; required history failure rolls everything back. Existing append-only privileges retained. Audit records slot/changed-field names, never full payload/PII/secrets. Adds site_content.unpublished to operational history visibility; other domain policy unchanged.

Public services currently uncached: every read checks current pointers/references/server time. No code redeploy is needed to retrieve newly published data through these contracts. Future caching should tag surface/slot and referenced domain/media IDs; publish/unpublish/archive and reference eligibility changes must invalidate those tags. Do not cache fallback errors indefinitely. Draft/managed/preview must remain private and uncached. No new cache infrastructure or CMS frontend is built here.

## Staging / deferred work
No persistent migration is run. FE-14 needs approved migration016/runtime grants, real trusted CMS-session staging and explicit public-surface integration. Persistent media delivery remains unconfigured. Locale, rich text, revision restore, global announcement UI, granular cache invalidation and legacy unsafe-content adoption are deferred. Local PGlite transaction checks do not prove independent Neon concurrency. Existing Next16 next lint and wider hydration audit remain open. No Stories/Gallery/Partner/Event mutation semantics or auth-provider configuration changed.
