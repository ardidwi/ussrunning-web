# Product Requirements Document — USS Running Web

Status: Product architecture baseline
Target: Production-ready community platform
Primary stack: Next.js App Router, React, TypeScript, Neon/Postgres

## 1. Product vision
USS Running Web is the digital home for the USS Running community. The product must support public storytelling and community discovery, free member identity, event participation, member barcode identity, event-specific passes, and a CMS for admins without requiring source-code edits for routine content operations.

The website must preserve the existing visual direction while moving operational content and business rules from local demo state into authenticated, server-authorized, database-backed workflows.

## 2. Product goals
1. Make public content easy to discover: homepage, About, Stories, Events/Runs, Partners, Gallery and membership information.
2. Provide free member registration with permanent member identity and barcode.
3. Provide secure authentication and role-based access for super_admin, admin and member.
4. Allow non-technical admins to manage content, media, events, stories and selected site settings.
5. Support event registration, event-specific pass/barcode and staff check-in.
6. Keep operational configuration dynamic in database or environment configuration, not embedded in UI logic.
7. Provide a stable foundation for future membership benefits, commerce, partnerships and integrations.

## 3. Non-goals for initial production release
- Paid subscription billing.
- Marketplace/e-commerce checkout.
- Full social network/feed with user-to-user messaging.
- Native mobile application.
- Complex loyalty points system.
These can be added later without redesigning the core account/event/content model.

## 4. Personas and roles
### Visitor
Can browse public content, stories, events, partner information and membership entry points.

### Member
Can authenticate, manage own profile, view member ID/barcode, register for eligible events, view event passes, view own registration/check-in history and manage privacy/communication preferences.

### Admin
Can manage authorized CMS modules: stories, events, media/gallery, partners, site content, registrations and check-in operations according to permissions. Admin cannot grant super_admin privileges unless explicitly allowed by policy.

### Super Admin
Has global administrative access including role management, configuration, audit review and account-level administrative actions.

## 5. Information architecture
### Public
- `/` Home
- `/about`
- `/stories`
- `/stories/[slug]`
- `/events` or current run/event public route
- `/events/[slug]`
- `/partners`
- `/membership`
- `/join`
- `/login`
- `/privacy`

### Member area
- `/dashboard`
- `/dashboard/profile`
- `/dashboard/member-card`
- `/dashboard/events`
- `/dashboard/registrations/[id]`
- `/dashboard/settings`

### CMS / operations
- `/admin`
- `/admin/site-content`
- `/admin/stories`
- `/admin/events`
- `/admin/registrations`
- `/admin/check-in`
- `/admin/gallery`
- `/admin/media`
- `/admin/partners`
- `/admin/users`
- `/admin/settings`
- `/admin/audit-log`

## 6. Core functional requirements

### 6.1 Authentication and account lifecycle
- Support signup, login, logout and password recovery through the selected production auth provider.
- Public signup always creates a `member` role.
- Account creation must generate permanent UUID, human-facing member ID and account barcode server-side.
- Email/identity uniqueness must be enforced at persistence level.
- Elevated roles can only be assigned through server-authorized admin action.
- Suspended/deactivated users cannot access protected features.
- Session validation must occur server-side for protected routes/actions.

Acceptance criteria:
- A new user can register and reach dashboard without an admin manually creating the profile.
- A member cannot modify role data from browser payloads.
- A deactivated account loses protected access immediately or on session refresh according to auth provider semantics.

### 6.2 Member profile and permanent identity
Member profile should support configurable fields such as:
- full name
- display name
- date of birth (optional policy-controlled)
- gender selection if business needs require it
- phone
- city
- emergency contact
- social handle
- jersey size
- running interest/preferences
- profile image
- communication consent

Rules:
- Member ID is immutable after issuance.
- Account barcode is an identifier only, never an authorization secret.
- Sensitive fields must not be embedded in barcode contents.
- Member can edit only fields allowed by server policy.

### 6.3 Member card
- Shows display name, permanent member ID and scannable account barcode.
- Supports safe download/export representation.
- Barcode rendering must preserve quiet zone and scan reliability across supported mobile widths.
- Do not use account barcode as direct event attendance proof.

### 6.4 Stories/editorial CMS
- CRUD stories with draft, scheduled, published and archived states.
- Slug uniqueness enforced by DB.
- Fields: title, slug, excerpt, body/content blocks, category, tags, cover media, author, featured flag, SEO metadata, publish_at, published_at.
- Admin preview before publish.
- Scheduled publishing supported by server-side job/cron mechanism later if infrastructure is enabled.
- Public story only visible when publication conditions pass.

### 6.5 Dynamic site content
Admin should manage content that is expected to change without code deployment, including:
- hero headline and description
- hero desktop/mobile media
- focal point / overlay
- login background
- footer text/links
- navigation visibility/order where approved
- social links
- homepage sections
- featured story/event selections
- CTA labels/targets

Content changes use draft/published workflow where appropriate.

### 6.6 Media library and gallery
- Upload media through server-authorized workflow.
- Binary media stored in dedicated object storage; database stores metadata and references.
- Fields: file key, URL, mime type, dimensions, alt text, caption, owner/uploader, visibility, created_at.
- Gallery items can be ordered, hidden/published and optionally linked to event/story.
- Validate file type/size server-side.

### 6.7 Events / runs
Event fields should include:
- title, slug, summary, description
- start/end datetime
- timezone
- venue/location
- map/external links
- cover media
- registration open/close datetime
- capacity
- waitlist policy
- eligibility settings
- visibility/status
- optional custom registration fields
- check-in enablement/window

Event statuses should be data/config driven and validated server-side, not duplicated as UI-only hardcoded business rules.

