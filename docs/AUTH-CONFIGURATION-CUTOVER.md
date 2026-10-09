# Auth configuration cutover — 2026-10-09

## Confirmed gaps and corrections

The existing Neon main branch already had Managed Better Auth. The Next server requires both NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET; Vercel had the former but not the latter. Missing server cookie secrets were added independently to production and preview. Existing provider credentials were not rotated. Production APP_BASE_URL was added for the existing BE-03 verification-link origin.

The provider database had no USS account schema or migration ledger. Existing migrations 001–009 were rehearsed on isolated Neon branch validation/uss-auth-wiring-20261009 and then executed transactionally on main. Preconditions rejected concurrent USS schema/ledger creation or legacy profile data. The resulting ledger has nine entries and three system roles; no existing provider users or public profiles were changed. No migration source or identity generator was replaced.

The review origin https://ussrunning-web-seven.vercel.app was already trusted; localhost was allowed. No trust wildcard or provider configuration change was made.

## Environment inventory (names and presence only)

| Name | Production | Preview | Development | Branch-specific |
|---|---|---|---|---|
| NEON_AUTH_BASE_URL | Present | Present | Missing | No |
| NEON_AUTH_COOKIE_SECRET | Added | Added separately | Missing | No |
| DATABASE_URL | Present | Present | Missing | No |
| APP_BASE_URL | Added | Missing | Missing | No |
| RESEND_API_KEY | Missing | Missing | Missing | No |
| EMAIL_FROM_ADDRESS | Missing | Missing | Missing | No |
| EMAIL_FROM_NAME | Missing; USS Running default | Default | Default | No |

VITE_NEON_AUTH_URL is integration metadata, not the Next server initialization variable. Secret values were not printed or committed. Development was not silently pointed at main.

## Email delivery boundaries

BE-03 uses the existing Resend SDK for USS verification links. RESEND_API_KEY and a verified EMAIL_FROM_ADDRESS remain missing; sender-domain verification cannot be confirmed without the existing Resend account configuration. No second provider was created.

Neon Better Auth independently uses its existing shared provider with sender auth@mail.myneon.app, Neon Auth branding and OTP verification. Automatic signup/signin verification and required provider verification are disabled in the existing configuration. A separate SMTP setup is unnecessary for the current shared provider. No webhook or SMTP replacement was made. Provider email verification alone does not activate a USS account: existing BE-03 ownership-proof consumption remains required.

## Trusted application boundaries

Canonical sessions are validated by the Neon server SDK. Provider identities enter the existing idempotent USS account provisioner; member IDs and barcode identities remain stable. Only member is granted on provisioning. Active status and verified ownership are enforced by backend guards; DB account_roles own member/admin/super_admin authority. Legacy admin compatibility no longer derives authority from provider role metadata or an email environment override.

The provisional profile adapter now projects BE-04's authorized own-profile DTO and delegates only whitelisted editable fields and revision to the existing mutation. No legacy public-profile insertion or second member identifier is involved. Optimistic concurrency, account status and backend validation remain authoritative.

## Validation and explicit limits

Fresh install, dependency graph, build, standalone TypeScript and regression results are recorded in the delivery report. New tests cover private DTO exclusion, inactive-account denial, owner-field whitelisting and provider-role rejection. Real controlled email/provider checks are reported separately from fixtures after deployment; API acceptance alone is not receipt or verification success.

Remaining: Resend key/verified sender and USS verification flow cutover; real active member/admin/super_admin staging validation; physical barcode scanning; protected CMS writer migration; barcode reissue; revision restore; hydration root-cause audit; unsupported next lint. No privilege grant, manual account activation, auth reset, auth reprovision, credential rotation or destructive migration was performed.

Integrated delivery gates: strict npm ci (zero audit vulnerabilities), npm ls --all, Next 16.3.8 production build and standalone TypeScript passed. After preserving independently delivered BE-07/ownership docs through a normal merge, all 148 tests passed (125 backend including 19 event tests, 23 frontend including four new cutover tests). FE-02/03 contracts passed. Existing Card/CMS browser layout suite passed 30 cases; interaction suite passed export, recovery, avatar fallback, denial and pagination checks, with zero captured hydration warnings/page errors in both suites. Physical decoder unavailable. Existing broader hydration audit and next lint limitation remain open.
