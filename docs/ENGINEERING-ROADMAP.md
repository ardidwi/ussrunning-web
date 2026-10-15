# USS Running Engineering Roadmap

## A. Purpose

This living document records product sequence, backend/frontend contracts, dependencies, status, evidence and integration checkpoints. Read root [AGENTS.md](../AGENTS.md), then this roadmap, then the task-specific prompt. AGENTS.md owns permanent engineering behavior; this document owns product planning. Do not duplicate the global rules. Always inspect actual Git state and contracts rather than blindly trusting roadmap metadata.

USS Running comprises a public website, free membership, authentication, account identity, member profiles, permanent member IDs and barcodes, CMS, Stories, media/gallery, events, registration, event passes, barcode/QR scanning, check-in, partners/sponsors, notifications, admin operations, RBAC, audit/revision history, dynamic site content, and staging/production infrastructure. Planned scope is not evidence of implementation.

### Critical integration cutovers / resume checkpoints

| Task | Status | Source commit | Verified main = origin/main | Deployment | Tests / blockers / next |
| --- | --- | --- | --- | --- | --- |
| INT-01 Auth frontend cutover | DONE (source integration) | `b3e74d3` | `b3e74d3c3f0367c9af380da820dd43ab5d81b1e7` | `dpl_KAX2bMrkdAFrQXMDCHd6YK9vA2pA`, READY, same SHA | 758/758 Node; 28 focused; browser 38/66; live read-only 18/54; zero final runtime/hydration findings. Real provider/email/crosswalk/Neon QA BLOCKED externally. Next INT-02. |
| INT-02 Profile frontend cutover | DONE (source integration) | `ec8db2f6975efc82609e4e338d41868720c996e3` | `ec8db2f6975efc82609e4e338d41868720c996e3` | `dpl_Eoo8rUxjbpsxrdjmfPstN6JtDXjo`, READY, same SHA | 770/770 Node; 16 focused; browser 22/53; profile regression 17 cases; dashboard 43/154; build/TypeScript/clean install/deps PASS; strict UI audit zero. Live authenticated profile saves, staging/grants/provider and independent Neon concurrency BLOCKED externally. Next FE-13. |

2026-10-15 resume closure: fetched main; the integrated INT-02 source remains the exact
main/origin checkpoint above. Verified Vercel project, branch, READY state, SHA and review
alias https://ussrunning-web-seven.vercel.app. No implementation or local validation was
restarted. BE-04 completion stays backend-owned guidance; no client lifecycle transition.
See PROFILE-FRONTEND-CUTOVER.md and V1-CHECKPOINTS.json. Documentation-only closure commits
are verified separately; they do not replace or erase the source deployment evidence.

2026-10-14: **READY_FOR_EMAIL_CONFIGURATION** after INT-01 source build/tests and exact
main development deployment. Existing BE-04 profile read/update integration is non-blocking
for this auth test; completion does not change account lifecycle. No production secrets or
email sends are authorized by this checkpoint. Manual environment names/origin/sender gates
are documented in AUTH-FRONTEND-CUTOVER.md; live readiness remains BLOCKED until controlled
provider/session/email and staging QA. This table records the validated source deployment;
documentation-only checkpoint commits are inspected/verified separately before the next task.

Resume: fetch current origin/main, inspect actual ancestry and task docs; do not reset to
checkpoint SHAs. Public Stories, Partners, footer and homepage remote branches remain
independently owned, unmerged and unvalidated here. Do not bundle or delete them.

### Domain boundaries

- Account identity != authentication: USS account identity/lifecycle is separate from provider credentials/session.
- Member barcode != event pass: permanent member identity is not event entitlement.
- Event registration != attendance: booking and check-in have separate lifecycles.
- Role != permission: roles group capabilities; services enforce permissions and ownership.
- Frontend permission visibility != backend authorization: hidden controls cannot secure operations.
- CMS content != application configuration: editorial publication differs from runtime/environment policy.
- Media metadata != media binary: database references/ownership differ from object storage.

### Repository lifecycle and delivery policy

| Phase | State | Delivery controls |
| --- | --- | --- |
| PHASE 1 — EARLY DEVELOPMENT | CURRENT | Auto-integrate validated main: allowed. Auto-push main: allowed. Vercel deployment after main: allowed. Manual product audit: expected. |
| PHASE 2 — INTERNAL ALPHA | FUTURE | Reassess real users/data/operational reliance; establish stricter preview/staging/review gates before entry. |
| PHASE 3 — CLOSED BETA | FUTURE | Controlled real-user releases through feature -> preview/staging -> review -> main -> production. |
| PHASE 4 — PRODUCTION | FUTURE | Explicit release review, monitoring, migration/rollback and protected-environment controls. |

USS Running is currently in **EARLY DEVELOPMENT FAST-FEEDBACK MODE**. As declared for this phase, there are no real production users or critical live business transactions. Priorities: rapid iteration, manual product review, continuous UI/UX feedback, early discovery of missing behavior and reduced backend/frontend integration lag. Security, data integrity, scalable architecture and relevant production-like discipline still apply.

`main = latest known-good integrated development version`. Its Vercel deployment is the **live development review environment**, even if Vercel calls the Git target production. This temporary designation does not weaken data safety or claim production readiness.

Delivery: `implement -> test/regression -> review diff -> commit -> push task branch -> integrate current main -> push main -> verify Vercel state/SHA/core pages -> manual product audit -> next iteration`. Feature branches remain preferred for meaningful/risky work; small low-risk changes may start directly on clean current main under AGENTS.md. Normal validated integration needs no separate merge approval. Do not leave completed work isolated indefinitely, force push or rewrite published history. Repair forward; severe blocking integrations that cannot be repaired immediately use normal revert commits.

Agents verify deployment startup, successful completion, exact SHA and relevant core-page/runtime behavior, then provide the URL/limitations for manual audit. Human product audit is expected, never fabricated as completed by automated checks. Blocked verification must be reported explicitly. Persistent database/storage operations remain separately scoped and tested under AGENTS.md; this phase grants no destructive data authority.

### Exit criteria for early development

Reconsider this mode immediately when any becomes true:

- Real members begin using the product.
- Real event registrations are accepted.
- Attendance/check-in becomes operational.
- Production emails are sent to users.
- Real personal data is stored.
- Production payments or money flows are introduced.
- Sponsors/partners rely on the application.
- Uptime becomes operationally important.

Before later phases, explicitly revise rules toward `feature -> preview/staging -> review -> main -> production` with stricter release controls. Phase 1 authorization does not apply forever.

## B. Status legend

| Status | Meaning |
| --- | --- |
| DONE | Committed implementation is included and applicable integrated regression passed, within stated validation boundaries. |
| INTEGRATION_PENDING | Committed task exists; combined baseline has not yet passed required validation. |
| IN_PROGRESS | Active scoped work; not complete. |
| PLANNED | Future work; no implementation claim. NEXT indicates recommended sequence. |
| BLOCKED | Concrete missing prerequisite prevents safe progress; name it. |
| DEFERRED | Deliberately postponed scope; record reason and re-entry condition. |

Integration uses PENDING or VERIFIED independently. VERIFIED never means live provider or production readiness.

## C. Current baseline

Discovery date: 2026-10-09 (Asia/Jakarta).

