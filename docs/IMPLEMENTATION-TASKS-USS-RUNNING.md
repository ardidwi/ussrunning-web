# USS Running Implementation Plan — Frontend vs Backend

Status: Execution backlog v2 derived from PRD + ERD
Branch policy: `main`, optional `develop`, and focused `feature/<specific-scope>` branches only.

## 1. Delivery principles
- Preserve the approved UX direction unless a flow change is explicitly approved.
- Every form uses label, placeholder, helper text, reserved error area and loading/disabled state.
- Password fields include Show/Hide password.
- Admin-facing fields explain what to fill in and where/why the value is used.
- Business rules are enforced server-side.
- Editable business content belongs in DB/CMS, not hardcoded UI logic.
- Every privileged mutation creates audit/change-history coverage.
- PRs remain atomic and domain-focused.

## 2. Recommended execution order
1. Database + RBAC + audit foundation
2. Auth + email verification
3. Member profile + branded member card/barcode
4. CMS core + media + revision framework
5. Stories/media-partner platform
6. Partners CRUD
7. Events CRUD + dynamic fields
8. Registration + event pass
9. Transactional event email
10. Check-in scanner
11. Analytics/notification enrichment

---

# FRONTEND TRACK

## FE-01 — Form system and design-system guardrails
Scope:
- Reusable Field wrapper with label/helper/error reservation.
- Input, Select, Textarea, Checkbox, Radio, FilePicker, DateTime and RichText wrappers.
- PasswordInput with Show/Hide control.
- Loading, disabled, success, warning and error states.
- Toast/dialog pattern.
- Responsive form sections and mobile overflow audit.

Acceptance criteria:
- Error messages do not cause layout jumping.
- Helper text is visible before validation where useful.
- Every password field can toggle visibility accessibly.
- Forms remain usable on short-height mobile screens.

## FE-02 — Signup/Login/Forgot/Reset/Verification UI
Scope:
- Signup form.
- Login form.
- Forgot/reset password.
- Email verification sent screen.
- Link/code verification success/failure screen.
- Resend verification with cooldown state.
- Unverified-login state with resend CTA.

Acceptance criteria:
- Signup has no role selector.
- Email field hint explains verification destination.
- Password requirements are visible before submit.
- Duplicate email, invalid credentials, expired verification and network errors map to stable user-facing messages.
- Submit cannot double-fire.

Depends on: BE-02, BE-03.

## FE-03 — Member dashboard/profile
Scope:
- Dashboard overview.
- Profile edit.
- Registration history.
- Account settings.
- Verification/account status display where relevant.

Depends on: BE-02, BE-04.

## FE-04 — Member card / permanent barcode
Scope:
- USS Running branded card.
- Member name, Member ID, active status.
- Permanent barcode rendering.
- USS Running logo centered in the card/barcode composition without damaging scan zones.
- Download/export view if approved.

Acceptance criteria:
- Barcode scans reliably on supported devices.
- Logo never covers required linear barcode bars or quiet zones.
- Barcode value does not expose PII.

Depends on: BE-04.

## FE-05 — CMS shell + universal editor UX
Scope:
- Admin navigation.
- Reusable CMS list/table pattern.
- Search/filter/pagination.
- Create/Edit forms.
- Save Draft/Publish/Archive actions.
- Unsaved-change warning.
- `History` tab/drawer.
- Reusable field-hint pattern explaining purpose and public placement.

Depends on: BE-05, BE-06.

## FE-06 — Stories public experience
Scope:
- Story listing.
- Editorial/media-partner article detail.
- Category/tag filtering.
- Featured Stories.
- Partner disclosure block.
- SEO/social metadata binding.

Depends on: BE-07.

## FE-07 — Stories CMS
Scope:
- CRUD Stories.
- Content type selector.
- Rich article editor/content blocks.
- Cover/social image picker.
- Category/tags.
- Partner relation.
- Disclosure/sponsored metadata.
- CTA metadata.
- Schedule/publish/archive.
- Preview.
- History view.

Acceptance criteria:
- Admin and super_admin can operate without code edits.
- Slug conflict appears inline.
- Published content is archived rather than casually hard-deleted.

Depends on: BE-05, BE-06, BE-07.

## FE-08 — Partners public + CMS
Scope:
- Responsive public partner logo grid.
- Partner detail metadata when enabled.
- CRUD form: name/logo/links/description/type/dates/visibility/order/featured.
- Event and Story relations.
- Archive/restore.
- Change history.

Depends on: BE-05, BE-08.

## FE-09 — Dynamic site-content CMS
Scope:
- Homepage hero/content.
- About content where approved.
- Login background/visual.
- Footer/social links.
- Navigation content/settings where approved.
- Featured Story/Event selection.
- Draft vs published preview.
- Change history.

Depends on: BE-05, BE-06.

## FE-10 — Media library
Scope:
- Upload progress.
- Retry/failure state.
- Alt text/caption editor.
- Media picker reusable by Stories, Events, Partners and site content.
- Gallery ordering/visibility.

Depends on: BE-05.

