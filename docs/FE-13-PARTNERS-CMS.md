# FE-13 — Partner / Sponsor CMS

## Delivered development checkpoint — 2026-10-15

**DONE (source integration; external operational QA remains blocked).**

- Implementation: `26acafbd25eadd5b21a0aeccb9ebbe927b151d4f`.
- Validated source candidate / integrated main / origin-main:
  `1afef53598e2354011948e916d0f580303b80504`.
- Exact-candidate CI run `38692009490`: SUCCESS; locked installation, dependency graph,
  TypeScript, 794/794 tests (zero failures/skips) and production build passed.
- Vercel `dpl_4zAgrqyEpymt9x6yrZtoXUPGpNPg`: READY, project ussrunning-web, branch main,
  exact deployed SHA `1afef53598e2354011948e916d0f580303b80504`.
- Deployed read-only smoke: 21 cases / 75 assertions, zero runtime/hydration findings.
- Review: https://ussrunning-web-seven.vercel.app/admin?module=partners.
- Source delivery PR: https://github.com/ardidwi/ussrunning-web/pull/17.

Normal main push initially lost a race to concurrent policy/skill commits and was rejected.
All subsequent history was merged forward and exact-head CI rerun before a successful
fast-forward main push. No reset, force push or published-history rewrite. Concurrent
FE-14/public cutovers and later design-skill policy commits remain present. The scoped
recovery stash is retained. The source and linked main worktrees were clean at verification.

This record describes the verified source delivery. The following documentation-only
publishing commit has its own exact-head CI/deployment verification and final SHA recorded
in the delivery report/closure PR; it changes no application behavior. Stop after closure.

## Workspace and boundaries

Routes follow the established CMS query modules: `/admin?module=partners`,
`&view=create`, `&view=edit&id=…`, and protected `&view=preview&id=…`. No public route
or second CMS shell is introduced. The existing server-loaded permission snapshot presents
the module to `partners.manage`; BE-14 independently guards every read/write and transaction.
Restricted/session results remove the editor. No client role or account-ID authority exists.

`PartnersWorkspace` supplies bounded managed reads. `PartnerList` presents lifecycle/type
filters, server pagination, visibility, logo delivery and server-assigned global ordering.
`PartnerEditor` owns canonical metadata, lifecycle and private local preview.
`PartnerSponsorships` owns selected-event relationships; `PartnerValidityFields` shares
explicit-offset time controls. `api/actions.ts` delegates directly to BE-14 and invalidates
the CMS only after successful writes. No registration, pass, scanner or media writer changes.

## BE-14 contracts

Managed list/detail, create/update/activate/deactivate/archive; managed event sponsorship
list, attach/update/detach/reorder. Existing-record writes carry exact `expectedVersion`.
The event selector projects bounded BE-07 results to id/title/status; inaccessible event
options show retry feedback. No hardcoded production event/reference options.

Create produces a draft. Only draft/inactive canonical content is editable. Active records
must be deactivated; archived records stay immutable. Lifecycle confirmations retain errors
and only close on backend success. Slug is issued by BE-14 and read-only, unaffected by name
changes. Global sort order is displayed as server-assigned: no global reorder mutation exists
in BE-14, so no invented mutation/UI authority is offered.

## Editorial data and media

Name/description remain plain text. Type is partner/sponsor/collaborator. Tier is an optional
bounded backend token, not a fabricated business taxonomy. Website must be credential-free
HTTPS. Visibility, global inclusion and activeFrom/activeUntil are separate settings.
Validity timestamps require seconds and `Z` or an explicit offset; a UTC summary is shown.
The browser timezone never silently reinterprets a local datetime value. Backend is final.

The shared FE-10 BE-11 MediaAsset picker is reused, including pagination, keyboard selection,
null URL and unavailable delivery. Only a reference is changed/removed; media is never
deleted. No uploader or fake storage success. Activation can still reject ineligible media.
Protected preview renders current text safely and does not activate or expose public drafts.
The separately owned public Partners cutover is not bundled into this task.

## Sponsorship safety

Every relationship call includes the selected trusted event ID. Attach uses a canonical
backend-issued partner reference. Update/detach sends relationship ID and version. Detach
marks the relationship inactive and retains canonical partner/media. Placement uses the
BE-14 event_page/event_pass/sponsor_section vocabulary; choosing placement does not issue,
render, authorize or rebrand an Event Pass.