| Item | Evidence |
| --- | --- |
| Repository root | `C:\Users\ardid\Documents\ussrunning-web` |
| Starting main and origin/main | Both `8eb9e394c2c6b7aa60221232d3f64b02394e7c84`; remote main independently checked. |
| Original worktree | `feature/member-card-rbac-frontend`, starting HEAD `a91f910baf6d1b11e045a8fc69cf420287a9651b`; dirty unrelated work excluded. |
| Main foundation/policy integration | `f4c6fcb2fcb32c5d3c6f916bd7d8cd4b3168b0a9` integrates all completed foundation rows below plus policy task `b00142baf5b59ea31a1b49c87d867bf46cf4857b`; main tree exactly matched the tested task tree. |
| Verified integration baseline | `integration/pre-fe04-baseline` / `ffccaa0a75edce41595d8a8d376659d655b8de3f` — VERIFIED local integration with the documented lint/hydration/provider limits. |
| Isolated checkout | `C:\Users\ardid\Documents\ussrunning-web-pre-fe04-baseline`; only committed foundation sources. |
| Root instructions | Historical foundation instruction commit `a91f910baf6d1b11e045a8fc69cf420287a9651b`; current early-development policy commit `b00142baf5b59ea31a1b49c87d867bf46cf4857b`, preserving unrelated rule bodies. |
| Existing consolidation | `1670bae` has FE-03 `e80d3f2` as first parent and BE-06 `fc1c097` as second parent. |
| Dependency policy | [AUTH-DEPENDENCY-BASELINE.md](AUTH-DEPENDENCY-BASELINE.md), preserved from approved repair history. |
| Backend contracts | [DATABASE-FOUNDATION.md](DATABASE-FOUNDATION.md), [AUTH-ACCOUNT-LIFECYCLE.md](AUTH-ACCOUNT-LIFECYCLE.md), [EMAIL-VERIFICATION.md](EMAIL-VERIFICATION.md), [MEMBER-PROFILE-SERVICE.md](MEMBER-PROFILE-SERVICE.md), [MEMBER-CARD-SERVICE.md](MEMBER-CARD-SERVICE.md), [RBAC-AUDIT-FOUNDATION.md](RBAC-AUDIT-FOUNDATION.md). |
| Frontend contracts | [FE-01-REPORT.md](FE-01-REPORT.md), [FE-02-AUTH-FRONTEND.md](FE-02-AUTH-FRONTEND.md), [FE-03-MEMBER-FRONTEND.md](FE-03-MEMBER-FRONTEND.md). |

Known open engineering limitations: live Neon provider authentication is not fully validated; hydration-warning root cause remains open; Next 16 next lint tooling remains unsupported. These limits survive this policy change and must not be reported as resolved.

### Git dependency map

```text
main + inherited RSVP history -> BE-01 0aaacbe -> BE-02 1827780 -> BE-03 f7dd0a4
  -> BE-04 2077e17 -> BE-05 fd0d955 -> BE-06 fc1c097
main -> FE-01 a17ed0f -> FE-02 83d1859 -> FE-03 e80d3f2
FE-03 + BE-06 -> merge 1670bae -> AGENTS a91f910
Each approved Option A repair is a side child of its corresponding implementation.
a91f910 + all five approved repairs -> integration/pre-fe04-baseline
```

BE-01 includes earlier RSVP history through merge `9662cea`; inherited legacy event functionality does not complete planned BE-07. No new event feature is included here. The original checkout changed concurrently and the nested integration checkout was externally removed; the preserved integration commits were recovered into the sibling checkout. No external FE-04/05 commits entered this integration branch.

### Option A dependency baseline

| Package | Approved resolution |
| --- | --- |
| next | 16.3.8 |
| react / react-dom | 19.2.6 |
| @neondatabase/auth | 0.5.0-beta |
| @neondatabase/serverless | 1.2.0 |
| @neondatabase/auth-ui | 0.3.0-beta |
| better-auth / @better-auth/core / @better-auth/passkey | 1.6.23 |
| better-call | 1.3.7 |
| @better-fetch/fetch | 1.3.1 |
| @daveyplate/better-auth-ui | 3.3.15 |
| @better-auth/api-key | absent |

Preserve approved overrides, BE-03 resend 6.13.0, server-only, and PGlite test dependencies. Regenerate a lockfile only from the combined manifest using the documented deterministic process. No force/legacy-peer-deps bypass is permitted. Future graph upgrades belong to DEP, not incidental feature scope.

### Completion and cutover boundaries

Historical FE-03 began with provisional adapters. The current production own-profile loader/save delegate to BE-04; INT-02 validates the projection, consent/optional-field presentation and conflict recovery. PROFILE_UNAVAILABLE now represents a real controlled service/data failure. Development references remain isolated; live authenticated profile QA is a separate external gate. See PROFILE-FRONTEND-CUTOVER.md.

Historical FE-02 supplied flow UI before all production adapters existed. INT-01 now wires those flows through BE-02/03 and the installed provider contract. AUTH_UNAVAILABLE remains honest unavailable/provider feedback; fixture outcomes are not live provider authentication evidence. See AUTH-FRONTEND-CUTOVER.md and the critical-cutover checkpoint above.

BE-06 supplies permission guards and bounded read-only history. CMS writes/publish/restore, role mutations, and legacy CMS authorization cutover remain future work. Permanent identity crosswalk, deployment grants, real independent Neon sessions/provider cookies and query plans at scale remain staging gates.

Domain/auth suites use PGlite and mocked provider/email boundaries. Local runtime initialization, real Neon provider authentication and production authentication are separate evidence categories. No production traffic/migration/deployment is required for this checkpoint. Development reference hydration warnings require root cause audit rather than suppression.

### FE-04 / FE-05 development delivery

The FE branch actual head is `8961f0d`; its first-parent sequence is `3f7df20 -> 4d3f410 -> b427fae -> 8961f0d` after common ancestor `a91f910`. It did not include the verified Option A repair baseline `ffccaa0`. Delivery preserves both through normal merge `6cd80d2`, then includes policy `b00142b`, main integration `f4c6fcb` and its documentation checkpoint `05a8d3c`. No policy rewrite or dependency drift. Main was `8eb9e39` at discovery and advanced concurrently; newer main history was preserved.

See [FE-04-05-MAIN-INTEGRATION.md](FE-04-05-MAIN-INTEGRATION.md) for fresh candidate validation and final delivery evidence. FE-05 is DONE only as a presentation/read-only foundation: protected CMS writers are not integrated, permission visibility never replaces server authorization, real authenticated Neon roles/sessions remain unvalidated, and revision preview is partial and non-restorable. Full operational CMS remains planned under its domain tasks.

Deployed development checkpoint: Vercel ussrunning-web / main at `6e3e8ca` reached READY. Twenty deployed mobile/desktop page cases passed, reference route remained 404 and fresh probes captured zero page exceptions/hydration warnings. Protected Member Card and CMS responses report `AUTH_NOT_CONFIGURED` and show controlled unavailable feedback. Configure trusted Neon Auth through the existing environment contract and secure configuration workflow before real authenticated role/member-card validation; no credential/environment change was made in this delivery. This is an explicit integration gap, not live authenticated feature evidence.

Next dependencies: connect FE-02 auth adapters to BE-02/03, connect FE-03/FE-06 profile adapters to BE-04, then validate independent real roles/status revocation and device scanning. CMS editors require BE-11/12/13/14/15 protected writers and legacy crosswalk review; users/roles mutations require BE-17/18. FE-QA hydration root-cause and unsupported lint tooling remain explicit separate tasks. Human manual product audit of the current main Vercel environment remains pending.

## D. Backend roadmap

Numbering is a planning baseline, may continue beyond BE-22, and can be combined/reordered with evidence. Planned branch/commit values are TBD.