## FE-11 — Public Events
Scope:
- Event list.
- Event detail.
- Date/time/venue/meeting point.
- Registration status CTA.
- Partner display.
- Dynamic eligibility/window messaging.

Depends on: BE-09.

## FE-12 — Events CMS
Scope:
- Create/edit/duplicate Event.
- Date/time/timezone.
- Venue/map/meeting point.
- Registration open/close.
- Capacity/waitlist.
- Visibility/status.
- Partner relation.
- Dynamic registration-field builder with label/helper/validation/order.
- Check-in window.
- Confirmation-email override fields where enabled.
- Change history.

Critical acceptance criteria:
- Duplicating an Event visually creates a new event identity and does not imply historical registration reuse.
- All configurable fields have helper text.

Depends on: BE-06, BE-09.

## FE-13 — Event registration flow
Scope:
- Render server-defined custom fields.
- Helper hints for each field.
- Validation.
- Submit confirmation/loading.
- Confirmed/waitlisted/rejected/cancelled states.
- Dashboard registration detail.

Acceptance criteria:
- UI never guarantees a slot before server confirmation.
- Retry/double-click does not duplicate registration.

Depends on: BE-10.

## FE-14 — Event confirmation + pass
Scope:
- Confirmation success page.
- Event details.
- Registration status.
- Event-specific QR/barcode/pass.
- Email-sent status message where available.
- Pass in member dashboard.

Depends on: BE-10, BE-11.

## FE-15 — Check-in scanner
Scope:
- Camera/manual token input.
- Success/duplicate/invalid/wrong-event/revoked states.
- Recent scans.
- Staff permission-aware shell.

Depends on: BE-12.

## FE-16 — Users/RBAC/Audit viewer
Scope:
- User list/filter.
- Account status.
- Role management UI where authorized.
- Read-only audit/change-history explorer.

Depends on: BE-06.

---

# BACKEND TRACK

## BE-01 — Database foundation
Scope:
- Neon server-only connection.
- Migration convention.
- Base schema from ERD.
- Constraints/indexes.
- Repository/data-access conventions.

## BE-02 — Authentication and account provisioning
Scope:
- Production auth provider integration.
- Signup/login/logout/recovery contract.
- Session guards.
- Provision account/member profile/member role.
- Generate immutable member ID and barcode server-side.
- New account starts `pending_verification`.

Security:
- Public signup cannot submit elevated role.
- No client role authority.

Depends on: BE-01.

## BE-03 — Email verification service
Scope:
- Generate one-time verification token/link and optional code.
- Hash token/code at rest.
- Expiry/consume/invalidate logic.
- Verification completion transaction.
- Resend flow with cooldown/rate limit.
- Mark `email_verified_at` and activate account.
- Unverified-login response contract.

Depends on: BE-02, BE-13 notification core.

## BE-04 — Member profile + member identity service
Scope:
- Own-profile read/update.
- Immutable Member ID/barcode enforcement.
- Account-status enforcement.
- Member-card data contract.
- No PII in barcode payload.

Depends on: BE-02.

## BE-05 — Media + CMS core
Scope:
- Object storage abstraction.
- Authorized upload flow.
- Media metadata.
- Generic CMS repository/service patterns.
- Draft/publish/archive primitives.
- Reusable validation helpers.

Depends on: BE-01, BE-02.

## BE-06 — RBAC + universal audit/revision foundation
Scope:
- Central authorization helper.
- Audit-log service.
- Reusable revision snapshot writer.
- Read-only history queries.
- Account suspend/reactivate.
- Restricted role mutation.

Rules:
- No passwords/tokens/secrets in audit snapshots.
- History is append-only.

Depends on: BE-02.

## BE-07 — Stories/editorial service
Scope:
- Story CRUD.
- Content types.
- Categories/tags.
- Slug uniqueness.
- Rich body JSON validation.
- Media partner relation.
- Disclosure/CTA metadata.
- Draft/scheduled/published/archive rules.
- Story revisions/history.
- Public query only returns publishable content.

Depends on: BE-05, BE-06.

## BE-08 — Partners service
Scope:
- Partner CRUD.
- Logo/media relation.
- Website/social/campaign links.
- Visibility/date/order/featured.
- Story/Event relations.
- Archive/restore.
- Revision history.

Depends on: BE-05, BE-06.

## BE-09 — Events service
Scope:
- Event CRUD.
- New UUID per Event.
- Event duplicate/clone service that excludes registrations/passes/check-ins.
- Timing/status/visibility rules.
- Custom registration fields including helper_text/validation config.
- Partner relation.
- Event revisions/history.
- Public/member/admin queries.

Depends on: BE-05, BE-06, BE-08.

## BE-10 — Registration engine
Scope:
- Verified/active-account requirement.
- Eligibility validation.
- Registration-window validation.
- Dynamic field validation.
- Duplicate prevention.
- Transactional capacity handling.
- Confirmed/waitlisted/rejected/cancel flow.
- Idempotent repeated submit.
- Event-pass issuance when confirmed.
- Durable confirmation notification job/delivery creation.

Critical tests:
- simultaneous final-slot requests
- repeated submits
- registration after close
- unverified account
- suspended account
- duplicate member/event
- event duplication isolation

