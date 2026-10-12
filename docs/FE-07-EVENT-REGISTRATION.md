# FE-07 — Event Registration UI

Resumed existing work without reset or reimplementation. Starting task base was main
26e29f2; concurrent BE-09 e24222b was fast-forwarded and retained. Task branch:
feature/event-registration-ui. Final delivery SHA/deployment are verified after push.

## Architecture and routes

- `/runs`: bounded BE-07 public listing with opaque next/first-page navigation, alongside
  preserved legacy editorial sessions. Failed USS listing reads are explicit.
- `/runs/[slug]`: intentionally canonical public BE-07 event detail, with compatibility
  fallback for existing legacy sessions. Legacy sessions do not acquire invented USS identity
  or registration authority. FE-12 can retire that fallback after an approved content crosswalk.
- `/dashboard/events`: authorized BE-08 owner history and cancellation requests.
- `/dashboard`: real recent-registration preview, three records from the bounded first page;
  not a claim to enumerate all upcoming events. Pass/notification slots remain unavailable.

`features/event-registration` owns the server read/action adapters, shared presentation model,
PublicEventDetail, EventRegistration, RegistrationHistory, RegistrationList,
DashboardRegistrations and RegistrationFeedback. Button, Badge, EmptyState, Skeleton,
PageLoading, Modal, FE-02 lifecycle feedback and existing permission-aware member navigation
are reused. RegistrationReference and its adapters require development; production reference
route is not found. Fictional fixtures never become a production fallback.

## Backend contracts and state

Uses getPublicEventDetail/getPublicEventList, registerCurrentAccountForEvent({eventId}),
cancelCurrentRegistration({eventId,registrationId,expectedVersion}), and
getCurrentRegistrationHistory({limit:20,cursor?,eventId?}). DTOs are imported from BE-07/08.
No account ID, role, member barcode, pass or client capacity count supplies authority.
Versions/cursors remain opaque. Server guards recheck lifecycle, ownership and eligibility.

UI phases are idle/loading/registering/cancelling, with authoritative result/status and safe
code feedback. Supports unauthenticated, pending verification, suspended/deactivated,
permission denied, confirmed/waitlisted, existing/cancelled registration, closed/full,
unsupported event configuration, stale cancellation, unavailable and network failures.
Mutations are pessimistic and synchronously locked. Failed cancellation retains its dialog;
conflict/uncertain response requires explicit reload. Private records disappear during access
rechecks and after restricted results. Server-rendered event panel results reset on revalidation.

Capacity is configuration, not remaining slots. The backend has no read-time canCancel or
live availability projection; UI does not fabricate either. A cancellation request is only
reported successful after server acceptance. Public reads intentionally exclude private,
unpublished and members-only events; their details are not exposed using managed admin reads.
An owner can still read retained event metadata in history under BE-08's ownership contract.
Members-only event discovery/detail needs a future authorized backend read contract.

Event timestamps explicitly use the DTO IANA timezone. History dates/cancellation dates use
the same event timezone. No invented totals, offsets, waitlist promotion or event entitlement.
Successful mutation revalidates dashboard, history and public routes.

## Validation

- Clean npm ci --ignore-scripts: 259 installed/260 audited, zero reported vulnerabilities;
  inherited email-package deprecations. No manifest/lock drift.
- deps:check, production build, standalone TypeScript and git diff --check pass.
- Integrated Node regression: 235/235, zero failures/skips (219 baseline including BE-09,
  plus 16 new frontend registration contract/date tests).
- FE-07 browser: 138 cases / 254 assertions. 320/375/768/1366px, short viewport,
  emulated 200% zoom, duplicate submit, server-confirmed/waitlisted/full/closed responses,
  existing/cancelled records, pagination, cancellation conflict, reload, safe initial focus,
  Escape/focus restoration, restricted content removal and no fixture leakage.
- Targeted FE-07 probes: zero runtime exceptions and zero hydration warnings.
- Strict static UI audit: zero findings.
- Preserved regression evidence: forms 27 responsive/5 interaction checks; public shell
  80 responsive/2 navigation/1 motion/4 zoom; workspace 10; auth 53 responsive/35 flows;
  profile 41; FE-06 dashboard 43 cases/154 assertions; Card/CMS layout 30 and six available
  interaction checks. Independent barcode decoder is unavailable. FE-02/03 contract scripts pass.
- The profile browser test now waits for the App Router result heading after URL navigation;
  its protected-content/focus assertions are unchanged.
- Known lint failure: Next 16 does not support existing next lint. No tooling changes.
- Older auth/public/card reference suites captured five hydration console warnings and one
  hydration page exception while their assertions passed. FE-QA remains open; targeted FE-07
  zero-warning results do not resolve this older issue.

Browser evidence is under fe-07-evidence. Screenshots are review artifacts outside Git.
Final resumed build/tests/browser checks and exact deployment are reported after delivery.

## Live boundary and FE-08 dependencies

Real authenticated active-member registration/cancellation mutations were NOT tested.
Coverage combines isolated SQL-backed service tests, typed adapter tests, development-only
browser fixtures and anonymous live smoke. No real booking, pass, email or persistent migration
was created by FE-07. Independent active Neon session/member QA remains outstanding.

FE-08 must consume BE-09 separately, after approved migration 010/keyring deployment and
trusted active-role staging validation. It must show scoped entitlement/status/expiry and
invalidation without reusing permanent member identity. No pass/scanner/payment UI or
backend semantics were added here. CMS writers, physical scanning, broader hydration audit
and lint tooling remain separately scoped.