| ID | Scope | Status | Depends On | Branch / Final Commit | Contract / Notes |
| --- | --- | --- | --- | --- | --- |
| BE-01 | Database Foundation | DONE | main + inherited RSVP history | feature/db-foundation / `9dfbbf1b623a2e15305e5ad6283ff0bd4bc48379` | Parent `0aaacbeafd3475131d50af1261c97bf730963016`; DB tests; DATABASE-FOUNDATION, BE-01-VALIDATION. |
| BE-02 | Auth & Account Provisioning | DONE | BE-01 | feature/auth-account-provisioning / `e799fdde35f9519d5327488a5821b102933e29a2` | Parent `1827780a4d658e97ad68d4a4a0312b3ebc73bba9`; auth/DB tests; AUTH-ACCOUNT-LIFECYCLE, BE-02-VALIDATION. |
| BE-03 | Email Verification | DONE | BE-02 | feature/email-verification / `5b9ea388fdb55696121eaba493c99195fe15138c` | Parent `f7dd0a4796eda94ac818dd6a6da2098d4e42c0c0`; email/auth/DB tests; EMAIL-VERIFICATION, BE-03-VALIDATION. |
| BE-04 | Profile / Account Lifecycle | DONE | BE-02 + BE-03 | feature/member-profile-service / `2077e177a8364ba2e5ebb9a34ab4c019c1193965` | Parent `f7dd0a4796eda94ac818dd6a6da2098d4e42c0c0`; profile tests; MEMBER-PROFILE-SERVICE, BE-04-VALIDATION. |
| BE-05 | Member Card Service | DONE | BE-04 | feature/member-card-rbac-foundation / `fd0d955a56dc00fc1a13fca391a681eeba689192` | Parent `2077e177a8364ba2e5ebb9a34ab4c019c1193965`; separate BE-05 commit on shared branch; card tests; MEMBER-CARD-SERVICE. |
| BE-06 | RBAC / Audit / Revision Foundation | DONE | BE-01 + BE-02 + BE-05 | feature/member-card-rbac-foundation / `fc1c097d3574154a120b0c76d3bc4aa8094e4e46` | Parent `fd0d955a56dc00fc1a13fca391a681eeba689192`; RBAC/history tests; RBAC-AUDIT-FOUNDATION, BE-05-BE-06-VALIDATION. |
| BE-07 | Event Domain Foundation | DONE | BE-01 + BE-06 | feature/event-domain-foundation | Guarded event service/repository/actions, public projections, explicit lifecycle, optimistic updates and atomic revision/audit; 19 event tests + 125 regressions. EVENT-DOMAIN-FOUNDATION, BE-07-VALIDATION. Legacy public events unchanged; registration/pass/check-in remain BE-08–10. |
| BE-08 | Event Registration Service | DONE | BE-07 + BE-02 | feature/event-registration-service | Own/managed typed registration contracts, event-locked capacity/waitlist, cancellation/reapply, bounded history and atomic minimized audit. EVENT-REGISTRATION-SERVICE, BE-08-VALIDATION; real Neon concurrency and FE cutover pending; no passes/check-in. |
| BE-09 | Event Pass / Ticket Service | DONE | BE-07 + BE-08 | feature/event-pass-service | Owner/managed issuance and read, hash-only opaque v1, idempotency, scoped resolution, atomic invalidation/audit; migration 010. EVENT-PASS-SERVICE, BE-09-VALIDATION. Persistent migration/keyring and real Neon concurrency pending; reissue/scanner excluded. |
| BE-10 | Check-In / Scanner Service | DONE | BE-08 + BE-09 + BE-06 | feature/event-check-in-service / 3be4613 | Atomic event-scoped BE-09 resolver + attendance + audit; 35/35 scanner, 270/270 integrated regression. Migration 011 local validation only; independent Neon/device staging pending. See CHECK-IN-SERVICE.md and BE-10-VALIDATION.md. |
| BE-11 | Media Storage Service | DONE | BE-01 + BE-06 | feature/media-storage-foundation | Typed media foundation, migration 012, raster validation and retention; [evidence](BE-11-VALIDATION.md). Persistent storage adapter/configuration pending. |
| BE-12 | Stories / Editorial Service | DONE | BE-06 + BE-11 | feature/stories-editorial-service / 1771a33 | Guarded editorial lifecycle, scheduling, media references, atomic revision/audit; see BE-12-VALIDATION.md. |
| BE-13 | Gallery Service | DONE | BE-11 + BE-06 | feature/gallery-service / 975be4a | Guarded bounded collections, publication, atomic item ordering/history; see BE-13-VALIDATION.md. |
| BE-14 | Partner / Sponsor Service | DONE | BE-06 + BE-11 | 71b94e6 | Guarded canonical Partner + event sponsorship, atomic history, MediaAsset references; staging limitations documented. |
| BE-15 | Dynamic Site Content Service | DONE | BE-06 + BE-11 | `06b1a91` | Ten typed slots; atomic drafts/revisions/public snapshots, validated references and safe fallbacks. See DYNAMIC-SITE-CONTENT.md and BE-15-VALIDATION.md. |
| BE-16 | Notification Service | DONE | BE-03 + relevant domain events | 24b7db1 | Durable operational intents, typed templates, idempotent claims and bounded explicit retry; staging delivery/worker pending. |
| BE-17 | Admin User Management | DONE | BE-02 + BE-04 + BE-06 | 2801930 | Super-admin-only managed reads/lifecycle, protected owner paths, optimistic concurrency and atomic audit; staging/session limits documented. |
| BE-18 | Role & Permission Administration | PLANNED | BE-06 + BE-17 | TBD | Elevated-role ownership/bootstrap/revocation, narrow grants. |
| BE-19 | Search / Filter / Pagination Hardening | PLANNED | Implemented collection domains | TBD | Bounded APIs and measured query plans/indexes. |
| BE-20 | Security / Rate Limiting Hardening | PLANNED | SEC + mutation services | TBD | Threat/authorization/abuse review. |
| BE-21 | Observability / Operational Logging | PLANNED | OBS + lifecycle services | TBD | Safe structured logs, trace IDs, operational diagnostics. |
| BE-22 | Staging / Production Readiness | PLANNED | BE-19–21 + OPS + CI | TBD | Provider/cutover/migration/rollback rehearsal and reviewed release gates. |

## E. Frontend roadmap

Numbering may continue beyond FE-20. Final approved dependency repair heads and their implementation parents are both recorded.

| ID | Scope | Status | Depends On | Branch / Final Commit | Contract / Notes |
| --- | --- | --- | --- | --- | --- |
| FE-01 | Form System | DONE | Existing design/public shell | feature/frontend-form-system / `a40db36f4a03f3c54303306bd133d51d85992e35` | Parent `a17ed0f908a99bdedbbc2735de5d2a6dfe19370c`; form/public/motion/workspace audits; FE-01-REPORT. |
| FE-02 | Authentication Flows | DONE | FE-01 + BE-02 + BE-03 | feature/frontend-auth-flows / `f7038c3c57530056cb17286b60e2f955ea07a0ef` | Parent `83d1859106a64a999cfa913ddb5c89166a5156e6`; contract/auth-flow/visual audits; FE-02-AUTH-FRONTEND. |
| FE-03 | Member Dashboard Shell / Profile Onboarding Foundation | DONE | FE-01 + FE-02; BE-04 for production cutover | feature/member-dashboard-shell / `e80d3f2639f54d95e4f6466dbdda5a2ed6dc393b` | Parent `83d1859106a64a999cfa913ddb5c89166a5156e6`; contract/layout/outcome/visual audits; FE-03-MEMBER-FRONTEND. Provisional adapter remains. |
| FE-04 | Member Card | DONE | BE-05 + BE-04 + FE-03 | feature/member-card-rbac-frontend / `b427fae8772d6c3e42065dc2ada3106837faff9b`; final feature head `8961f0d` | Canonical owner-only BE-05 DTO, responsive card, backend-issued barcode v1 and identical SVG export. Real authenticated Neon/device scan validation remains outstanding. |
| FE-05 | RBAC-Aware CMS Foundation | DONE | BE-06 + FE-01 + FE-02 | feature/member-card-rbac-frontend / `8961f0d187806adcde2e5a3aabd76b9771f181c3` | Central trusted permission presentation, guarded navigation, bounded audit and partial non-restorable revision previews. Protected CMS writers are not integrated; frontend visibility is not server authorization. Real Neon role/session validation outstanding. Full operational CMS is not complete. |
| FE-06 | Member Dashboard | DONE | FE-03 + BE-04 + FE-04/05; BE-08/09/16 for future activity | feature/member-dashboard-foundation / `ee5fc70` | Canonical owner profile projection, modular overview, shared avatar/card entry, backend completion, lifecycle/loading/retry and centralized permission navigation. Registrations/history/passes/notifications explicitly unavailable; real active-role QA pending. See FE-06-MEMBER-DASHBOARD.md. |
| FE-07 | Event Registration UI | DONE | BE-07 + BE-08 + FE-06 | feature/event-registration-ui | Public event detail, backend-owned booking/cancellation, bounded own history and dashboard preview. FE-07-EVENT-REGISTRATION.md records validation and live active-member limits. |
| FE-08 | Event Pass UI | DONE | BE-09 + FE-07 | FE-08-EVENT-PASS.md; feature/event-pass-ui | Owner-only read/explicit issuance, branded QR, guarded dashboard/history entries; live active-owner/device QA remains outstanding. |
| FE-09 | Scanner / Check-In Workspace | DONE | BE-10 + FE-05 | feature/scanner-check-in-ui | Event-scoped staff scanner, native/worker QR decoding, manual fallback and authoritative result states. See FE-09-SCANNER.md. Live staff/Neon/device QA remains pending. |
| FE-10 | Stories CMS | DONE | BE-12 + FE-05 + BE-11 | feature/stories-cms / `157d0e0` | Protected managed list/editor, plain-text preview, MediaAsset picker, versioned lifecycle and explicit Jakarta scheduling. See FE-10-STORIES-CMS.md. Public Stories migration, persistent media delivery and full revision workspace remain separate. |
| FE-11 | Gallery CMS | DONE | BE-11 + BE-13 + FE-05 | feature/gallery-cms / `2212553` | Protected managed collections, versioned metadata/items/lifecycle, exact-set keyboard reorder and BE-11 picker. Persistent upload/delivery and public Gallery migration remain separate. See FE-11-GALLERY-CMS.md. |
| FE-12 | Events CMS | DONE | BE-07 + FE-05 | feature/events-cms / `04ca13d` | Protected event metadata/configuration, versioned lifecycle, explicit-offset timing, private preview and BE-11 cover picker. Registration/pass/check-in operations remain separate. See FE-12-EVENTS-CMS.md. |
| FE-13 | Partner / Sponsor CMS | IN_PROGRESS (local validation complete; CI/deployment pending) | BE-14 + FE-05 | feature/partners-cms | BE-14 canonical/editor and event-scoped sponsorship workspace; see FE-13-PARTNERS-CMS.md. Preserves concurrent FE-14/public cutovers. |
| FE-14 | Dynamic Site Content Editor | PLANNED | BE-15 + FE-05 | TBD | Draft/preview/publish; no runtime secrets/configuration in editorial UI. |
| FE-15 | Users / Roles Administration UI | PLANNED | BE-17 + BE-18 + FE-05 | TBD | Narrow permissions and audited operations. |
| FE-16 | Audit / Revision Workspace | PLANNED | BE-06 + domain history schemas + FE-05 | TBD | Read-only bounded safe preview foundation already delivered by FE-05; broader domain-history workflows remain planned; restore requires future authorized write contract. |
| FE-17 | Member Registration History | PLANNED | BE-08 + BE-10 + FE-06 | TBD | Registration and attendance remain distinct. |
| FE-18 | Responsive CMS Hardening | PLANNED | Implemented CMS | TBD | Mobile tables/cards/dialogs/touch/overflow. |
| FE-19 | Accessibility Hardening | PLANNED | A11Y + implemented UI | TBD | Keyboard/screen-reader/contrast/error feedback. |
| FE-20 | Visual Regression / Production QA | PLANNED | QA + FE-18/19 + OPS | TBD | Staging/browser/device/release matrix; not an endpoint. |

