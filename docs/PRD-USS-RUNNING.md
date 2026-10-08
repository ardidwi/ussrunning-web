# Product Requirements Document — USS Running Web

Status: Product architecture baseline v2
Target: Production-ready community, media, partnership and event platform
Primary stack: Next.js App Router, React, TypeScript, Neon/Postgres

## 1. Product vision
USS Running Web is the digital home of USS Running and must operate as four connected products:
1. Community platform for members.
2. Media/editorial platform for Stories and media-partner content.
3. Event platform for recurring and one-off runs/events.
4. Partnership portfolio for brands that have collaborated with USS Running.

Routine operations must be possible from the CMS without source-code edits. Admin and super_admin users manage content through structured forms with labels, field hints, validation, preview, version history and audit history.

## 2. Product goals
- Provide polished public pages for USS Running, Stories, Events, Partners and membership.
- Provide free account registration and secure authentication.
- Require email verification before a member identity becomes fully active.
- Issue a permanent USS Member ID and member barcode for every verified member.
- Render the member barcode/card with USS Running branding and centered USS Running logo while preserving scan reliability.
- Allow admins and super admins to CRUD Stories, Events, Partners, media and editable site content.
- Maintain change history for material CMS changes.
- Support dynamic events with their own identity, dates, registration windows, capacity, form fields and event-specific passes.
- Automatically send transactional emails for account verification and event registration confirmation.
- Keep all editable business content in CMS/database and all secrets/provider credentials in environment variables.

## 3. Personas and roles
### Visitor
Can browse public pages, Stories, Events, Partners and membership information.

### Member
Can log in after verification, manage profile, view member ID/barcode, register for events, receive event passes, and view own registration history.

### Admin
Can manage Stories, site content, events, registrations, gallery/media and Partners according to backend permissions. Admin can view change history for the modules they can manage.

### Super Admin
Has global access, including role management, account controls, global settings, audit history and all admin CRUD modules.

## 4. Product modules
Public routes:
- `/`
- `/about`
- `/stories`
- `/stories/[slug]`
- `/events`
- `/events/[slug]`
- `/partners`
- `/membership`
- `/join`
- `/login`
- `/privacy`

Member routes:
- `/dashboard`
- `/dashboard/profile`
- `/dashboard/member-card`
- `/dashboard/events`
- `/dashboard/registrations/[id]`
- `/dashboard/settings`

Admin routes:
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

## 5. Form design standard
All production forms, public/member/admin, must use the same form contract.

Each field must have:
- visible label
- optional required marker
- placeholder that shows the expected format, never replacing the label
- helper/hint text explaining what should be entered and why it is needed
- reserved validation/error area so the layout does not jump
- clear focus state
- disabled/loading state where applicable
- validation on blur/change for user-correctable errors
- server-side validation as the source of truth

Password fields must include:
- show/hide password control
- password requirement hint before submit
- clear mismatch/strength feedback where applicable
- accessible button label such as Show password / Hide password

Examples:
- Email hint: `Use an active email. We will send your verification link here.`
- Password hint: `Minimum length and allowed-character rules are shown before submission.`
- Story excerpt hint: `Shown on story cards and social previews.`
- Event capacity hint: `Maximum confirmed registrations. Capacity is enforced by the server.`

## 6. Authentication and account lifecycle
Required flows:
1. Signup.
2. Email verification.
3. Login.
4. Logout.
5. Forgot password.
6. Reset password.
7. Resend verification.
8. Session expiry handling.

### Signup fields
Initial recommended fields:
- full name
- email
- password
- confirm password
- privacy-policy consent
- optional marketing/newsletter consent

Every field must use the form standard above.

### Email verification business rule
- Signup creates an account in `pending_verification` state.
- The system generates server-side account UUID, member ID and barcode identity during provisioning, but the member identity is not treated as active until verification succeeds.
- Verification is sent to the registered email using a one-time link or one-time code.
- Verification token/code has an expiration time.
- A consumed or expired token cannot be reused.
- User can request resend with rate limiting and cooldown.
- Successful verification records `email_verified_at` and activates the account according to policy.
- Login attempt for an unverified account returns a clear verification-required state and resend action.

Transactional sender should use an official USS Running no-reply address. Provider credentials and sender-domain configuration must be environment-managed. Resend can be used as the delivery provider when configured.

### Email verification UI
Verification screen should support:
- clear email destination masking
- link/code instructions
- resend button
- cooldown countdown
- success state
- expired/invalid token state
- change-email or support path if later approved

## 7. Member identity and member card
Every verified member receives:
- immutable internal account UUID
- human-readable unique Member ID
- permanent account barcode identity
- active/inactive member status

Member card must display:
- USS Running logo/brand
- member name
- member ID
- membership status
- scannable barcode
- USS Running logo visually centered in/on the barcode card design

