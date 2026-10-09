# FE-06 — Member Dashboard Foundation

## Architecture

`/dashboard` now consumes canonical BE-04 `getOwnMemberProfile`, through a request-local server
adapter and minimized projection. Client receives display name (profile, account, then issued member
ID), member ID, active/verified status, safe avatar and authoritative completion. No account UUID,
email, contact details, profile version or barcode is serialized into the overview. No new identity,
API, auth system, dependency or permission model. Backend guards remain authorization authority.

DashboardOverview composes identity/completion, four reusable DashboardSection slots and profile /
settings links. Registrations, history, passes and notifications explicitly report unavailable; no
records, dates, totals or zero counts are fabricated. Shared EmptyState is available for future known
empty collections, after a real service confirms them. Completion rules stay in BE-04, including its
single emergencyContact guidance key. Unknown future guidance gets safe profile-review copy.

DashboardScreen uses loading -> settled success/error. Initial data is server-rendered; explicit refresh
calls a fresh guarded server read, removes private content while checking, blocks repeated activation,
ignores late responses after unmount and replaces failure with controlled inline feedback. Pending,
suspended, deactivated, anonymous, denied, missing profile, network and server-unavailable states are
handled through existing ServiceFeedback / FE-02 account components. Loading and completion are
announced. Nothing is persisted to browser storage; no polling or fake production fallback.

MemberDashboardShell remains the responsive navigation/scroll owner, with FE-05 central permission
presentation, active links, skip link and native modal focus restoration. FE-04 MemberAvatar is extracted
without changing fallback/error behavior. The card entry links to FE-04: no barcode is duplicated,
rendered or generated here. Profile, card, events, settings and public routes stay intact. Fictional
`/design-system?surface=dashboard` fixtures are independently gated by route and component and cannot
activate outside development. They never create a session or call the production adapter.

## Files

Created:
- features/member-dashboard/model.ts; api/server.ts; api/actions.ts
- components/DashboardOverview.tsx, DashboardScreen.tsx, DashboardSection.tsx,
  DashboardLoading.tsx, DashboardReference.tsx under that feature
- features/member-dashboard/dashboard.css
- features/member-card/components/MemberAvatar.tsx
- tests/frontend-dashboard.test.mjs; scripts/verify-fe06-browser.cjs
- docs/fe-06-evidence (JSON results/regression harness); this report

Modified:
- app/dashboard/page.tsx, loading.tsx; app/design-system/page.tsx; app/layout.tsx (scoped CSS import)
- features/member-card/components/MemberCard.tsx (shared avatar only)
- scripts/verify-fe-03-browser.cjs (real canonical unavailable/anonymous boundary assertions)
- DESIGN.md, UX-CONTRACT.md, docs/ENGINEERING-ROADMAP.md

## Validation

| Check | Actual result |
| --- | --- |
| npm ci --ignore-scripts | PASS; 259 packages installed, inherited React Email deprecation notices |
| npm run deps:check | PASS before/after concurrency merge; manifest and lock unchanged |
| Production build / standalone tsc --noEmit --incremental false | PASS before/after concurrency merge |
| Combined Node/PGlite | 157/157, zero failed/skipped: 125 backend including BE-07, 32 frontend including 9 new dashboard and 4 concurrent cutover tests |
| FE-02 / FE-03 contract scripts | PASS on integrated tree |
| FE-06 browser | 43 cases / 154 assertions; zero exceptions/hydration warnings, rerun on integrated tree |
| FE-03 browser | 41/41 final integrated cases |
| Existing forms | 27 responsive, 5 interaction groups, 7 route checks |
| Existing auth | 53 responsive, 35 flow groups, 1 accessibility group, 6 public regressions |
| Existing workspace | 10/10 surfaces |
| Public shell | 80 responsive, 2 navigation groups, 1 motion group, 4 zoom cases |
| Card/CMS | 30 layout/nav plus 6 export/recovery/denial/history interactions; physical decoder unavailable |
| Strict UI audit | Zero findings |
| DESIGN.md lint | Zero errors; 4 existing orphan-token warnings |
| npm run lint | Known unsupported next lint failure under Next 16; tooling unchanged |

Widths: 320/360/375/390/430/768/1024/1366/1920px; short phone 320px height and laptop 400px height.
Long names/hints wrap, no horizontal overflow, actions remain reachable. 200% zoom, keyboard skip,
modal Escape/focus restoration, active route, permission visibility and reduced-motion skeletons tested.
Failed avatar reserves geometry and falls back to initials. Screenshots of 320/1366px, long name and
pending state were visually inspected and retained in the desktop FE-06 visualization folder outside
Git. Existing typography, square borders, spacing tokens and document scroll match DESIGN.md;
no palette/font/token drift. This is engineering browser review, not human audit or screen-reader certification.

Initial browser runs exposed test-script encoding errors and old assumptions that unconfigured auth
always means session expiry. These were corrected without changing production auth/profile code.
Public-shell harness waits for hydration/modal effects before its existing assertions; no source,
motion engine or warning suppression changed. Three inherited hydration warnings remain captured
in old auth/public audits; FE-QA root-cause task stays open. No new FE-06 hydration warning observed.

## Integration and remaining dependencies

Started from main d28ab503613fcd71c2e259d05530306d84c9b39f. Implementation ee5fc70, normal merge
61cee44 preserved current main d0ba3ab: BE-07 fb7fb11, AUTH-CUTOVER 2193a60 and ownership docs.
Later auth verification documentation a2718a3 also merged forward. Inherited non-UTF8 roadmap
punctuation normalized without rewriting policy/content. Final main SHA, deployment ID/status and
live smoke are reported after push to avoid self-referential documentation SHA churn.

FE-06 performed no Neon/auth/env/trusted-domain changes, DB migrations, real email delivery, role
grants, event schema/services/registration/pass/check-in or CMS writers. Concurrent domain/auth
work is preserved unchanged. No real verified active member/admin/super_admin dashboard session was
exercised by this FE task; fixtures prove presentation only. Deployed anonymous checks do not prove
active authenticated flows. Main's Vercel environment is early-development manual review, not a
production readiness claim. No force push/history rewrite or destructive DB operation by FE-06.

FE-07 requires BE-08 own-registration / eligibility / capacity / cancellation contract plus BE-07
projections. Passes require BE-09; notifications BE-16. Remaining: independent active role/session QA,
protected CMS writer migration, physical barcode scanning, future revision restore, existing hydration
root-cause audit and unsupported lint. Member identity remains separate from entitlement/attendance.