## F. Cross-cutting engineering roadmap

| Track | Scope | Status | Dependencies / Exit evidence |
| --- | --- | --- | --- |
| SEC | Security hardening | PLANNED | Ownership/authorization/abuse limits; safe staging role tests. |
| QA | Test infrastructure / visual regression | PLANNED | Preserve Node/PGlite/browser suites; reproducible CI gates. |
| FE-QA | Hydration Warning Root Cause Audit | PLANNED | Capture reference-page reproduction/source; separate repair, never suppression. |
| OBS | Observability | PLANNED | Safe structured logs, immutable admin history, operational alerts. |
| PERF | Performance | PLANNED | Measure query/media/browser behavior; avoid N+1/unbounded reads. |
| A11Y | Accessibility | PLANNED | Keyboard/screen-reader/semantic forms/dialogs/navigation review. |
| DX | Developer experience | PLANNED | Dedicated repair for unsupported Next 16 next lint; portable audit runtime/ports. |
| DEP | Dependency maintenance | DONE | Option A combined graph; explicitly reviewed auth-family upgrades. |
| CI | CI/CD | PLANNED | Install/graph/build/types/domain/browser gates before release. |
| OPS | Deployment / staging / production | PLANNED | Safe staging provider, least-privilege grants, legacy crosswalk, migration/rollback rehearsal. |
| DOC | Architecture documentation | DONE | Roadmap/evidence and task-contract updates. |

### OPS-OWNERSHIP-MIGRATION — dedicated USS ownership

Status **IN_PROGRESS (audit/plan only)**. See [USS-OWNERSHIP-MIGRATION-PLAN.md](USS-OWNERSHIP-MIGRATION-PLAN.md) for actual ownership/IDs, evidence gaps, backups, risk/rollback matrices, phased gates and cutover acceptance. No migration executed. Audit baseline main fb7fb116c7899a2ac663067dec6e151ee1b52217; refresh before execution.

| Sub-track | Execution status | Dependency / limit |
| --- | --- | --- |
| GitHub | BLOCKED | Target org/name/incoming permission/App grants; transfer existing ardidwi/ussrunning-web, preserve history |
| Vercel | BLOCKED | USS team access/source Owner; existing project transfer preferred; unchanged-Neon bridge must be verified first |
| Resend | BLOCKED | Team/sender/key-name inventory, DNS ownership and connected BE-03 flow; separate from Neon shared OTP mail |
| Neon | BLOCKED | Phases 1–3 DONE + VERIFIED + ROLLBACK_READY; managed transfer/Auth continuity and tested backup recovery; highest risk |
| Auth Cutover | BLOCKED | Trusted live session/crosswalk/roles/card/CMS acceptance and non-login/profile adapters |
| DNS | BLOCKED | Authoritative zone/owner export and approved sender/web/origin mapping; no DNS writes in audit |
| Decommission | NOT_STARTED | Full cutover + rollback window + explicit scoped cleanup approval |

Order: inventory/backup -> GitHub -> Vercel -> Resend -> Neon -> Auth verification -> full cutover -> rollback window -> decommission. Each predecessor requires independent DONE, VERIFIED and ROLLBACK_READY evidence. Plan/metadata success do not complete migration. Native integration/resource transfer is separate from project transfer; never implicitly move Neon in Vercel phase. Preserve BE/FE statuses, permanent identity, server authorization and audit history. No product feature implemented.

## G. Dependency matrix

| Frontend | Backend dependency |
| --- | --- |
| FE-02 | BE-02 + BE-03 |
| FE-03 / FE-06 | BE-04 + BE-02/03 for trusted production adapter |
| FE-04 | BE-05 (built on BE-04) |
| FE-05 | BE-06 |
| FE-07 | BE-07 + BE-08 |
| FE-08 | BE-09 |
| FE-09 | BE-10 |
| FE-10 | BE-12 |
| FE-11 | BE-11 + BE-13 |
| FE-12 | BE-07 |
| FE-13 | BE-14 |
| FE-14 | BE-15 |
| FE-15 | BE-17 + BE-18 |
| FE-16 | BE-06 + domain-specific contracts where needed |
| FE-17 | BE-08 + BE-10 |

Frontend must consume actual actions/DTOs/policies, never invent backend contracts from roadmap labels. A merge does not automatically replace provisional adapters or legacy behavior.

## H. Integration checkpoints

| Checkpoint | Scope | State / Gate |
| --- | --- | --- |
| Pre-FE04 | BE-01–06, FE-01–03, AGENTS, roadmap, five Option A repairs | integration/pre-fe04-baseline = VERIFIED; see PRE-FE04-INTEGRATION-VALIDATION.md and fresh pre-fe04-evidence. |
| Foundation | BE-01–06 + FE-01–05 | VERIFIED local integrated development candidate; see FE-04-05-MAIN-INTEGRATION.md. Explicit CMS writer/provider/scan/hydration/lint limits remain. |
| Event platform | BE-07–10 + FE-07–09 | PLANNED; registration/pass/attendance concurrency and authorized scanning. |
| CMS | BE-11–15 + FE-10–14 | PLANNED; ownership, drafts, atomic revision/publication/audit. |
| Administration | BE-16–18 + FE-15–16 | PLANNED; elevated permissions, audited mutations, bounded history. |
| Production hardening | BE-19+ + FE-18+ + SEC/QA/OPS | PLANNED; staging provider/migration/rollback/scale evidence and release review. |

Consolidate completed branches forward-only with normal merges or reviewed traceable cherry-picks/reconciliation. Preserve history, validate the combined manifest/lockfile, and rerun applicable regressions. During Phase 1, validated task/checkpoint integration into main and its Vercel Git deployment follow AGENTS.md sections 26–30; later phases use revised release gates. Checkpoint labels do not bypass validation or data safety.

## I. Definition of done and future workflow

