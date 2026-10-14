# INT-02 — Profile frontend cutover

## Source integration

`/dashboard/profile` and the member overview use the existing trusted BE-04 own-profile
read/update service. Discovery confirmed the six-field adapter was already connected;
there was no production mock authority to replace. `PROFILE_UNAVAILABLE` remains a real
failure state for unavailable backend/data, not an intentional production stub.

`lib/member/server.ts` caches reads within a server request. The save action sends an
explicit allowlist and the opaque `expectedVersion`; it never accepts caller account ID,
email, role, status, Member ID, barcode or timestamps. BE-04 authorizes every operation.
Successful saves invalidate the dashboard layout and adopt the returned DTO, including
the authoritative completion percentage/missing fields. Completion is guidance and does
not activate an account. Member Card continues to use BE-05 independently.

## Presentation and interaction

FE-01 fields, selects, checkboxes, form sections, actions and feedback are reused. The
existing name/contact/city/Instagram/emergency fields are joined by optional calendar birth
date, shared-policy gender/jersey size, preferred weekdays, privacy acknowledgment and
optional marketing consent. Existing distance/goal preferences are preserved when changing
weekdays; arbitrary preference fields are rejected. Avatar upload is outside this cutover
and existing avatar data is never patched or cleared incidentally.

Birth dates remain `YYYY-MM-DD`; no timezone conversion is applied. Frontend validation
mirrors visible BE-04 bounds; backend validation remains final. Legal acknowledgment is
sent only after an explicit true choice; stored consent timestamps are not sent. Marketing
is separate and reflects the trusted saved value, with no implicit opt-in.

Save locks prevent duplicate submission. Recoverable errors retain edits. A conflict
offers an input-free trusted reload; the existing discard dialog must be acknowledged
before replacing unsaved values. Reload failure keeps edits. Restricted/session responses
remove the form and reuse FE-02/member feedback. Server field text is normalized safely.

## Validation boundaries

Focused tests: 16/16 (12 new details/consent tests plus four existing cutover tests).
Integrated Node regression: 770/770; fail/skip zero. Dependency graph passes; no manifest
or lockfile changes. Browser reference: 22 cases / 53 assertions with zero runtime and
hydration findings. Dashboard regression: 43 cases / 154 assertions; zero runtime/hydration.
Widths: 320, 375, 390, 768, 1024, 1366; short-height/200% CSS zoom/reduced motion.
Keyboard first-error focus, labels, retained values, duplicate submission, separate consent,
conflict discard/Escape/focus restoration and backend issued completion are covered.
The compact weekday group was visually inspected at 320px. Existing profile interactions
also pass 17/17 cases after correcting the harness's local-host allowlist (no application
change to satisfy it). Production build and standalone TypeScript pass. Clean installation
passes: 261 packages added, 262 audited, zero vulnerabilities. No dependency/lockfile drift.
Deployment results are recorded at delivery, not inferred from these checks.

Browser mutation tests use isolated fictional development fixtures. The fixture route
returns 404 in production; production reads/writes have no fallback to it. Real active
member saves, stale updates from independent Neon sessions, runtime grants and staging
migrations remain externally BLOCKED pending credentials/environment. No real profile PII
was logged and no production database, provider or email mutation was performed.

Unsupported `next lint` under Next 16 remains a known tooling limitation. Correct CI lint
replacement is a separate approved hardening task. Source integration is distinct from
human product audit and production readiness.

Next: FE-13 Partner/Sponsor CMS on the latest main, respecting independently owned public
cutover branches. Auth/email source readiness remains READY_FOR_EMAIL_CONFIGURATION;
manual credential/sender/origin gates are listed in AUTH-FRONTEND-CUTOVER.md.
