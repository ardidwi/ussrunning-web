# USS Running Engineering Roadmap

## A. Purpose

This living document records product sequence, backend/frontend contracts, dependencies, status, evidence and integration checkpoints. Read root [AGENTS.md](../AGENTS.md), then this roadmap, then the task-specific prompt. AGENTS.md owns permanent engineering behavior; this document owns product planning. Do not duplicate the global rules. Always inspect actual Git state and contracts rather than blindly trusting roadmap metadata.

USS Running comprises a public website, free membership, authentication, account identity, member profiles, permanent member IDs and barcodes, CMS, Stories, media/gallery, events, registration, event passes, barcode/QR scanning, check-in, partners/sponsors, notifications, admin operations, RBAC, audit/revision history, dynamic site content, and staging/production infrastructure. Planned scope is not evidence of implementation.

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

FE-03 delivered a dashboard shell/profile UI with provisional adapters. Its production loader/save still return PROFILE_UNAVAILABLE for authenticated sessions; reference fixtures are development-only. BE-04 is available after integration, but merge alone does not translate the provisional DTO or connect trusted profile reads/writes. Scope that cutover explicitly before claiming real profile flows.

FE-02 production connects existing provider login only; registration, verification/resend, recovery and reset retain AUTH_UNAVAILABLE adapter branches. BE-02/03 availability does not automatically wire those flows. Plan and validate that cutover separately; fixture authentication outcomes are not provider authentication evidence.

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
| BE-13 | Gallery Service | PLANNED | BE-11 + BE-06 | TBD | Bounded collections and publication. |
| BE-14 | Partner / Sponsor Service | PLANNED | BE-06 + BE-11 | TBD | Managed records/media and visibility. |
| BE-15 | Dynamic Site Content Service | PLANNED | BE-06 + BE-11 | TBD | Typed drafts and public published projections, separate from configuration. |
| BE-16 | Notification Service | PLANNED | BE-03 + relevant domain events | TBD | Preferences, retries, deduplication and consent. |
| BE-17 | Admin User Management | PLANNED | BE-02 + BE-04 + BE-06 | TBD | Audited lifecycle actions with least privilege. |
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
| FE-09 | Scanner / Check-In Workspace | PLANNED | BE-10 + FE-05 | TBD | Staff permissions/current state/recoverable feedback. |
| FE-10 | Stories CMS | PLANNED | BE-12 + FE-05 | TBD | Draft/publication/revision workflows. |
| FE-11 | Gallery CMS | PLANNED | BE-11 + BE-13 + FE-05 | TBD | Upload ownership/progress/failure and bounded collections. |
| FE-12 | Events CMS | PLANNED | BE-07 + FE-05 | TBD | Lifecycle/configuration/audit/publication clarity. |
| FE-13 | Partner / Sponsor CMS | PLANNED | BE-14 + FE-05 | TBD | Managed partner content/media. |
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