Reference AGENTS.md for the global definition of done. Roadmap tasks additionally require actual dependency/contract evidence, final branch/implementation commit, rerun validation summary, limits/cutover boundaries and pushed task work. During EARLY DEVELOPMENT, main integration, main push and Vercel checks are normal completion gates; record integration commit and deployed state/SHA/URL, or report verification blocked. Integration is VERIFIED only after deterministic install, complete graph, build, standalone TypeScript, applicable domain/frontend/browser/visual regression and safety checks pass together. Unsupported lint and unvalidated provider/device boundaries remain explicit exceptions rather than fabricated passes.

After a BE/FE task completes, is pushed and is integrated into main during EARLY DEVELOPMENT:

1. Update status on the task branch where appropriate; later flow into integration.
2. Record branch if used, final task commit and main integration commit when applicable, avoiding self-referential documentation SHAs.
3. Record actual validation, deployment state/SHA/URL and manual-audit handoff; blocked checks stay explicit.
4. Record newly discovered dependencies/limitations.
5. Keep future tasks PLANNED.
6. Never mark integration verified before combined regression passes.

Future prompts can be concise:

```text
Read root AGENTS.md and docs/ENGINEERING-ROADMAP.md.
Continue the next scoped integration task from current verified main.
Use the task-specific backend action/DTO as the source of truth.
Follow the roadmap dependencies and update task status when complete.
```

Agents still inspect Git state, dirty files, contracts and history. FE-04 and FE-05 foundations are delivered; no full operational CMS claim. Next: explicit FE-02 -> BE-02/03 auth-flow cutover and FE-03/FE-06 -> BE-04 profile cutover, real independent Neon role/session QA, protected typed CMS writers/legacy identity crosswalk, and FE-QA hydration root-cause audit. Event passes, registration and attendance remain separate future domains.

## J. Change log

| Date | Change | Evidence |
| --- | --- | --- |
| 2026-10-09 | Added ownership audit and gated migration track; no infrastructure migration executed. | USS-OWNERSHIP-MIGRATION-PLAN.md; current metadata/browser/aggregate evidence, explicit target/Resend/DNS gaps. |
| 2026-10-09 | Revalidated BE-05/06 and FE-04/05 on latest main, preserving concurrent delivery 6e3e8ca through fast-forward. | FINAL-MEMBER-FOUNDATION-INTEGRATION.md; fresh backend 106/106, FE 19/19, browser/contract audits, dependency graph/build/types and local smoke passed. Hydration/lint/provider/scan/writer/reissue/restore limits remain open. |
| 2026-10-09 | Delivered FE-04 / FE-05 foundations into the current verified development main candidate, preserving dependency repairs and early-development policy. | Fresh validation and limits: FE-04-05-MAIN-INTEGRATION.md; permanent barcode remains identity-only, CMS writers/restore excluded. |
| 2026-10-09 | Established roadmap, actual foundation/repair parent map, cutover boundaries and isolated forward-only integration. | Starting HEAD a91f910; all foundations and approved repair heads included. Integrated regression passed; exact counts and exceptions in PRE-FE04-INTEGRATION-VALIDATION.md. |
| 2026-10-09 | Enabled temporary EARLY DEVELOPMENT FAST-FEEDBACK MODE, main/Vercel manual-audit workflow, lifecycle exit criteria and delivery evidence gates. | Policy branch chore/early-development-delivery from verified ffccaa0; Fresh policy-tree validation: npm ci/deps:check/build/standalone TypeScript passed; backend 106/106 and both FE contracts passed. Existing next lint failed as documented. Task commit b00142baf5b59ea31a1b49c87d867bf46cf4857b; main integration f4c6fcb2fcb32c5d3c6f916bd7d8cd4b3168b0a9 pushed. GitHub Vercel check confirmed deployment started; final deployment state/SHA/core-page checks are reported after verification. |

### Verified integration evidence

See [PRE-FE04-INTEGRATION-VALIDATION.md](PRE-FE04-INTEGRATION-VALIDATION.md) for the actual rerun matrix, graph resolutions, merge reconciliation, auth boundaries and original-worktree concurrency limitation. Install/graph/build/standalone TypeScript passed; domain tests 106/106, form 27 viewports, public shell 80 viewports, workspace 10, auth 53 responsive/35 flow groups, member 41 cases, both contract scripts and both visual scripts passed. Hydration: reproduced (8 console warnings across browser/visual audits); separate 12 fresh-page required-width probes had none. Existing next lint failed as documented. No live provider or production validation claimed.

### Independent integration and live review verification — 2026-10-09

BE-05 (`fd0d955`) and BE-06 (`fc1c097`) are delivered in main ancestry. FE-04 / FE-05 source head `8961f0d187806adcde2e5a3aabd76b9771f181c3` is retained through normal integration `6cd80d2`. Main advanced independently to `6e3e8ca18c752a319e1a0e7ae361c5cdd63cfa44` during this verification; its documentation/evidence additions were preserved. No feature was reimplemented. The independently rerun application tree is identical to that main tree outside docs.

Fresh integrated checks: strict npm ci, npm ls --all, Next build, standalone TypeScript, backend 106/106 (DB 23, auth 18, email 19, profile 21, card 6, RBAC/history 19), frontend 19/19, FE-02/03 contracts, strict UI audit (zero findings), all nine existing browser/visual suites passed. Card/CMS layout/navigation checks: 30; history/export interactions passed. Member dashboard: 41; public shell: 80; forms: 27; workspace: 10; auth responsive/flow and visual checks passed. Existing hydration warnings remain documented; unsupported next lint remains a tooling limitation.

Vercel Git deployment `dpl_Hm9qVfLjuczDw8XxrZgNV7w3jfXw` was READY for main SHA `6e3e8ca18c752a319e1a0e7ae361c5cdd63cfa44`, project ussrunning-web, live development review URL https://ussrunning-web-seven.vercel.app. Live browser smoke at 320/375/768/1024px passed 20 route/viewport cases across home, login, join, member card and admin: HTTP 200, no horizontal overflow and no page exceptions. Live member-card/admin views show controlled service-unavailable feedback; authenticated functionality is BLOCKED pending Neon/session staging setup and is not claimed as passing. HTTP 200 alone does not establish domain-flow success. Development reference route returned 404. Final documentation checkpoint SHA/deployment is verified after push and reported in the delivery response to avoid self-referential SHA churn. Manual human audit remains pending.

Explicit remaining limitations: real Neon authenticated role/session staging validation; physical barcode scanning; protected CMS writers; barcode reissue; revision restore (not implemented); hydration warning root-cause audit; unsupported next lint. Auth non-login and profile adapter cutovers remain separate roadmap work. No persistent migration, real email, credential/environment change or published history rewrite occurred.

### Neon auth configuration cutover — 2026-10-09

See [AUTH-CONFIGURATION-CUTOVER.md](AUTH-CONFIGURATION-CUTOVER.md). Reused existing Neon main Better Auth; supplied missing Vercel server cookie secrets for production/preview and production verification-link base origin. Existing nine USS migrations rehearsed in isolation then applied transactionally after empty-schema/legacy-data guards. Existing trusted review origin retained. Profile presentation now delegates to authorized BE-04 services; legacy admin compatibility uses current USS database roles/status, never provider role claims or an admin-email override. Member IDs/barcodes and existing data retained. Real provider/email checks are separately reported; Resend key and verified sender remain missing. Active role staging, scanning, CMS protected writers, barcode reissue, revision restore, hydration root-cause audit and next lint limitations remain open. No live flow success is inferred from fixtures or HTTP 200.

Auth cutover live evidence: real Neon signup, shared-provider OTP request, confirmed mailbox receipt, successful OTP verification, sign-out/session removal and sign-in/session restore passed on d0ba3ab. Exactly one mapped USS account/profile with member only remains pending_verification; backend activation was not bypassed. Authenticated deployed profile/card/CMS fail closed with verification-required rather than AUTH_NOT_CONFIGURED. Real active role/card/CMS success remains blocked by missing Resend key/verified sender and the USS ownership-proof/UI cutover. Full integrated 148/148 tests and two Card/CMS browser suites passed; zero warnings in those targeted probes does not close the broader hydration audit.

### FE-06 member dashboard foundation — 2026-10-09

Delivered source `ee5fc70` on feature/member-dashboard-foundation. Normal merge `61cee44`
preserved independently delivered BE-07 (`fb7fb11`), trusted auth/profile cutover (`2193a60`)
and ownership documentation; later auth verification documentation also merged forward.
FE-06 changes only overview/loading, reusable member identity media, scoped composition and tests/docs.
No auth configuration, event service/schema, registration/pass/check-in or CMS writer changes.

