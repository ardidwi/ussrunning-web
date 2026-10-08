# FE-02 authentication frontend contract

Source of truth: PRD section 6, ERD identity/verification constraints and existing managed Neon Auth server actions. This checkout has no DATABASE-FOUNDATION.md or AUTH-ACCOUNT-LIFECYCLE.md and no BE-02 provisioning/status contract. No provider, database, API route or existing backend action was modified.

## Screens and URLs

Existing route structure is retained:

- `/login`: sign in; safe `returnTo` supported.
- `/join`: full name, email, password, confirmation and unchecked privacy/terms consent.
- `/login?flow=verify`: waiting/link confirmation; code mode is an adapter capability.
- `/login?flow=forgot`: generic recovery request.
- `/login?flow=reset&token=…`: new password/confirmation, checked by the eventual backend on submission.
- `/login?reason=session-expired&returnTo=…`: session recovery presentation. The reason is display copy only, never authorization.

Pending verification, suspended/deactivated/unprovisioned accounts, invalid/expired links and success are controlled by adapter results. Account status is never sourced from localStorage or a role query parameter. A token's presence enables submission; it never proves validity. Link verification is explicit, preventing a mutation on rerender/prefetch. Consumed link material is removed from the address bar after a trusted success.

## Adapter boundary

`AuthFlow → authAdapter → runAuthOperation → existing signInWithEmail`.

`AuthAdapter(operation, input): Promise<AuthResult>` centralizes all operations. Result decoding rejects malformed responses and operation-inappropriate successes. Components render canonical copy, never provider exception messages. New structured backend codes take precedence; an isolated exact-message bridge maps the existing coarse login responses. Current login cannot distinguish account lifecycle statuses until BE-02 supplies those codes.

Connected today: existing managed provider login only. Registration is intentionally not connected to the legacy createMember action: that action requires onboarding data and does not implement the PRD pending-verification lifecycle. Verification/resend/recovery/reset return AUTH_UNAVAILABLE; no fake session, delivery success, provisioning or client activation occurs. Replace this adapter's unavailable branches with the maintained BE-02/BE-03 contract when merged. Keep server validation, provisioning/consent, status enforcement and rate limits there.

## Results

Request phases: idle → submitting → settled(result). Domain results: signed_in, verification_required, verified, already_verified, recovery_sent, password_reset, resend_sent, error(code). A synchronous submission lock prevents repeated requests before React commits pending state. No requests originate from effects. Inputs remain in component memory across recoverable errors; no credential persistence is added.

Login navigates once to a normalized safe internal destination, default /dashboard. Auth/API/reference destinations are excluded to avoid redirect loops. Destination server protection remains authoritative. Registration can only return verification_required, never signed_in. Verification/reset success directs back to login. Forgot success uses generic existence-neutral copy.

Codes: UNAUTHENTICATED, INVALID_CREDENTIALS, ACCOUNT_NOT_PROVISIONED, EMAIL_NOT_VERIFIED, VERIFICATION_EXPIRED, VERIFICATION_INVALID, VERIFICATION_RESEND_COOLDOWN, ACCOUNT_SUSPENDED, ACCOUNT_DEACTIVATED, ACCOUNT_CONFLICT, VALIDATION_ERROR, RATE_LIMITED, NETWORK_ERROR, UNKNOWN_ERROR. Additional integration/reset codes: AUTH_UNAVAILABLE, RESET_EXPIRED, RESET_INVALID. Provider aliases and all copy live in auth-errors.ts.

Resend cooldown uses only validated backend `retryAfterSeconds` (0–86400). Receipt time starts its visual countdown; the server still enforces rate limits. No production default duration is invented. Development scenarios use a short response-provided interval to exercise countdowns.

Public password/name policy is whitelisted server-side from existing membershipConfig and passed as props. Client rules are immediate feedback, not authority. No arbitrary password complexity requirement is introduced. Privacy/terms links open in a new tab to preserve the registration form.

## Shared ownership

AuthShell extracts the existing login visual and scroll shell. AuthFlow, AuthStatus, ResendVerification and useAuthRequest own repeatable auth behavior. FE-01 Field/Input/PasswordInput/Checkbox/FormSection/Button/LinkButton/ToastProvider remain the visual owners. Scoped auth-flows.css provides composition only. All new text follows the existing USS black/red/editorial direction.

## Development and verification boundary

The existing `/design-system?surface=auth&flow=…&scenario=…` reference is guarded before rendering in production. AuthReference is the only mock adapter, clearly disclosed, creates no sessions and calls no provider. Test values are fictional, not working credentials. Its result states have no authorization effect.

Production lifecycle integration, authenticated status enforcement, trusted recovery sessions, consent persistence and email delivery must be verified after BE-02/BE-03. Protected route expiry redirects currently retain their existing backend behavior; this frontend supplies the destination and session-expiry presentation without changing those guards.
