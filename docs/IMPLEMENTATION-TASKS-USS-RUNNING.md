# USS Running Implementation Plan — Frontend vs Backend

Status: Execution backlog derived from PRD + ERD
Branch policy: `main`, optional `develop`, and focused `feature/<specific-scope>` branches only.

## 1. Delivery principles
- Do not redesign existing UX flow without explicit approval.
- Keep PRs atomic and scoped to one feature/domain.
- Do not mix database migration, major visual redesign and unrelated refactor in one PR.
- Business-critical rules are enforced server-side.
- Values expected to change are stored in DB/CMS; infrastructure secrets/config use environment variables.
- Every production feature includes loading, success, empty and error states.
- Every DB-changing feature includes migration, indexes/constraints, authorization impact and rollback/forward-fix notes.

## 2. Recommended execution order
1. Identity/auth + schema foundation
2. Member profile + member card
3. CMS persistence + media
4. Stories + site content
5. Events
6. Registration + capacity
7. Event pass + check-in
8. Partners/gallery
9. Audit/admin controls
10. analytics/notifications/growth enhancements

---

# FRONTEND TRACK

## FE-01 — Design-system cleanup and application shell
Scope:
- Inventory existing reusable components.
- Normalize spacing, typography hierarchy, controls, cards, modal/toast patterns.
- Create reusable Button, Input, Select, Textarea, Field, FormError, Loading/Skeleton, EmptyState, Dialog and Toast patterns where not already present.
- Preserve existing visual identity and motion direction.
- Confirm mobile-first breakpoints and remove overflow-x regressions.

Acceptance criteria:
- No field error causes disruptive form layout jumping.
- Interactive controls expose hover/focus/disabled/loading states.
- Keyboard focus is visible.
- Home/login/dashboard/admin shells remain responsive at small phone height and width.

Dependencies: none.

## FE-02 — Production auth screens
Scope:
- Connect login/signup/forgot-password UI to authenticated backend contract.
- Remove demo-role assumptions from production path.
- Keep left visual panel static where designed and form area independently scrollable on short screens.
- Add validation and server-error mapping.

Acceptance criteria:
- Invalid credentials, duplicate signup, session expiry and network errors have clear states.
- Submit cannot double-fire while loading.
- Public signup has no role selector.

Depends on: BE-02.

## FE-03 — Member dashboard
Scope:
- Dashboard overview.
- Profile edit form.
- Member card/barcode view.
- Event registrations list.
- Event pass detail.
- Account/privacy settings.

Acceptance criteria:
- Member sees only own records.
- Barcode scales without clipping.
- Profile save is optimistic only when safe; otherwise show controlled loading state.

Depends on: BE-02, BE-03.

## FE-04 — Public Stories
Scope:
- Story listing.
- Category/tag filters where approved.
- Story detail.
- Featured story blocks.
- SEO metadata binding.
- Empty/loading states.

Depends on: BE-05.

## FE-05 — Admin Stories CMS
Scope:
- Story table/list with filters.
- Create/edit form.
- Draft/scheduled/publish/archive actions.
- Cover-media selection.
- Preview.
- SEO fields.

Acceptance criteria:
- Unsaved-change warning.
- Slug conflicts rendered inline.
- Publish action has confirmation feedback.

Depends on: BE-05, BE-04.

## FE-06 — Dynamic site-content CMS
Scope:
- Hero content editor.
- Desktop/mobile background selection.
- Focal point and overlay controls.
- Login visual configuration.
- Footer/social/navigation content modules according to approved IA.
- Draft vs published preview.

Acceptance criteria:
- No raw code editing required for routine content.
- Preview clearly distinguishes draft from published state.

Depends on: BE-04.

## FE-07 — Media library and Gallery CMS
Scope:
- Media uploader.
- Progress/loading/errors.
- Alt text/caption editor.
- Media picker reusable by stories/events/partners/site content.
- Gallery ordering/visibility UI.

Acceptance criteria:
- Client validates obvious file issues but server remains authoritative.
- Upload failure can retry without losing unrelated form state.

Depends on: BE-04.

## FE-08 — Public Events
Scope:
- Event list/detail.
- Registration status CTA.
- Registration window/capacity messaging from server response.
- Members-only/private event handling.

Depends on: BE-06, BE-07.

## FE-09 — Event registration flow
Scope:
- Dynamic registration fields from event schema.
- Validation.
- Confirm/submit states.
- Confirmed/waitlisted/rejected/cancelled views.
- Member registration history.

Acceptance criteria:
- UI never promises a slot before server confirmation.
- Double click/retry does not create duplicate registration.

Depends on: BE-07.

## FE-10 — Admin Events CMS
Scope:
- Event create/edit.
- Registration timing.
- Capacity/waitlist.
- Custom fields builder.
- Eligibility controls.
- Check-in window.
- Status/visibility.