Combined validation: 157/157 Node tests (125 backend, 32 frontend), build, standalone TypeScript,
dependency graph and strict UI audit (zero findings) pass. FE-06 browser: 43 cases / 154 assertions,
zero page exceptions/hydration warnings; narrow/short/desktop layouts, 200% zoom, lifecycle,
permission-aware mobile navigation, failed refresh, duplicate prevention and FE-04 card entry.
Existing form/auth/member/workspace/public-shell/card audits pass; older auth/public tests still
capture hydration warnings, so FE-QA remains open. See FE-06-MEMBER-DASHBOARD.md for counts/limits.
The exact delivered main SHA and Vercel result are verified after push and returned in the delivery
report; no active authenticated member test is inferred from development fixtures.

FE-07 requires BE-08 own-registration/eligibility/capacity contract and BE-07 event projections;
event passes require BE-09 and notifications BE-16. FE-06 invents no records/counts/entitlement.
Real independent active role/session/device validation, CMS writers, physical scanning, hydration
root cause and unsupported lint remain open. Inherited Windows-encoded punctuation in the concurrently
updated roadmap was normalized to UTF-8 without changing other tasks' content or policy.

### FE-07 event registration delivery — 2026-10-12

Resumed the preserved feature/event-registration-ui worktree after quota interruption.
BE-09 e24222b is retained through a forward-only fast-forward; no backend semantics changed.
FE-07 is DONE within the typed BE-07/08 frontend contract: public detail/list, owner booking,
server-owned versioned cancellation, cursor history and recent dashboard records.
`/runs/[slug]` is intentional canonical public routing with legacy editorial compatibility;
FE-12 content migration can retire the compatibility boundary without inventing identity.

Final validation: 270/270 Node regressions after BE-10 reconciliation, 138 FE-07 browser cases / 254 assertions, zero
FE-07 exceptions/hydration warnings, dependency graph/build/standalone TypeScript and strict
UI audit passed. Existing form/public/auth/profile/workspace/dashboard/card audits passed;
older reference hydration warnings remain separately recorded. Unsupported next lint is unchanged.
See FE-07-EVENT-REGISTRATION.md and fe-07-evidence for exact coverage and limitations.
Main SHA, Vercel READY/SHA and live smoke are verified after push and reported in delivery.

Real active-member mutations and independent Neon session/concurrency QA remain outstanding.
No authoritative remaining-capacity or canCancel read exists; frontend invents neither.
Private/unpublished/members-only detail is not exposed by public reads; an authorized member
read/discovery contract remains a backend prerequisite for members-only detail expansion.
FE-08 next consumes BE-09 after approved persistent migration 010/keyring setup and active
session validation; pass UI, scanner/check-in and CMS protected writers remain future work.
### BE-10 attendance foundation � 2026-10-12

Resumed existing worktree at e24222b without discarding source or concurrent FE-07 work.
Task 3be4613, forward reconciliation b663568 preserves FE-07 main 6baf018. Uses BE-09
protected resolver in the same transaction as attendance/audit, events.manage authorization,
existing check-in window timestamps, unique registration attendance and composite pass FK.
No scanner UI, member barcode/auth/pass-token semantic changes or manual reversal/search.

Integrated install/dependency baseline unchanged; build and standalone TypeScript pass.
BE-10 35/35, full integrated regression 270/270, local core browser 20/20 with zero page
exceptions/overflow/hydration warnings in those probes. Offline migration plan and local
fresh/010 upgrade/legacy retention/rerun/rollback/constraints pass. Existing next lint and
broader hydration audit remain open. Real independent Neon connections, migration 010/011
staging, active provider/staff operational flow and camera/physical scanning remain pending.
Read-only Neon inventory has 10 branches and no task-owned isolated connection; no persistent
migration or branch deletion. Main/Vercel exact SHA and READY evidence are reported after push;
HTTP smoke is not authenticated attendance proof. FE-09 consumes documented scanEventPass
contract after approved isolated migration/keyring/role setup.

### BE-11 media foundation validation

Isolated media foundation: existing uss.media_assets metadata reused, additive migration 012,
server-only typed validation/service/repository/provider boundary, existing cms.content.manage
authorization, shared DB upload quota, immutable binary identity and retained referenced assets.
BE-11 37/37, full regression 307/307, install/dependency graph/build/standalone TypeScript pass,
local mobile/desktop core browser 20/20; offline plan and local fresh/upgrade/rerun pass.
No frontend/auth/pass/check-in semantic change. Next lint remains unsupported.

Neon storage inventory is enabled but has no bucket/configured adapter. Memory storage is
explicit test/development only; deployed uploads fail closed until a real persistent adapter
and credentials are configured. No persistent migrations/objects/buckets changed. Live
Neon/storage validation, malware scanning, streaming upload endpoints, physical cleanup,
real authenticated roles and human audit remain pending. See MEDIA-STORAGE-FOUNDATION.md
and BE-11-VALIDATION.md; BE-12 may build on protected typed media references.

### FE-08 Event Pass UI delivery — 2026-10-12

DONE within the BE-09 frontend contract: owner registration/pass detail at the PRD
/dashboard/registrations/[id] route, explicit backend-idempotent issuance, controlled account/
pass/network states, reusable branded QR and lazy pass entries in dashboard/history. Empty reads
never issue; confirmed history alone never proves pass availability. Backend owns eligibility,
identity and check-in. At backend-provided expiry the UI rechecks, rather than declaring expiry
from the browser clock. No token appears in navigation, primary text, logs or browser storage.

Fresh integrated validation: 338/338 Node tests including 31 FE-08 tests and concurrent BE-11;
128 FE-08 browser cases / 386 assertions; 16/16 independent rendered screenshot decodes;
138 FE-07 cases / 254 assertions; clean install, deps, build, standalone TypeScript and strict
UI audit (zero findings). Production local smoke: 62/62 cases with zero exceptions/hydration
warnings and production reference/custom-logo 404 guards. Existing forms/auth/profile/workspace/
public-shell/dashboard/card audits pass, retaining five older auth/public hydration warnings.
Next 16 next lint remains unsupported. See FE-08-EVENT-PASS.md and fe-08-evidence.

Preserved BE-09/BE-10 and forward-integrated BE-11 3ca433b, including its approved media/Sharp
baseline. No FE-08 dependency/lock drift, auth configuration, persistent DB mutation/migration
or scanner changes. Task/main/deployment SHA and deployed live smoke are verified after push
and returned in delivery; Vercel is development review, not production-readiness evidence.

Remaining gates: approved persistent pass migration/keyring setup and real trusted active-owner
issuance/read/revocation/role QA; physical phone/camera scans and BE-10 staff/window/replay checks
through FE-09. Per-event QR branding is a rendering contract only: FE-12/backend/CMS must supply
validated persistent media configuration. Automatic confirmation issuance/email orchestration,
pass reissue, CMS writers, payment and broader hydration root-cause work remain separate tasks.

### BE-12 Stories / Editorial delivery — 2026-10-12

Resumed the preserved Stories worktree without restarting. Implementation 1771a33 retains
FE-08 99f448f and BE-11. Reuses existing Stories/revision schema, plain-text paragraphs,
server-owned stable slugs, cms.content.manage, optimistic concurrency and atomic writes/history.
Public reads exclude draft/private/archived/future publications; scheduling uses server time.
Additive migration 013 only; no persistent database migration executed.

Validation: Stories 35/35, integrated regression 373/373, clean install/dependency graph,
production build, standalone TypeScript and diff check passed. Local and deployed core browser
smoke each passed 20/20 at 320/1366px, zero page exceptions/overflow/hydration warnings in these
probes. Implementation deployment dpl_2DDoLSdk3NzmA2fJWUNWRFmad23S was READY for exact
1771a333589c0977261e25461e7f36b137ee1690. Final documentation deployment is verified after push.

Real Neon migration/independent concurrency/authenticated role staging, persistent media delivery,
human audit and broader hydration root-cause work remain pending. Next lint remains unsupported.
Legacy public pages are preserved; FE-10 must explicitly consume the new typed contracts.
Rich text, revision restore, taxonomy management and BE-19 search are deferred. See
STORIES-EDITORIAL-SERVICE.md and BE-12-VALIDATION.md. No auth/pass/check-in/storage semantic changes.

