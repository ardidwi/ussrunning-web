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
| BE-07 | Event Domain Foundation | PLANNED | BE-01 + BE-06 | TBD | Typed lifecycle/ownership/capacity; reconcile inherited legacy events. |
| BE-08 | Event Registration Service | PLANNED | BE-07 + BE-02 | TBD | Eligibility, capacity concurrency, cancellation, idempotency. |
| BE-09 | Event Pass / Ticket Service | PLANNED | BE-07 + BE-08 | TBD | Event entitlement distinct from permanent member barcode. |
| BE-10 | Check-In / Scanner Service | PLANNED | BE-08 + BE-09 + BE-06 | TBD | Authorized staff, replay protection, attendance and audit. |
| BE-11 | Media Storage Service | PLANNED | BE-01 + BE-06 | TBD | Object storage + metadata; type/size/ownership validation. |
| BE-12 | Stories / Editorial Service | PLANNED | BE-06 + BE-11 | TBD | Typed writes, drafts/publish, atomic revision/audit. |
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
| FE-06 | Member Dashboard | PLANNED | FE-03 + BE-04; relevant event services | TBD | Trusted profile/status/completion, honest unavailable states. |
| FE-07 | Event Registration UI | PLANNED | BE-07 + BE-08 + FE-06 | TBD | Eligibility/capacity/retry/duplicate handling. |
| FE-08 | Event Pass UI | PLANNED | BE-09 + FE-07 | TBD | Event entitlement distinct from member identity. |
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
| 2026-10-09 | Delivered FE-04 / FE-05 foundations into the current verified development main candidate, preserving dependency repairs and early-development policy. | Fresh validation and limits: FE-04-05-MAIN-INTEGRATION.md; permanent barcode remains identity-only, CMS writers/restore excluded. |
| 2026-10-09 | Established roadmap, actual foundation/repair parent map, cutover boundaries and isolated forward-only integration. | Starting HEAD a91f910; all foundations and approved repair heads included. Integrated regression passed; exact counts and exceptions in PRE-FE04-INTEGRATION-VALIDATION.md. |
| 2026-10-09 | Enabled temporary EARLY DEVELOPMENT FAST-FEEDBACK MODE, main/Vercel manual-audit workflow, lifecycle exit criteria and delivery evidence gates. | Policy branch chore/early-development-delivery from verified ffccaa0; Fresh policy-tree validation: npm ci/deps:check/build/standalone TypeScript passed; backend 106/106 and both FE contracts passed. Existing next lint failed as documented. Task commit b00142baf5b59ea31a1b49c87d867bf46cf4857b; main integration f4c6fcb2fcb32c5d3c6f916bd7d8cd4b3168b0a9 pushed. GitHub Vercel check confirmed deployment started; final deployment state/SHA/core-page checks are reported after verification. |

### Verified integration evidence

See [PRE-FE04-INTEGRATION-VALIDATION.md](PRE-FE04-INTEGRATION-VALIDATION.md) for the actual rerun matrix, graph resolutions, merge reconciliation, auth boundaries and original-worktree concurrency limitation. Install/graph/build/standalone TypeScript passed; domain tests 106/106, form 27 viewports, public shell 80 viewports, workspace 10, auth 53 responsive/35 flow groups, member 41 cases, both contract scripts and both visual scripts passed. Hydration: reproduced (8 console warnings across browser/visual audits); separate 12 fresh-page required-width probes had none. Existing next lint failed as documented. No live provider or production validation claimed.