Depends on: BE-06.

## FE-11 — Event-pass UI
Scope:
- Member event pass page.
- QR/barcode visual.
- Event metadata.
- Status: active/revoked/expired.
- Safe print/download presentation if needed.

Depends on: BE-08.

## FE-12 — Check-in scanner operations
Scope:
- Camera/manual-token entry according to browser capabilities.
- Success, duplicate, invalid, wrong-event and revoked-pass responses.
- Recent scans list.
- Staff identity/permission-aware shell.

Acceptance criteria:
- Duplicate scans are clearly non-destructive.
- Scanner cannot access unrelated admin modules without permission.

Depends on: BE-08.

## FE-13 — Users and roles admin
Scope:
- User list/filter.
- Account status.
- Role display and authorized role-change dialog.
- Member detail summary.

Acceptance criteria:
- Member cannot access this route.
- Admin capability matches backend policy; UI does not imply permission it lacks.

Depends on: BE-09.

## FE-14 — Partners / portfolio CMS
Scope:
- Partner CRUD UI.
- Logo media picker.
- Sort order/visibility/date window.
- Event association if enabled.
- Public responsive partner logo grid.

Depends on: BE-10.

## FE-15 — Audit log viewer
Scope:
- Search/filter by actor/action/entity/time.
- Read-only event detail.
- Safe JSON change-summary presentation.

Depends on: BE-09.

---

# BACKEND TRACK

## BE-01 — Database foundation and migrations
Scope:
- Configure Neon connection strictly server-side.
- Create migration convention.
- Implement base tables and reference data from ERD.
- Add primary/foreign keys, unique constraints and indexes.
- Add safe DB access layer/repository conventions.

Acceptance criteria:
- Build does not expose DB credential to client.
- Migrations are forward-only/versioned.
- Production schema can be created from empty database deterministically.

## BE-02 — Authentication + account provisioning
Scope:
- Production auth provider integration.
- Session helper/middleware/server guards.
- Transactional account bootstrap.
- Server-issued UUID/member ID/barcode.
- Default `member` role.
- Login/signup/logout/recovery contract.

Security:
- No role accepted from public signup payload.
- No client session claim is trusted without provider/server verification.

Depends on: BE-01.

## BE-03 — Member profile service
Scope:
- Own-profile read/update.
- Field-level validation.
- Immutable member identity enforcement.
- Account status enforcement.
- Member-card data endpoint/server query.

Depends on: BE-02.

## BE-04 — Media + CMS core
Scope:
- Object storage abstraction/config.
- Signed upload or server upload flow.
- Media metadata persistence.
- Site-content draft/revision/publish service.
- Gallery persistence.
- Authorization + audit hooks.

Depends on: BE-01, BE-02.

## BE-05 — Stories service
Scope:
- Story CRUD.
- Categories/tags.
- Slug uniqueness.
- Draft/scheduled/published/archive rules.
- Public query only returns publishable content.
- SEO fields.
- Audit changes.

Depends on: BE-01, BE-02, BE-04.

## BE-06 — Events service
Scope:
- Event CRUD.
- Status/visibility/timing validation.
- Dynamic event custom fields.
- Eligibility configuration.
- Public/member/admin queries.
- Audit changes.

Depends on: BE-01, BE-02, BE-04.

## BE-07 — Registration engine
Scope:
- Eligibility validation.
- Registration-window validation.
- Duplicate prevention.
- Transactional capacity handling.
- Confirmed/waitlisted/rejected flow.
- Cancel flow.
- Registration field-value validation.
- Admin listing/export contract.

Critical tests:
- simultaneous final-slot attempts
- repeated submits
- registration after close
- suspended account
- duplicate member/event
- capacity null/unlimited case if supported

Depends on: BE-06, BE-03.

## BE-08 — Event passes + check-in
Scope:
- Opaque pass-token issue/rotation/revoke.
- Hash/token lookup design.
- Check-in endpoint/action.
- Validate pass/event/registration/check-in window/status.
- Idempotent duplicate handling.
- Check-in audit/operational data.

Security:
- Permanent account barcode is not accepted as proof of event registration unless an explicit secure lookup flow is later approved.
- Rate-limit scan validation endpoint appropriately.

Depends on: BE-07.

## BE-09 — RBAC + account admin + audit log
Scope:
- Central authorization helper.
- Super-admin role mutation.
- Account suspend/reactivate.
- Audit-log service.
- Admin-readable paginated audit query.
- Prevent self-escalation and forbidden role changes.

Depends on: BE-02.

## BE-10 — Partners service
Scope:
- Partner records.
- Logo/media relation.
- visibility/date-window/order.
- Optional event partnership relation.
- Public query and admin CRUD.

