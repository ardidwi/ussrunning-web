# FE-11 Gallery CMS

## Route and ownership

`/admin?module=gallery` is the managed list. `view=create`, `view=edit&id=<gallery UUID>` and `view=preview&id=<gallery UUID>` are query views inside the existing `/admin` CMS shell. The shared navigation exposes Gallery only through the central `cms.content.manage` presentation permission. The server session and BE-13 permission guards remain the write/read authority. Anonymous, inactive, forbidden and unavailable states use the existing protected CMS feedback. No new public Gallery route was added.

`features/gallery-cms/GalleryWorkspace.tsx` owns server-side bounded reads, filters and routing. `GalleryEditor.tsx` owns client interaction, dirty navigation, private preview, item/order work and lifecycle dialogs. `features/gallery-cms/api/actions.ts` delegates all protected writes to `lib/gallery/gallery-actions.ts` and revalidates `/admin`; it does not create a second Gallery service. `model.ts` owns form validation, copy and route helpers. The development-only fixture is isolated behind `/design-system?surface=gallery`; production returns 404 for that route.

## BE-13 contracts

Managed list defaults to 20 rows with opaque cursor and draft/published/archived filters. Detail loads the Gallery, first 100 active items, bounded 10 revision metadata records and the first 20 managed event references. Create starts draft. Metadata update, publish, unpublish, archive, add/update/remove item and reorder use the current server-issued `expectedVersion`; failed mutations preserve local input and require explicit reload on version/order conflict. Published collections are read-only until unpublish; archived collections stay read-only. The backend determines publishability, event/media eligibility and all transitions.

Slug is displayed read-only and remains server-owned across title edits. Gallery text, caption and alt override use the BE-13 plain-text limits; markup is never parsed as HTML. Local validation is early feedback only. Every backend error code maps to distinct human-readable feedback, including conflict, order conflict, invalid state, media, reference and publishability errors.

## Media, items, order and cover

Gallery reuses FE-10's `MediaAssetPicker` and its bounded BE-11 active-asset reads. Selection never uploads or creates media. Available thumbnails use the BE-11 resolved URL; `url:null` and `deliveryAvailable:false` show an honest placeholder. Cover selection/removal is explicit and included in metadata changes. Removing a Gallery item only removes its reference; it does not delete the MediaAsset. Caption and alt override are edited separately per item, with MediaAsset `altText` as fallback. Filenames are not used as alt text.

Initial item reading is bounded at 100. The editor can load the complete active set in bounded pages up to BE-13's 1,000-item cap. Reorder controls stay disabled while any page remains unloaded. Keyboard-operable Move up/Move down changes local order; Save image order sends every active item ID exactly once with the current Gallery version. Duplicate/missing IDs are rejected locally, and BE-13 remains final authority for exact-set validation. Version/order conflicts offer a reload, never a blind retry. A pending caption edit is preserved when another item's text is saved and blocks reorder until resolved.

The optional event selector reads the protected BE-07 managed event list in 20-row pages and can load more. If event permission or service is unavailable, the current link is preserved and no event is invented. Selection alone does not claim public event eligibility.

## Preview and history

Draft preview is rendered from the protected editor's current text/media state. It is labelled PREVIEW and remains private. The legacy public frontend does not yet expose a Gallery route, so published records still use this managed preview; no misleading public link is shown. The sidebar displays BE-13 bounded revision metadata (version, action, time) and refreshes it after confirmed writes. This is metadata, not a complete restorable snapshot; no restore UI exists.

## Validation and limits

Final reconciled validation (including BE-15): production build, standalone TypeScript and `npm run deps:check` passed. Clean `npm ci --ignore-scripts` passed without dependency/lockfile drift. Gallery focused tests passed 24/24; the complete Node suite passed 592/592. Final Gallery browser verification passed 46 cases / 151 assertions with zero runtime exceptions and zero hydration warnings. Strict UI audit returned zero findings. Existing regression runs passed Stories 40/137, Scanner 118/644, Event Pass 128/386 (16 QR decodes), and Registration 138/254 cases/assertions; subsequent changes were Gallery-only. `npm run lint` retains the known unsupported `next lint` failure under Next.js 16.

FE-11 local browser fixture exercises list/create/edit/preview at 320, 375, 768, 1024, 1366 and 1920px, 200% zoom, keyboard reorder, picker Escape/focus restoration, empty/error/lifecycle/conflict/media/item states and no horizontal overflow. Evidence is in `docs/fe-11-evidence`. Real authenticated Neon editor mutations and persistent media delivery remain staging work because BE-11/BE-13 production dependencies are not provisioned in this task. Physical mobile-device QA and human product audit remain pending. Gallery public route migration, storage upload/delivery, large-library search and full revision restore are later tasks. No BE-11/BE-13 semantics, auth provider, scanner or Stories behavior changed.