### 6.8 Event registration
- Authenticated member can register when event is open and eligible.
- Unique constraint prevents duplicate active registration for same member/event.
- Capacity must be enforced transactionally to prevent oversubscription under concurrent requests.
- Registration statuses may include pending, confirmed, waitlisted, cancelled and rejected through controlled values.
- Admin can view/filter/export registrations.
- Member can view own status.

### 6.9 Event pass and barcode
- Confirmed registration can receive an event-specific opaque pass token.
- Pass/barcode must not expose personal information.
- Pass token is separate from account barcode.
- Token can be rotated/revoked if needed.
- Event pass resolves to registration server-side.

### 6.10 Check-in
- Staff/admin scanner resolves event pass through protected API.
- Check-in must verify event, registration status, token validity and duplicate check-in state.
- Record actor, timestamp and optional device/checkpoint metadata.
- Duplicate scan returns existing state instead of creating duplicate attendance rows.
- Offline mode is optional future enhancement; if added it must use signed payload/queue reconciliation.

### 6.11 Partners / brand portfolio
- Admin-manageable partner/brand records.
- Fields: name, logo, destination URL, description, display order, active period, visibility.
- Frontend should render responsive logo grid without manual code edits per brand.

### 6.12 Role and permission management
- Role names: super_admin, admin, member.
- Permissions enforced by server policy for every protected mutation/read.
- Client-side menu hiding is UX only, not security.
- Super admin role changes create audit entries.
- Future granular permissions should be possible without changing core account IDs.

### 6.13 Audit logging
Capture material admin actions such as:
- role changes
- content publish/unpublish
- event configuration change
- registration override
- check-in override
- account suspend/reactivate

Audit entries should contain actor, action, entity type/id, timestamp and a safe change summary. Never store secrets in audit payloads.

### 6.14 Notifications
Initial design should allow future notification channels without coupling business logic to one provider.
Potential triggers:
- registration confirmed/cancelled
- event reminder
- password/account messages through auth provider
- editorial/newsletter opt-in

Provider endpoints and keys belong in environment configuration.

## 7. UX and UI requirements
- Mobile-first responsive behavior.
- No unintended horizontal overflow.
- Forms have labels, helper text and reserved error-space to avoid layout jumps.
- Real-time validation on blur/change for user-correctable fields plus authoritative server validation.
- Buttons expose disabled/loading states during mutations.
- Skeleton/spinner for async reads.
- Toast/dialog feedback for success, warning and errors.
- Empty states and retry states are mandatory for admin lists and member registration views.
- Text must wrap safely and never be clipped unintentionally.
- Login layout preserves fixed visual panel where designed while the form region can scroll independently on smaller heights.
- Motion must degrade gracefully for reduced-motion preference and lower-capability devices.

## 8. Security requirements
- Server-side authorization for every protected action.
- Validate and sanitize all external input.
- Parameterized SQL only through approved DB access layer.
- CSRF-safe action patterns according to auth/framework implementation.
- Rate limit sensitive endpoints: auth-adjacent actions, registration, pass validation/check-in.
- Never expose database credentials or private keys to client bundles.
- Use least-privilege DB credentials and separate production environment variables.
- Avoid storing raw secrets/tokens when hashed/opaque lookup design is sufficient.
- Media uploads require MIME/type and size validation.
- Audit privileged operations.

## 9. Performance and scalability
- Prefer server rendering/caching for public editorial content.
- Paginate admin/member lists.
- Add indexes for high-cardinality lookups: account email/provider ID, member ID, story slug, event slug, registration event/member, pass token hash, check-in registration.
- Avoid N+1 queries by joining/preloading intentional relationships.
- Store binary assets outside Postgres.
- Use idempotent server actions for operations vulnerable to repeat submit.
- Capacity-sensitive registration writes must use transactions/locking or equivalent safe concurrency pattern.

## 10. Analytics and product metrics
Recommended event taxonomy:
- public_page_view
- membership_cta_click
- signup_started / signup_completed
- login_completed
- story_view
- event_view
- registration_started / registration_completed / registration_cancelled
- member_card_view
- event_pass_view
- check_in_success / check_in_duplicate / check_in_failed

Do not send sensitive profile fields to analytics.

Primary metrics:
- visitor-to-member conversion
- monthly active authenticated members
- event registration conversion
- attendance/check-in rate
- story engagement
- repeat event participation

## 11. Configuration policy
Must not be hardcoded in business logic:
- external service URLs
- secrets/API keys
- upload limits
- registration default limits
- role permission configuration if/when made configurable
- operational status labels intended for admin control
- social destinations and editable site copy

Use environment variables for secrets/infrastructure config and database-backed CMS/settings for user-driven values.

## 12. Release phases
### Phase 0 — Documentation and contracts
PRD, ERD, API/domain contracts, migration plan and task split.

### Phase 1 — Production identity foundation
Neon schema, auth integration, accounts/profiles, RBAC, member card, audit base.

### Phase 2 — Production CMS
Site content, stories, media/gallery, partners.

### Phase 3 — Events
Events, registration, capacity safety, event pass, admin registration view.

### Phase 4 — Operations
Check-in scanner, operational dashboard, exports, audit review.

### Phase 5 — Growth
Notifications, scheduling, analytics enrichment, partner campaigns, optional benefits/commerce modules.

## 13. Definition of done
A production feature is done only when:
- frontend and backend validation exist where relevant
- authorization is enforced server-side
- error/loading/empty states are implemented
- responsive behavior is verified
- data migration/schema is versioned
- no secrets/hardcoded environment-specific values are committed
- build/type checks pass
- critical path tests pass
- regression impact is reviewed
- documentation/API contract is updated when behavior changes