The complete active set is loaded before reordering. Up/down controls support keyboard;
the payload contains all unique active relationship IDs and each current version. Partial
pagination, duplicates, missing IDs or more than 100 relationships disable reorder. Version
and order conflicts preserve drafts/order and require explicit reload; no blind retries.
Saving one relationship preserves other unsaved tiers. Parent metadata and relationship
mutations are coordinated; lifecycle changes require saved work. Existing navigation/discard
dialogs protect unsaved canonical and relationship edits. Canonical versions are refreshed
after relationship writes because BE-14 advances the shared revision stream.

## Evidence and limitations

Focused FE tests: 24/24. Preserved integrated Node regression: 794/794, zero failures/skips.
The expanded pre-interruption browser matrix passed 42 cases / 90 assertions (superseding
the initial 39/86). Resume runs only affected sponsorship flows after the pagination fix:
11 cases / 25 assertions, including 101 active relationships and an unsaved later-page tier.
Reconciled targeted Partner/BE-14/Site Content Node checks pass 109/109. Gallery regression
passes 46/151 with runtime/hydration zero; the earlier runtime assertion did not reproduce
in the isolated resume run, and the harness now prints failure details. Existing Stories
40/137 and Events 57/121 evidence remains valid and was preserved.
The final long-text/long-URL audit passes 1 case / 5 assertions at 320px; text remains
editable and preview wraps. Production-build read-only smoke passes 21 cases / 75 assertions,
including anonymous Partners/Site Content/Stories/Gallery/Events CMS feedback, member routes,
mobile/desktop overflow and production fixture 404. Runtime/hydration findings are zero in
these final probes. Final production build and standalone TypeScript pass.
The matrix includes 320/375/768/1024/1366 widths, short height, 200% CSS zoom, reduced motion,
labels, keyboard reorder, error focus, Escape/focus restoration, lifecycle, safe preview,
backend-shaped errors, exact versions, partial-set rejection and mutation duplicate locks.
FE-13 strict UI findings: zero after form declaration fixes. The reconciled whole-repository
audit has one inherited FE-14 finding at SiteContentEditor.tsx:47 (textarea resize contract).
That file exactly matches current main and is not modified or suppressed by FE-13. The
pre-reconciliation zero-finding audit is retained separately. No dependency/lockfile changes;
main added only npm script entries, so clean install is not repeated without graph drift.

Forward reconciliation preserved current main `4d7ad0f`, including independently integrated
public cutovers, CI and FE-14. The only source conflict was adjacent CMS imports: both Site
Content and Partners imports/routes are retained. Recovery stash `61e495f` preserves the
pre-reconciliation FE-13 work. The final functional audit additionally fixed a demonstrated
later-page draft-loss edge case: post-save refresh now retrieves only previously opened
pages in bounded 100-row requests, detects repeated cursors, and keeps other unsaved tiers.

Development reference is fictional, explicitly disclosed and impossible to activate in
production. Real authenticated admin mutation QA, staging migrations/runtime grants,
independent Neon concurrency and persistent media delivery remain externally BLOCKED.
Neither a local fixture nor Vercel READY proves production readiness or human QA.

Revision metadata shown here is version/updated timestamp; the immutable BE-06 revision
workspace is read-only. Restore, bulk operations, arbitrary global reorder and persistent
upload are deferred. Existing Next 16 `next lint` limitation remains documented until the
separate approved CI hardening integration. No auth/provider, BE-11/14, barcode/pass or
scanner semantics changed. Per the latest instruction, stop after FE-13 delivery; do not
start another roadmap item or modify active parallel branches.

## Design QA review

Applied the newly registered repository design-review skill on reconciliation. Source
review covers canonical/event domain separation, shared form/feedback owners, versioned
mutations and scoped CSS. Rendered review uses the already captured hydrated 320px editor
and 1366px list, plus the recorded phone/tablet/desktop, zoom, dialog and keyboard probes;
instruction-only merges do not invalidate those application-rendering observations.

No P0/P1 visual findings were observed in those reviewed FE-13 states. USS black/red surfaces,
strong type hierarchy, rectangular actions and restrained borders match the existing CMS.
The inherited FE-14 textarea resize finding is a source-audit P2 item outside FE-13; it is
not claimed as a rendered FE-14 review. No P3 redesign churn is introduced. The functional
pagination defect was fixed and re-rendered through the 101-row browser probe. Reduced
motion and keyboard/focus checks are recorded above. These are automated/rendered fixture
checks, not human product approval or real authenticated admin QA.