Barcode implementation rule:
- The logo may be visually overlaid only with sufficient clear area and scan testing.
- If the chosen linear barcode standard cannot reliably support a center logo, use the logo as a centered card overlay above/between barcode zones rather than damaging encoded bars.
- Member barcode contains only opaque identity value, never email/phone/name.
- Member barcode is not a password or authorization token.
- Member ID/barcode cannot be edited by a member.

## 8. Stories: media/editorial platform
Stories are not only community blog posts. They are USS Running's editorial/media channel and can represent:
- community stories
- brand/media partner features
- event recaps
- interviews
- running culture/editorial pieces
- announcements/news
- product/campaign features

The UX should be closer to a modern media article than a simple CMS text post.

### Story fields
Required/available fields:
- content type: editorial / media_partner / community / event_recap / announcement / other configured type
- title
- slug
- excerpt
- rich article body/content blocks
- cover image
- optional gallery/media blocks
- category
- tags
- author/byline
- partner/brand relation when relevant
- disclosure/sponsored label when relevant
- CTA label and destination when relevant
- featured flag
- publish status
- publish/schedule date
- SEO title
- SEO description
- social preview image

### Media partner behavior
A media-partner Story can link to a Partner record so the article may display:
- Partner logo/name
- `In partnership with` or configured disclosure label
- campaign/brand CTA
- campaign period if needed

Disclosure labels must be editable/configurable, not hardcoded into article logic.

### Story CMS permissions
Admin and super_admin can:
- create
- read/preview
- edit
- publish/unpublish
- schedule
- archive
- restore according to policy

Destructive hard delete should be avoided for published content. Archive/soft-delete is preferred.

### Story change history
Every material change should record:
- actor
- timestamp
- previous revision
- new revision
- changed fields summary
- publish/unpublish/archive action

Admin should be able to open a read-only change-history view from the Story editor.

## 9. CMS platform requirements
All frequently changing content must be CMS-managed.

Admin and super_admin should be able to manage:
- homepage content
- About content where approved
- Stories
- Events
- Partners
- Gallery/media
- featured content
- footer/social links
- login visual/background
- selected navigation content/settings

Every CMS form requires field hints describing:
1. What to fill in.
2. Where the value appears publicly.
3. Any validation or recommended dimensions/limits.

Example:
- `Cover Image`: `Main image shown on the event page and event cards. Recommended ratio: ...`
- `Registration Opens`: `Members cannot submit registration before this time.`
- `Partner Logo`: `Displayed on the Partners page and any linked event/story.`

## 10. Universal CMS change history
Change history is mandatory for editable production entities, at minimum:
- Stories
- Events
- Partners
- Site content/settings
- role/account administrative changes
- registration/check-in overrides

History must be append-only and read-only from the normal CMS.

Recommended history UI:
- entity detail -> `History` tab/drawer
- actor
- timestamp
- action
- changed fields
- old value/new value for safe fields
- revision number where applicable

Do not store secrets, passwords, auth tokens or raw event-pass tokens in history payloads.

## 11. Partnerships / brand portfolio
Partners represents the brands/organizations that have collaborated with USS Running.

Public Partners page should support:
- responsive logo grid
- optional partner detail/description
- collaboration period
- campaign/event relation
- destination URL
- current/past filtering if desired later

CMS must support CRUD:
- create Partner
- read/preview Partner
- update Partner
- archive/hide Partner
- restore Partner
- deletion only if safe and unreferenced, otherwise archive

Partner fields:
- name
- slug
- logo
- website/Instagram/campaign URL
- short description
- collaboration type
- active from/to
- display order
- visibility
- featured flag
- linked Stories
- linked Events

## 12. Events / Event Run
Events must be fully dynamic. Adding a new run/date must never require source-code edits.

Each event has its own immutable internal ID plus editable human-facing slug/title.

Event fields:
- event title
- slug
- event type
- summary
- rich description
- cover image
- event date/start time/end time
- timezone
- venue
- address/location text
- map link
- meeting point instructions
- registration open datetime
- registration close datetime
- capacity
- waitlist setting
- member/public eligibility
- custom registration questions
- check-in enabled/window
- event status
- public visibility
- linked Partners
- terms/notes
- confirmation-email content override if needed

### Event lifecycle
Recommended lifecycle:
- draft
- published/upcoming
- registration_open
- registration_closed
- ongoing if later needed
- completed
- cancelled
- archived

Business state is backend-controlled, not inferred only from frontend copy.

### Event identity
Every new Event gets:
- unique UUID
- unique slug
- event metadata
- independent registrations
- independent passes/barcodes
- independent check-ins
- independent email confirmations
- independent partners/gallery/content associations

Copying/duplicating an old event should create a new identity, never reuse prior registration/pass records.