Depends on: BE-04.

## BE-11 — Dynamic settings/configuration
Scope:
- Define which operational values belong in environment vs DB configuration.
- Build validated settings service for admin-editable values.
- Avoid direct arbitrary key/value use from client.
- Add cache/invalidation strategy for public settings.

Examples:
- public social links: DB
- homepage content: CMS DB
- provider credentials: env
- upload max limit: env or centrally validated deployment config
- event capacity: event DB record

Depends on: BE-01, BE-09.

## BE-12 — Analytics event contract
Scope:
- Define safe event schema.
- Instrument server-confirmed conversions separately from client click events.
- Prevent sensitive fields from entering analytics payloads.

Depends on core features.

## BE-13 — Notification abstraction
Scope:
- Domain trigger interface.
- Provider-neutral delivery record model when activated.
- Email/provider credentials in env.
- Registration confirmation/cancellation hooks.

Do not activate a vendor implementation until required.

---

# FULL-STACK INTEGRATION TASKS

## FS-01 — Route protection matrix
Deliverable:
- Route/action matrix documenting Visitor vs Member vs Admin vs Super Admin access.
- Automated authorization tests for protected backend actions.

## FS-02 — API/domain contract
For each feature define:
- request schema
- response schema
- validation errors
- authorization errors
- idempotency behavior
- pagination/filter contract

Prefer server actions for tightly coupled Next.js mutations where suitable; use explicit API routes where scanner/external integration or clearer HTTP contract is beneficial.

## FS-03 — Error taxonomy
Recommended stable error codes:
- `UNAUTHENTICATED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `REGISTRATION_CLOSED`
- `EVENT_FULL`
- `ALREADY_REGISTERED`
- `PASS_INVALID`
- `PASS_REVOKED`
- `ALREADY_CHECKED_IN`

UI maps stable error codes to human-readable copy. Do not parse backend exception strings in components.

## FS-04 — Testing baseline
Minimum:
- unit tests for domain validation/helpers
- integration tests for registration capacity and role enforcement
- component/form tests on critical forms
- E2E smoke: signup/login, member profile, admin publish, event registration, pass/check-in

## FS-05 — Observability
- Structured server logs.
- Request/correlation ID where useful.
- No secret/token/PII logging.
- Error monitoring configured through env.

---

# FEATURE BRANCH / PR PLAN

Suggested atomic branches:
1. `feature/db-foundation`
2. `feature/auth-accounts`
3. `feature/member-profile-card`
4. `feature/media-cms-core`
5. `feature/stories-cms`
6. `feature/events-core`
7. `feature/event-registration`
8. `feature/event-pass-checkin`
9. `feature/admin-rbac-audit`
10. `feature/partners-gallery`

Avoid junk branches such as `feature/test`, `fix2`, `branch-new`.

PR requirements:
- one functional context per PR
- migration notes when applicable
- screenshots for visible UI change
- validation/security notes for data mutation
- regression impact notes
- build/type/test result

---

# RELEASE GATES / FIVE-STAGE AUDIT

## 1. Edge-case & anti-hotfix audit
- extreme/empty/duplicate inputs
- repeat submit
- stale state
- network failure
- concurrent final-slot registration
- expired/revoked pass
- duplicate scan

## 2. UI/UX audit
- mobile widths and short viewport heights
- form error stability
- no text clipping
- no unintended horizontal scrolling
- loading/empty/error/success states
- reduced motion behavior

## 3. Security & performance audit
- server authorization
- input validation/sanitization
- parameterized DB access
- secret exposure check
- rate limits where needed
- N+1 query check
- indexes for operational queries

## 4. Git & branch cleanup audit
After a feature is merged:
```bash
git checkout main
git pull --ff-only origin main
git branch --merged main
git branch -d feature/<merged-feature>
git push origin --delete feature/<merged-feature>
git fetch --prune
```
Do not delete a branch until its changes are merged and no follow-up work depends on it.

## 5. Code-quality audit
- remove console/debug statements
- remove dead code
- consistent naming
- no duplicate business rules between UI/backend
- docs/contracts updated
- TypeScript/build/lint/tests passing according to configured scripts

---

# IMMEDIATE NEXT EXECUTION PACKAGE
The first production implementation package should be:

### Backend
- BE-01 Database foundation
- BE-02 Auth + account provisioning
- BE-09 RBAC base/audit base

### Frontend
- FE-01 Design-system/shell guardrails only, no redesign
- FE-02 Production auth screens
- FE-03 Member dashboard skeleton/profile/member card after backend contract is stable

Reason:
This establishes trusted identity and authorization before enabling CMS/event writes, reducing future rework and privilege/security hotfix risk.

Before starting this package, configure Neon/auth/storage production resources and environment variables without committing credentials.
