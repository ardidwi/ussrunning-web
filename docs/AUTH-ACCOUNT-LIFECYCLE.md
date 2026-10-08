# BE-02 — Authentication and USS account lifecycle

Sources: [PRD](PRD-USS-RUNNING.md), [ERD](ERD-USS-RUNNING.md), [BE-01](DATABASE-FOUNDATION.md), [BE-01 validation](BE-01-VALIDATION.md). Branch: feature/auth-account-provisioning, based on reviewed BE-01 0aaacbe (PR #7), including migration 007. The earlier d717dc0/six-file baseline is superseded by that forward review fix. BE-01 is not recreated.

## Existing implementation audit

The installed provider is Managed Neon Auth, @neondatabase/auth 0.5.0-beta. lib/auth/server.ts constructs createNeonAuth from /next/server with NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET. app/api/auth/[...path]/route.ts delegates GET/POST to its handler. The installed SDK exposes signUp.email, signIn.email, signOut and getSession; session data contains provider user ID/email/name/emailVerified. Credentials/passwords/sessions stay provider-owned. No custom provider callbacks or webhook integration exist in this app, and no unsupported signup hooks are added.

app/join/actions.ts signs up through the provider then writes public.user_profiles, legal_consents and optional newsletter state. app/login/actions.ts signs in through the provider; dashboard signOut delegates to it and redirects home. lib/session.ts resolves provider identity and uses the legacy provider role/configured USS_SUPER_ADMIN_EMAIL convention; ensureProfile writes public.user_profiles. Recovery UI/customization is absent. Recovery remains the provider's SDK/proxy contract; no custom password storage or reset implementation is introduced. This task never invokes signup/recovery/email APIs against a real provider.

SDK usage was checked against installed declarations and the [official Next.js SDK guide](https://github.com/neondatabase/neon-js/blob/main/packages/auth/NEXT-JS.md). The managed SDK is a proxy, not an in-process Better Auth server supporting arbitrary hooks. Its existing cookie/session caching policy is retained. Server-only import and silent SDK logging prevent unintended provider error dumps; a future observability adapter must log only safe codes/correlation IDs.

## Integration strategy and compatibility

Strategy B: first trusted authenticated access to a BE-02 account helper provisions idempotently. getCurrentAccount/provisionCurrentAccount resolve the provider session on the server; no form/request/localStorage account ID, role or verified flag is accepted. Delayed/missing signup callbacks cannot cause duplicates because no callback is required. React cache is request-local in RSC; it is not a process-wide identity cache. Actions rely on transaction idempotency even outside that React context.

New helpers/actions are ready for FE-02 consumption; the existing signup/login/dashboard are not silently switched to new identities or pending-verification UX. lib/session.ts has only a compatibility status check: when uss.accounts exists, an already mapped suspended/deactivated provider ID is denied, so legacy protected actions cannot bypass that state. Missing uss schema leaves pre-migration deployments working; other database failures fail closed. It does not auto-provision legacy identities, change roles, or impose a new pending-verification screen. This lookup uses a fixed schema-existence query and indexed provider-ID lookup, with no per-row N+1 loop.

**Legacy boundary:** public.* profiles/IDs, consents, RSVP data and demo localStorage remain unchanged. Historical users need an operator-reviewed crosswalk/backfill that preserves already issued Member IDs/barcodes. Do not expose the new account actions to legacy members before reconciling those identities: absent a crosswalk the new schema would issue its own different identities. No historical backfill or production cutover is performed here. New uss services must use active-account guards; legacy pending-verification policy remains deferred until verification UI/cutover is approved. The old email-based admin bootstrap convention is not imported into uss.account_roles and remains a separately scoped legacy RBAC concern for BE-06.

## Provisioning transaction

The cached BE-01 Neon HTTP accessor sends one READ COMMITTED batch:
1. Set local 15-second lock timeout and acquire provider-key transaction advisory lock (hash seed distinct from migration/event locks).
2. INSERT account with provider ID, normalized email and trusted provider name, ON CONFLICT(provider ID) DO NOTHING. Database defaults issue identities/status.
3. INSERT minimal profile, ON CONFLICT(account_id) DO NOTHING.
4. INSERT role relation selected exclusively by DB role code member, ON CONFLICT(account_id,role_id) DO NOTHING.
5. Read the account by provider ID.

Each post-lock statement has a fresh snapshot. Unique provider/email/profile/role constraints are final protection even if requests race. Missing mandatory member reference fails NOT NULL, rolling back account/profile. Failure preserves the remote provider identity so the next trusted request can retry. Existing incomplete profile/member relations are repaired; existing personal fields, status, email and issued IDs are not overwritten. A provider email mismatch returns ACCOUNT_CONFLICT and does not merge by email or write profile/roles. Another provider with the same citext email also returns controlled conflict. Optional metadata beyond name is ignored; missing name remains NULL. No phone/city/emergency/consent is invented. last_login_at is not updated on every profile read as if it were a real provider login.

Migration 008_optional_profile_name only removes NOT NULL from full_name; the existing non-empty CHECK still validates supplied names. Migrations 001–007 and the runner/grants are unchanged. Existing SELECT/INSERT/UPDATE non-owner runtime grants suffice; no new privileged function or role-management grant exists.

## Permanent identity format

Follow BE-01 defaults exactly: Member ID = USS- followed by uppercase UUID v4, including hyphens. Barcode uses a separate independently generated UUID in the same format. Each UUID has 122 random bits; uniqueness is additionally enforced by PostgreSQL. This scales without sequence resets, sensitive-data derivation or renumbering. The long human-facing ID is deliberate compatibility with the approved foundation, not a new shortened format. Neither value grants authentication, permission or event attendance. Database identity triggers reject changes. Rendering/scan reliability belongs to FE-04/BE-04 later.

## Server contracts and status rules

- getAuthenticatedUser(): trusted whitelisted provider identity or null; throws safe configuration/provider error codes.
- requireAuthenticatedUser(): throws UNAUTHENTICATED if no session.
- getCurrentAccount(): own safe DTO or null; provisions when authenticated.
- provisionCurrentAccount(): explicit trusted provisioning, no input.
- requireCurrentAccount(): requires provider session and provisioned application account.
- requireActiveAccount(): rejects pending, suspended, deactivated; active also requires email_verified_at.
- getOwnAccount()/getActiveOwnAccount(): input-free Server Actions returning {ok:true,account} or {ok:false,code}. No raw error, stack, provider mapping, grant metadata or token is returned. Pending own-account lookup allows FE-02 to show verification state; suspended/deactivated receive only error codes.

Codes: UNAUTHENTICATED, AUTH_NOT_CONFIGURED, AUTH_UNAVAILABLE, ACCOUNT_NOT_PROVISIONED, EMAIL_NOT_VERIFIED, ACCOUNT_SUSPENDED, ACCOUNT_DEACTIVATED, ACCOUNT_CONFLICT, PROVISIONING_FAILED. Authentication failure cannot authorize a DB call. Unknown failures normalize to PROVISIONING_FAILED. Codes are stable; UI must not parse exception text. Guards are access checks: later business mutations must lock/recheck account eligibility in their own transaction when concurrent status changes matter.

New account is always pending_verification, even when the provider session's emailVerified is true. No client flag or provider role can bypass USS verification. active requires timestamp. suspended/deactivated are denied server-side and cannot be reactivated by provisioning or verification. Administrative status changes/reactivation remain BE-06.

## Verification boundary for BE-03

getVerificationState exposes only timestamp/status. activateAccountAfterVerification is an INTERNAL server transaction primitive, not an action/route. BE-03 must validate expiry/purpose/account/email, consume proof and invalidate old artifacts in the SAME transaction before invoking it. It locks the exact account/email, updates pending to active and records DB time, preserves an existing timestamp on repeat activation, and rejects suspended/deactivated or mismatched email. A later failure in the caller transaction rolls activation back. Never expose this helper as a public activate-by-ID endpoint. AccountTransaction must represent an already active transaction, never ordinary independent query calls. The existing Neon HTTP accessor supports batch transactions, not interactive await callbacks: BE-03 must either compose its proof/status SQL into one batch/statement or supply an interactive transaction executor from the existing Neon driver. Do not consume proof in one HTTP transaction and activate in another. Token generation/validation, email delivery, cooldown/retry and provider-neutral delivery tracking are not implemented in BE-02.

## Validation and release limits

Commands: npm ci --ignore-scripts; npm run build; node node_modules/typescript/bin/tsc --noEmit --incremental false; npm run db:test; npm run auth:test; npm run db:migrate -- --dry-run. See BE-02-VALIDATION.md for executed results and five-stage audit.

Auth tests transpile the real production TypeScript and execute unchanged SQL/transactions against PGlite PostgreSQL; only provider/transport and React request context are substituted. Parallel Promise.all proves duplicate-safe execution, but PGlite serializes transactions: it does not prove live multi-session contention, SDK cookies, OAuth, sign-out/revocation, provider signup/recovery or Neon HTTP transport. Rehearse two real concurrent requests on an isolated Neon staging branch with migration/app roles and migrated identities before enabling FE-02. No production migration/provider config/email change is made by these tests.

BE-03 should add one-time email-bound proof consumption, expiry/reuse tests, cooldown/rate limits, Resend and official sender configuration, durable delivery retries/logs, then verification UI integration. Stage the identity crosswalk and permission audit before production use. Do not send email inside the provisioning transaction or log raw tokens.