Depends on: BE-04, BE-09, BE-13.

## BE-11 — Event pass service
Scope:
- Opaque event-specific token.
- Hash lookup.
- Rotation/revoke.
- Pass data contract.
- No PII in token.

Depends on: BE-10.

## BE-12 — Check-in service
Scope:
- Resolve event pass.
- Validate event, registration and check-in window/status.
- Idempotent duplicate handling.
- Audit operational action.
- Scanner rate limiting.

Depends on: BE-11.

## BE-13 — Notification/email core
Scope:
- Provider-neutral notification service.
- Resend adapter as initial implementation when credentials/domain are configured.
- Notification template repository.
- Delivery-log table/service.
- Official no-reply sender from environment/config.
- Retry transient failures.
- Store provider message ID/status.
- Webhook status update when enabled.

Initial templates:
- account verification
- resend verification
- password reset when product-managed
- event registration confirmed
- event waitlisted
- event cancelled

Critical rule:
- A successful account/event DB transaction must not be rolled back just because the external email provider fails after commit.

## BE-14 — Dynamic site-content service
Scope:
- Homepage/About/login/footer/navigation-backed CMS sections.
- Draft/publish revisions.
- Cache invalidation.
- Audit/history.

Depends on: BE-05, BE-06.

## BE-15 — Analytics contract
Scope:
- Safe product-event schema.
- Verification, Story, Partner, Event and registration metrics.
- No sensitive member data in analytics payload.

---

# FULL-STACK CONTRACTS

## FS-01 — Route/access matrix
Document Visitor vs Member vs Admin vs Super Admin access for every protected route/action.

## FS-02 — Stable error taxonomy
Recommended error codes:
- `UNAUTHENTICATED`
- `EMAIL_NOT_VERIFIED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `CONFLICT`
- `VERIFICATION_EXPIRED`
- `VERIFICATION_INVALID`
- `VERIFICATION_RATE_LIMITED`
- `REGISTRATION_CLOSED`
- `EVENT_FULL`
- `ALREADY_REGISTERED`
- `PASS_INVALID`
- `PASS_REVOKED`
- `ALREADY_CHECKED_IN`

Frontend maps codes to human-readable text. Components must not parse backend exception strings.

## FS-03 — Email template contract
Every template defines:
- stable key
- required variables
- optional variables
- subject
- HTML/text body strategy
- preview/testing route for admins later if approved
- fallback behavior for missing variables

## FS-04 — Testing baseline
Minimum automated coverage:
- signup + verification
- expired/reused verification token
- login blocked when unverified
- member identity immutability
- CMS permission checks
- revision/history creation
- Story media-partner relation
- Partner CRUD/archive
- event clone identity isolation
- final-slot concurrency
- repeated registration submit
- event email job creation
- pass/check-in validation

## FS-05 — Observability
- structured logs
- correlation/request ID
- provider/email errors without leaking recipient content unnecessarily
- no token/secret logging
- production error monitoring through environment config

---

# BRANCH / PR PLAN
Suggested atomic branches:
1. `feature/db-foundation`
2. `feature/auth-accounts`
3. `feature/email-verification`
4. `feature/member-profile-card`
5. `feature/cms-revision-core`
6. `feature/stories-media-platform`
7. `feature/partners-crud`
8. `feature/events-core`
9. `feature/event-registration`
10. `feature/transactional-email`
11. `feature/event-pass-checkin`

After merge:
```bash
git checkout main
git pull --ff-only origin main
git branch --merged main
git branch -d feature/<merged-feature>
git push origin --delete feature/<merged-feature>
git fetch --prune
```

---

# FIVE-STAGE AUDIT
## 1. Edge-case & anti-hotfix
- duplicate/empty/extreme input
- verification expiry/reuse/resend spam
- provider email failure
- duplicate CMS submit
- concurrent final event slot
- event clone isolation
- duplicate scan

## 2. UI/UX
- helper/hint consistency
- password Show/Hide
- stable error layout
- mobile width/height
- no overflow-x
- no clipped text
- loading/success/error/empty states

## 3. Security/performance
- server RBAC
- token hashing
- rate limits
- SQL parameterization
- secret exposure audit
- MIME/size checks
- N+1/index review

## 4. Git cleanup
- focused branch/PR
- merged-branch deletion
- prune stale refs
- no junk branches

## 5. Code quality
- no debug console output
- no dead code
- consistent naming
- no duplicated business rules
- docs/contracts/migrations aligned
- build/type/test checks pass

---

# IMMEDIATE NEXT EXECUTION PACKAGE
Backend:
- BE-01 Database foundation
- BE-02 Authentication/account provisioning
- BE-06 RBAC + audit/revision base
- BE-13 Notification core skeleton
- BE-03 Email verification

Frontend:
- FE-01 Form system
- FE-02 Signup/Login/Verification UI
- FE-03 Member dashboard skeleton
- FE-04 Member card after identity contract stabilizes

This order establishes trusted identity, verification and reusable audit/revision foundations before turning on admin CMS writes and event registrations.
