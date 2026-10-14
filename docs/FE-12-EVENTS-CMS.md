# FE-12 Events CMS

## Routes and components

Managed list: `/admin?module=events`. Create: `view=create`; edit/detail: `view=edit&id=<event UUID>` or `view=detail&id=...`; protected preview: `view=preview&id=...`. These reuse the existing `/admin` shell, centralized `events.manage` presentation, server permission projection and dirty-navigation guard. No route migration or parallel CMS architecture.

`features/events-cms/EventWorkspace.tsx` owns bounded server reads, filters and cover resolution; `EventList.tsx` owns list presentation. `EventEditor.tsx` owns form/preview/confirmation interactions. `model.ts` owns presentation validation, timing/error copy and contract transformations. `api/actions.ts` delegates existing BE-07 actions, with path revalidation only on confirmed success. FE-01 controls/dialogs and FE-10/11 MediaAssetPicker are reused.

## BE-07 contracts and authority

Consumes `getManagedEventList` (20 rows, opaque cursor, status/eventType filters), `getManagedEventDetail`, `createManagedEvent`, `updateManagedEvent({id,expectedVersion,changes})`, and `changeEventLifecycle({id,expectedVersion,status})`. No visibility filtering or updated-time field is invented because neither exists in the managed DTO. Event type is a managed text code, not a fixed frontend taxonomy. The server authenticates and reauthorizes all operations using `events.manage`; presentation is never authorization.

BE-07 requires an explicit slug at creation, normalizes it and checks uniqueness. The create form collects it once; no title-derived slug generator is introduced. Existing slug is read-only and excluded from updates. The opaque server version is passed unchanged and never displayed as a credential. Conflict retains local edits and offers explicit reload behind discard confirmation. No blind retry.

## Lifecycle and configuration

Actions come directly from BE-07 EVENT_TRANSITIONS: draft → published/archived; published → draft/open/closed/cancelled/archived; open → closed/cancelled; closed → open/completed/cancelled; completed/cancelled → archived; archived → draft. Confirmation includes the current timing summary; terminal/destructive actions use danger controls. Failure keeps the dialog open with visible feedback. Save and lifecycle mutations share a synchronous submit lock. Unsaved edits disable lifecycle actions until saved.

BE-07 allows ordinary metadata updates across lifecycle states; the UI does not impose Stories/Gallery unpublish-before-edit restrictions that this domain does not have. Capacity is nullable positive integer configuration, never remaining slots. Waitlist is the actual backend boolean. EVENT_CAPACITY_CONFLICT is explained distinctly; no attendee records are fetched. Visibility uses public/members_only/private exactly.

## Timing and location

Shared Input/Field owns typed absolute timestamps with seconds and mandatory Z or explicit offset. Example: `2026-11-08T06:00:00+07:00`. The IANA timezone is a separate display setting; changing it never reinterprets stored instants. Start/end and registration open/close are summarized with an explicit timezone using Intl. Ordering compares absolute instants; optional dates remain null. Invalid calendar dates, timezone, ordering, capacity and HTTPS map URL receive immediate field feedback. Backend remains final validator. This intentionally avoids ambiguous browser-local datetime parsing and silent DST resolution. A future richer date picker must preserve this explicit-offset contract.

Venue name, location text and HTTPS map link use existing fields. No maps provider, city schema or check-in-window fields were invented. BE-07 DTO lacks editable check-in windows; this remains a backend contract extension, separate from FE-09 scan authority.

## Media, preview and operational boundaries

Existing coverMediaId resolves through BE-11 getMediaAsset. The bounded shared picker selects existing assets only; no uploader/storage adapter. Unavailable cover metadata or deliveryAvailable=false/url:null leaves a visible placeholder and retains the reference. Cover change/remove only updates the reference through BE-07.

Draft/private preview renders current plain-text paragraphs and media inside protected client state. HTML/scripts are never interpreted. Public link `/runs/[slug]` appears only for backend public visibility and public lifecycle states; it remains canonical/legacy-compatible routing. No draft public API, registration form or fabricated eligibility. The scanner link uses existing `/dashboard/check-in/[eventId]`, which independently validates staff/event context. Owner registration/pass surfaces remain in MY USS; there is no staff-wide registration listing contract to link speculatively.

## Error, accessibility and limits

Uses actual codes: EVENT_NOT_FOUND, EVENT_VALIDATION_ERROR, EVENT_SLUG_CONFLICT, EVENT_CONFLICT, EVENT_INVALID_TRANSITION, EVENT_MEDIA_NOT_FOUND, EVENT_CAPACITY_CONFLICT, EVENT_UNAVAILABLE and existing auth/permission failures. No raw exception/SQL content or internal actor identity is shown. Shared labels/error associations, focus rings, modal focus trap/Escape/restoration, keyboard submission, status announcements and reduced motion are retained. Loading uses the existing admin loading boundary plus submit feedback.

Development fixtures are isolated at `/design-system?surface=events`, guarded out of production; no fake production authority/data fallback. Persistent media delivery, real authenticated Neon staff writes, approved staging migrations/grants and independent Neon concurrency remain pending. Public route cleanup, richer event relationships, check-in-window configuration, per-event persisted QR branding and full revision workspace remain separate. No registration/pass/check-in semantics, auth configuration, Stories/Gallery or payment changes.

## Validation evidence — 2026-10-14

FE-12 focused Node tests: 31/31. Full integrated suite after preserving BE-16: 675/675, zero failed/skipped. Events browser: 57 cases / 121 assertions, zero runtime exceptions/hydration warnings. List/create/editor/preview validated at 320, 375, 768, 1024, 1366 and 1920px; short height/200% CSS zoom, 44px editing targets, keyboard modal focus/Escape/restoration, dirty guard, explicit-offset summary, each lifecycle transition, conflict reload, null/deliverable cover changes and duplicate-create lock covered. Narrow editor and desktop list screenshots were visually inspected. Strict UI audit: zero findings.

Regression reruns: Gallery 46 cases / 151 assertions; Stories 40/137; Scanner 118/644 with three QR decodes; Event Pass 128/386 with 16 QR decodes; Registration 138/254. All final runs reported zero runtime/hydration errors. Host sleep interrupted the first parallel member-flow probes; their complete post-resume sequential reruns passed. An initial Playwright screenshot caret mutation triggered a hydration warning; the corrected capture preserves the caret, and final probes show none. Clean npm ci --ignore-scripts (zero reported vulnerabilities), dependency graph, production build and standalone TypeScript passed without manifest/lockfile changes. Known npm run lint failure is unchanged: Next.js 16 does not support next lint.

Real authenticated admin mutations and physical-device/human product QA were not performed; local interactions use isolated development fixtures plus backend integration tests. Vercel main is a development review environment, not production-readiness proof. Exact task/main SHA and READY deployment are verified at delivery; roadmap DONE is gated on that verification.

Implementation `04ca13d2d0546fc91357151782f9baed5343089a` was fast-forwarded into main after preserving BE-16 implementation/delivery `24b7db1` / `113dc4d`. Vercel `dpl_6KoW516sM4geyR6GnNcpqqjw81Zu` reached READY for that exact main SHA. Deployed anonymous smoke passed 17 cases / 59 assertions at 320, 375, 768 and 1366px, with zero runtime/hydration errors and the production fixture 404 guard. Review URL: https://ussrunning-web-seven.vercel.app/admin?module=events. The final documentation deployment is verified separately after push.
