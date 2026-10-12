# FE-10 — Managed Stories CMS

FE-10 adds a Stories workspace inside the existing `/admin` CMS shell. It uses BE-12 server actions for every protected read and write, BE-11 MediaAsset reads for cover selection, and the existing `cms.content.manage` permission projection for navigation. Server-side BE-12 guards remain authoritative.

## Routes and components

The existing `/admin?module=stories` route shows a bounded managed list. `view=create` opens a new private draft editor; `view=edit&id=<id>` opens an existing Story; `view=preview&id=<id>` starts a protected preview. These are query views in the existing CMS shell, not a new route or permission layer. The development-only `/design-system?surface=stories` fixture is inaccessible in production.

`StoriesWorkspace` loads the list/detail and active reference data on the server. `StoryEditor` owns the interactive plain-text form, lifecycle controls, private preview and unsaved-change state. The shared `MediaAssetPicker` lists active BE-11 assets in bounded 20-item pages. The FE-01 Field, Textarea, Select, Checkbox, Button, Modal and EmptyState components are reused. The CMS shell's existing mobile navigation and FE-03 navigation guard are reused, with Story-specific discard copy.

## BE-12 contract

The workspace consumes `listManagedStories` (20-item opaque cursor, optional status filter), `getManagedStory`, `getStoryReferenceData`, `createStory`, `updateStory`, `publishStory`, `scheduleStory`, `unpublishStory` and `archiveStory`. `features/stories-cms/api/actions.ts` is a narrow frontend server-action adapter that strips the managed DTO's internal `authorAccountId` before it reaches the client and revalidates `/admin` after successful writes. It does not change BE-12 contracts or permission guards.

Create begins as `draft`. Saves send only changed BE-12 fields plus `expectedVersion`. On `STORY_CONFLICT`, the editor retains unsaved text and offers explicit reload of the latest version after discard confirmation; it never blindly retries. The editor maps BE-12 stable errors to human copy, including slug collision, invalid content/reference/media, invalid lifecycle state and not-publishable status. Inputs remain after recoverable failures. Submit is locked during a request.

The Story slug is generated and owned by BE-12. The CMS displays `/stories/{slug}` read-only and never derives it from title edits. The public route still uses legacy Stories data, so the CMS does not promise that public rendering matches the managed draft or published record yet.

## Editorial model and lifecycle

The body editor uses the FE-01 auto-growing Textarea. Blank lines delimit paragraphs; the editor sends a `string[]` to BE-12. The preview renders each paragraph as React text, without HTML or markdown interpretation. The client mirrors visible BE-12 limits (title 240, excerpt 600, 100 paragraphs, 4,000 characters each, 64 KB serialized body) for immediate guidance; the backend remains the validator.

Published Stories are read-only. The UI explains **Unpublish → Edit → Publish** and calls BE-12 for every transition. Drafts can publish or schedule; scheduled Stories can publish, reschedule or unpublish; non-archived Stories can archive. Archived Stories are terminal. Publication requires a valid cover under BE-12. The controls never infer or perform unsupported transitions.

Scheduling uses an explicit Jakarta `datetime-local` value with a fixed `+07:00` offset, validates the calendar value, and displays both the Jakarta/WIB reading and absolute timestamp in a confirmation dialog. The backend remains responsible for publication timing and state. This operational UI currently assumes Jakarta as its editorial scheduling zone; adding editor-selectable IANA zones is future scope if the product requires non-Jakarta scheduling.

## BE-11 media

The reusable picker calls protected `listMediaAssets` through a read-only adapter, with `limit:20`, `status:"active"` and opaque cursor. It shows accessible selected state, alt text and delivery status. An asset with `url:null` or `deliveryAvailable:false` gets an honest “Preview unavailable” panel; no URL is invented. The editor sends only `coverMediaId` to BE-12, supports change/remove, and leaves visibility/active validation to the backend. The picker does not upload files. Persistent delivery/upload configuration is still required for a complete media workflow.

## Privacy, accessibility and responsive review

Draft preview remains in the protected CMS and can include unsaved text. No draft is fetched from or sent to the public Stories API. BE-12 revision/audit writes are preserved; this task shows version/updated time only and offers no restore. Server-owned author account IDs, storage keys and raw exception messages are absent from the client editor DTO/UI.

The browser fixture checks 320, 375, 768, 1024, 1366 and 1920px widths plus 200% CSS zoom; list, create, edit, preview and media picker; keyboard picker open/Escape/focus restoration; field error announcement; plain-text preview; conflict, unpublish, schedule, archive and unsaved navigation. FE-10 browser result: 35 cases / 127 assertions, zero runtime exceptions and hydration warnings. Strict UI audit: zero findings. The fixture is fictional and development-only; live authenticated editorial writes and persistent media delivery remain unvalidated.

## Validation and dependencies

Clean `npm ci --ignore-scripts`, `npm run deps:check`, production build and standalone TypeScript passed. Integrated Node regression: 447/447, including 30 FE-10 tests. Browser regressions: FE-07 138/254, FE-08 128/386 with 16 QR decodes, FE-09 118/644. One FE-09 focus assertion failed on its first browser run and passed on immediate repeat without code changes; no scanner code was altered. `npm run lint` remains unsupported because `next lint` is not present in Next.js 16.

Remaining dependencies: persistent BE-11 media delivery/upload integration, public Stories migration to BE-12 DTOs, optional future rich text if the backend contract changes, FE-16 revision workspace/restore if ever supported, and search hardening beyond status/pagination. BE-12 migration and real trusted Neon editorial sessions need environment-level validation before operational claims.