## 13. Event registration
Only eligible authenticated members may register when registration is open.

Dynamic event forms may contain:
- text
- number
- email/phone when policy requires confirmation
- single select
- multi select
- checkbox/consent
- jersey size
- emergency information
- custom notes

Each custom field needs:
- label
- hint/helper text
- required flag
- validation rule
- display order
- active flag

Registration safeguards:
- one logical registration per member/event
- transactional capacity enforcement
- server-side eligibility validation
- idempotent/retry-safe submit
- controlled statuses: pending / confirmed / waitlisted / cancelled / rejected

## 14. Event confirmation and event pass
When registration becomes confirmed, system automatically creates an event-specific pass.

The member receives:
1. confirmation screen in the website
2. event registration visible in dashboard
3. automatic confirmation email

Confirmation email must include:
- member name
- event title
- event date/time
- venue/location
- meeting/check-in instructions where available
- registration status
- event-specific barcode/QR/pass or secure pass link
- Member ID where useful
- event detail link
- cancellation/support instruction if configured

The event pass must be different from the permanent member barcode.

The permanent barcode identifies the member. The event pass proves a confirmed registration for one specific event.

## 15. Transactional email system
Required initial templates:
- account verification
- resend verification
- password reset if auth provider requires product template
- event registration confirmed
- event registration waitlisted if enabled
- event registration cancelled
- event changed/cancelled notification later when enabled

Email architecture requirements:
- provider-neutral notification service
- Resend adapter can be the initial email implementation
- sender name/address from environment or validated admin config
- official no-reply sender
- template variables validated server-side
- send attempts logged
- provider message ID stored where useful
- delivery status stored when webhook integration is enabled
- retry policy for transient failures
- email failure must not silently roll back a successful event registration
- UI should tell the user the registration succeeded even if email delivery is delayed/failed, with resend/support mechanism later

## 16. Media library
Media is uploaded through an authorized server flow and stored in object storage, not Postgres binary columns.

Metadata includes:
- storage key
- MIME type
- size
- dimensions
- alt text
- caption
- uploader
- status

Media picker should be reusable for Stories, Events, Partners, gallery, backgrounds and social-preview images.

## 17. Permissions
Initial role model:
- super_admin
- admin
- member

Server-side permission matrix is authoritative.

Admin and super_admin can manage Stories, Events, Partners and approved CMS content. Super_admin alone controls restricted role/account operations unless granular permissions are introduced later.

Client-side hidden buttons are UX only and never security.

## 18. Security and anti-abuse
- Server authorization for all protected reads/mutations.
- Rate-limit signup, verification resend, login-adjacent and scanner endpoints.
- Hash/securely manage verification and event-pass tokens.
- No secrets in client bundles.
- Validate all user/admin input server-side.
- Parameterized SQL only.
- Media MIME/type/size validation.
- Change history and audit for privileged actions.
- Never encode personal data in barcode payloads.

## 19. UX states
Every async feature requires:
- loading
- success
- validation error
- server error
- network failure/retry
- empty state when relevant
- disabled submit while processing

Admin forms require unsaved-change warning when navigating away.

## 20. Performance and scalability
- Public Stories/Events use server rendering/caching where suitable.
- Admin lists are paginated.
- High-value lookups indexed.
- Avoid N+1 queries.
- Event capacity writes are transaction-safe.
- Email sending happens outside the critical DB transaction after a durable notification job/delivery record is created where possible.
- Uploaded binary assets are stored outside Postgres.

## 21. Product metrics
Recommended metrics:
- signup_started
- signup_completed
- verification_sent
- verification_completed
- login_completed
- story_view
- media_partner_story_view
- partner_click
- event_view
- registration_started
- registration_completed
- confirmation_email_sent
- event_pass_view
- check_in_success
- repeat_event_participation

Do not send sensitive member data to analytics.

## 22. Release order
Phase 1: identity, verification, login, member card/barcode, RBAC and audit base.

Phase 2: CMS core, media, universal change history, Stories/media-partner publishing and Partners CRUD.

Phase 3: Events CRUD, dynamic registration forms, capacity-safe registration, event pass and confirmation email.

Phase 4: scanner/check-in, operational reporting and stronger notification delivery tracking.

Phase 5: analytics enrichment, newsletters/campaigns, partner campaigns and future benefits/commerce.

## 23. Definition of done
A feature is complete only when:
- UI uses the standard label/placeholder/helper/error contract
- show/hide password exists on password inputs
- client and server validation are present where relevant
- server authorization is enforced
- loading/success/error/empty states exist
- CMS mutations produce change history/audit entries
- dynamic content is not hardcoded
- migrations are versioned
- no environment secrets are committed
- responsive/mobile behavior is verified
- build/type/test checks pass
- critical edge cases and retry/concurrency cases are tested
- documentation/API contracts are updated