### FE-09 Scanner / Check-In UI delivery — 2026-10-12

DONE for the frontend contract: `/dashboard/check-in` selects a bounded managed event,
`/dashboard/check-in/[eventId]` confirms its context and calls BE-10 scanEventPass with
only eventId and unchanged value. Central events.manage presentation uses trusted reads;
BE-10 reauthorizes every mutation. Member barcodes never become event tickets.

Camera is explicit and rear-preferred, with lazy qr-scanner 1.4.2 native/worker decoding,
permission/unavailable/manual fallback, duplicate suppression and resource cleanup.
Results distinguish success, existing attendance and stable failures; crew acknowledgement
controls the next scan. Only safe participant fields are rendered. No automatic retry or
attendance override. Managed event DTO lacks check-in windows, so availability is checked
by BE-10 on scan rather than invented from browser time.

Final integrated validation: 417/417 Node tests including 44 scanner tests and BE-12;
118 scanner browser cases / 644 assertions and three actual rendered-QR decoder variants;
4 navigation cases / 16 assertions; FE-08 128/386 with 16 independent QR decodes, FE-07
138/254 and FE-06 43/154. All these browser probes had zero runtime/hydration errors.
Clean install (262 audited, zero vulnerabilities), deps, production build, standalone
TypeScript, diff check and strict UI audit pass (zero findings). Production local smoke
73/73 includes protected scanner screens and production fixture 404 guards. Known Next 16
next lint remains unsupported. See FE-09-SCANNER.md and fe-09-evidence.

Preserved concurrent BE-12 implementation 1771a33 and delivery documentation 58a2040 by
forward-only integration. No existing dependency version drift: qr-scanner and its canvas
types are the only additions. Main/deployment SHA and READY are checked after push and
reported with deployed smoke evidence. This remains development product review.

Operational gates remain: real authenticated crew mutation/session checks, approved
persistent migration/keyring configuration, independent Neon concurrency and physical
iOS/Android phone/screenshot/outdoor-brightness/scan-distance testing. Synthetic browser
camera frames are not physical-device proof. FE-12 should consume trusted check-in
configuration/event administration; no auth, BE-09/BE-10 semantics, Event Pass behavior,
member identity, Stories, payments, scanner override or CMS writers were changed.

### BE-13 Gallery foundation delivery — 2026-10-13

Delivered 975be4a from latest FE-09 main 43e0deb; BE-12/BE-11 and concurrent scanner work
preserved. Reuses existing gallery_items and MediaAsset serializer; additive collection,
retained item relation and immutable revision schema in migration 014. Server-owned slugs,
cms.content.manage, Gallery version/locking and exact-set atomic reorder; public reads fail
closed for drafts/private/archive/future/ineligible media or event references. No frontend UI
or universal CMS history entity expansion; typed Gallery revision metadata is protected.

Validation: Gallery 36/36, integrated regression 453/453, clean install/dependency graph,
production build, standalone TypeScript and diff check passed. Migration local fresh/001-013
upgrade/legacy retention/rerun/rollback/runtime grants and offline plan passed. No persistent
migration executed. Local and deployed core browser each 20/20, zero page exceptions/overflow/
hydration warnings in these probes. Implementation deployment dpl_2xeQ1xduqNSH9uhGHefUXujVcfqb
READY for exact 975be4a698b01fabdb3a50c9506023f8e7c5ffca. Final documentation deployment is
verified after push; Vercel remains the development review environment.

FE-11 consumes typed Gallery metadata/items/lifecycle/history and existing BE-11 media picker.
Persistent storage, approved migration/grants staging, real trusted admin sessions/independent
Neon concurrency, large-library query-plan QA, bulk upload and human audit remain pending.
Collection cap1000/read pages100; no restore/scheduling/physical cleanup. Next lint and broader
hydration root-cause audit remain open. See GALLERY-SERVICE.md and BE-13-VALIDATION.md.

### BE-14 Partner / Sponsor delivery - 2026-10-13

Implemented 71b94e6 from latest BE-13 main b6100da. Reuses partners/event_partners, existing partners.manage and BE-11 MediaAsset serializer. Additive migration015 preserves legacy rows and associations; explicit lifecycle, server slugs, optimistic versions, canonical/event-scoped presentation, exact-set atomic reorder and immutable revisions/minimized audit. No frontend or auth/storage/domain replacement.

Validation: Partner41/41, full regression494/494, clean install/dependency graph, production build, standalone TypeScript and diff check PASS. Local fresh/001-014 upgrade/legacy retention/rerun/runtime grants/atomic rollback and offline15-migration plan PASS. No persistent migration. Local/deployed browser core each20/20 at320/1366px; zero page errors/overflow/targeted hydration warnings in these probes. Implementation deployment dpl_3V5THYH2CWjDDMEZfWoFNk2UEBUX READY, exact71b94e63028cb34b61b4d6b77e977ae513a16006, alias ussrunning-web-seven.vercel.app. Final documentation deployment is checked after push.

FE-13 consumes typed canonical and event relationship contracts. Approved migration/grants staging, real admin sessions/independent Neon concurrency, persistent media delivery, legacy unsafe-content remediation and query-plan QA remain pending. No bulk operations, restore, automatic QR-branding selection or unrelated CMS writers. Known next lint and broader hydration audit remain open. Concurrent FE-10 worktree changes preserved. See PARTNER-SPONSOR-SERVICE.md and BE-14-VALIDATION.md.

### FE-10 Stories CMS delivery — 2026-10-13

DONE for the managed frontend foundation. `/admin?module=stories` reuses the existing
CMS shell and trusted permission projection; create/edit/protected preview are query
views of the same route. BE-12 `cms.content.manage` guards remain the write authority.
The editor consumes active backend references, plain-text paragraphs, server-owned slugs,
`expectedVersion` updates, publish/schedule/unpublish/archive, and explicit conflict
reload. BE-11 MediaAsset selection is bounded and read-only; null delivery URLs are
represented honestly. The frontend strips internal author account IDs from editor DTOs.

Validation after forward-merging BE-13/BE-14: 524/524 integrated Node tests, including
30 FE-10 tests; FE-10 browser 40 cases / 137 assertions after the focused create/publication follow-up at 320–1920px and 200% zoom,
zero runtime/hydration errors. FE-07 browser 138/254, FE-08 128/386 with 16 QR decodes,
and FE-09 118/644 passed; one FE-09 immediate focus assertion was transient and passed
on repeat without scanner changes. Clean install, dependency graph, production build,
standalone TypeScript and strict UI audit (zero findings) passed. Main deployment
`dpl_MaRP7Hp3bURJjkoWVU5BCNn7Guvt` reached READY for implementation SHA `953e295`;
the follow-up roadmap deployment is verified separately.

The managed CMS does not migrate the legacy public Stories route. Persistent BE-11 media
delivery/upload, BE-12 persistent migration, real authenticated Neon editorial writes,
full FE-16 revision history/restore contract, search hardening and optional future rich
text remain separate. `next lint` is still unsupported under Next.js 16. Manual product
audit of the Vercel development build is pending. See FE-10-STORIES-CMS.md and
fe-10-evidence. FE-09 and concurrent Gallery/Partner work were preserved forward-only.


## BE-15 delivered foundation evidence

Implementation `06b1a912147d052644af933111faa8f8acdf133d` on
`feature/dynamic-site-content` was integrated forward into current main, preserving
FE-10 follow-up `0aeae57`. Ten typed slots reuse uss.site_content and immutable
revisions with additive migration 016; no persistent migration was executed.
Public bundles validate published pointers and MediaAsset/domain references; approved
code defaults and safe empty states handle missing/invalid/unavailable content.
Managed contracts require cms.content.manage, trusted active/verified account,
expectedVersion, atomic revision/audit, and DB authorization recheck.

Validation: BE-15 44/44; full integrated regression 568/568; clean install, dependency
graph, production build, standalone TypeScript, migration fresh/upgrade/rerun/offline
dry-run and diff check passed. Local and deployed core browser smoke each passed
20/20 at 320px/1366px, with zero page errors or targeted hydration warnings.
Vercel `dpl_Bgz5iAtyUKgW4YxPyWgEdRihsmVg` reached READY for the exact implementation
SHA and review alias https://ussrunning-web-seven.vercel.app.

Existing frontend legacy content adapters remain unchanged: FE-14/public-surface
wiring is still required. Persistent media delivery, authorized migration/runtime
grants, real authenticated Neon CMS writes and independent Neon concurrency remain
staging work. Localization, rich text, restore, legacy adoption and future cache
invalidation remain deferred. Known Next.js 16 next lint and broader hydration audit
remain open; manual product audit is pending. No auth/storage/domain semantic changes.

### FE-11 Gallery CMS delivery — 2026-10-13

DONE for the managed frontend foundation. Implementation `2212553` was integrated
forward into main after preserving BE-15 `f8e60c6`; FE-10 and FE-09 remain intact.
`/admin?module=gallery` uses the existing CMS shell and trusted permission projection.
BE-13 `cms.content.manage` guards remain authoritative for every managed operation.
Create/edit/private preview use query views, server-owned slugs, `expectedVersion`,
publish/unpublish/archive, explicit conflict reload and bounded revision metadata.
Gallery items support caption/alt edits, reference removal and complete exact-set
reorder with keyboard controls. BE-11 picker/cover selection is read-only; null
delivery URLs are represented honestly. Optional event references use bounded BE-07
reads with recovery, preserving existing links when options are unavailable.

Final validation: Gallery 24/24; full integrated Node suite 592/592 including BE-15;
Gallery browser 46 cases / 151 assertions at 320–1920px and 200% zoom; zero runtime
exceptions/hydration warnings. Existing regression runs: Stories 40/137, Scanner
118/644, Event Pass 128/386 (16 QR decodes), Registration 138/254 cases/assertions.
Clean install, dependency graph, production build, standalone TypeScript, diff check
and strict UI audit (zero findings) passed. Implementation deployment
`dpl_GHzfBfjaVXA8aArNteFud5yoJkQQ` reached READY for exact main SHA
`22125536c741af7c908406c85d5ca1b07a76013b`. The final roadmap deployment is
verified separately after push; review alias is https://ussrunning-web-seven.vercel.app.

Persistent media upload/delivery, authorized staging migrations/runtime grants,
real authenticated Neon admin mutations/concurrency and physical-device/human
product QA remain pending. Large-library search/bulk upload, public Gallery migration
and revision restore remain future scope. Known unsupported `next lint` remains.
See FE-11-GALLERY-CMS.md and fe-11-evidence. No auth, BE-11/BE-13 semantics or
scanner behavior changed; no persistent migration was run.


### BE-16 Notification Service delivery — 2026-10-14

Implementation `24b7db11b21c1ca26aa9683907889ba57b869c6f` on feature/notification-service
was integrated forward after FE-11 delivery `88c3acf`. Registration confirmed/waitlisted/
cancelled and pass-available intents are atomic with authoritative mutations. Existing
BE-03 EmailProvider/Resend is reused; Neon Better Auth mail remains separate. Migration
017 is additive and was not applied to any persistent environment. Existing domain
semantics, frontend work and dependencies are preserved.

Validation: BE-16 52/52, full integrated regression 644/644; clean install (262 audited,
zero vulnerabilities), dependency graph, production build, standalone TypeScript and
diff check pass. Local migration fresh/001–016 upgrade/legacy retention/rerun/rollback/
runtime grants and offline dry-run pass. Local and deployed core browser each20/20
at320/1366px, zero page errors/targeted hydration warnings and reference404 guard.
Implementation deployment `dpl_AFkEHcEvo2tWzffhC6z8138w5ALQ` READY at exact implementation
SHA, review alias https://ussrunning-web-seven.vercel.app. Final docs deployment is
verified separately after push.

No real email or production migration/config/credential change. Real isolated Neon
concurrency/authenticated roles and controlled verified-sender delivery remain pending.
Durable intents require explicit managed dispatch/retry: no automatic worker, receipt/
bounce webhook, marketing or notification UI. Provider acceptance is not inbox proof.
Next lint remains unsupported; broader hydration and human product audit remain open.
See NOTIFICATION-SERVICE.md and BE-16-VALIDATION.md. BE-17 is next; not implemented here.

### FE-12 Events CMS delivery — 2026-10-14

DONE for managed Event content/configuration. Task `04ca13d` was integrated forward
from BE-16 delivery `113dc4d`, preserving FE-11 and notification work. Existing
`/admin?module=events` owns list/create/edit/detail/private preview, with trusted
`events.manage` presentation and backend guards on every read/write. Uses the actual
BE-07 lifecycle graph, opaque expectedVersion, explicit conflict reload, bounded
status/event-type listing and immutable existing slugs. Creation requires BE-07's
explicit slug input; no title-derived slug or client identity generation.

Absolute timestamp controls require seconds and an explicit offset; normalized
summaries show the selected IANA timezone without browser-local reinterpretation.
Capacity/waitlist/visibility/location remain configuration only. BE-11 cover picker
is read-only, with honest null/unavailable delivery. Draft preview stays protected;
public links retain canonical/legacy-compatible `/runs/[slug]`. Existing scanner
navigation remains independently authorized. No registration, pass or check-in UI
or backend semantics were duplicated or changed.

Validation: FE-12 31/31, integrated Node 675/675 after BE-16; Events browser 57 cases /
121 assertions at 320–1920px, short height/200% zoom, keyboard/focus/Escape, touch
targets and lifecycle/conflict/media states. Zero final runtime/hydration errors;
strict UI audit zero findings. Gallery 46/151, Stories 40/137, Scanner 118/644 (three
QR decodes), Event Pass 128/386 (16 decodes), Registration 138/254 passed. Clean
install, dependency graph, production build, standalone TypeScript and diff checks
passed without dependency/lockfile drift. Next.js 16 next lint remains unsupported.

Vercel `dpl_6KoW516sM4geyR6GnNcpqqjw81Zu` READY for exact implementation main SHA
`04ca13d2d0546fc91357151782f9baed5343089a`; deployed anonymous desktop/mobile smoke
17 cases / 59 assertions passed with zero runtime/hydration errors and fixture 404.
Review: https://ussrunning-web-seven.vercel.app/admin?module=events. Final roadmap
deployment is verified separately after push; this is development product review.

Real authenticated Neon admin writes/concurrency, staging migration/runtime grants,
persistent media delivery and human/physical-device QA remain pending. Public route
cleanup, check-in-window configuration, persisted per-event QR branding, richer
relationships and full revision workspace require separate contracts/tasks. No auth
provider/configuration, permanent barcode, BE-07/08/09/10 semantics or persistent DB
changes were made. See FE-12-EVENTS-CMS.md and fe-12-evidence.


### BE-17 Admin User Management delivery — 2026-10-14

Implementation `2801930f67dbcc82496e1420b4f6fe15f2e9b5d7` on feature/admin-user-management
was integrated forward after FE-12 implementation04ca13d and delivery077aff1. Existing
users.manage remains super_admin-only; no permission/role hierarchy change. Safe bounded
list/detail/search and audited optimistic lifecycle actions reuse accounts/profile/RBAC.
All super_admin targets and own destructive actions are protected; pending verification
cannot be bypassed. Migration018 adds account version/status time and two access indexes.
No persistent migration, provider/session reset, identity rotation or frontend change.

Validation: BE-17 55/55, integrated regression730/730 including FE-12, clean install
(262 audited/zero vulnerabilities), dependency graph, production build, standalone
TypeScript and diff check PASS. Local fresh/001–017 upgrade/legacy retention/rerun/
failed-migration rollback+recovery/runtime grants and offline18-migration plan PASS.
Local/deployed core browser each20/20 at320/1366px, zero page errors/targeted hydration
warnings/horizontal overflow and reference404 guard. Implementation Vercel deployment
`dpl_E3erqyZgsPGG9c72jp4JttgsN6mq` READY for exact implementation SHA; review alias
https://ussrunning-web-seven.vercel.app. Final documentation deployment is checked after push.

Provider cookies are not revoked: existing trusted DB lifecycle guards block protected
USS operations. Real authenticated super_admin/stale-session QA, isolated Neon migration/
independent concurrency, large-data query plans and human audit remain pending.
BE-18 role ownership/bootstrap/revocation is separate; all elevated target lifecycle
changes require a future explicit security workflow. No resend/verification override,
bulk actions or arbitrary profile edits. Known next lint and broader hydration audit
remain open. See ADMIN-USER-MANAGEMENT.md and BE-17-VALIDATION.md.
