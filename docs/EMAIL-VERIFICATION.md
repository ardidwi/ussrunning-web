# BE-03 — Email verification and transactional delivery

Builds on [database foundation](DATABASE-FOUNDATION.md), [account lifecycle](AUTH-ACCOUNT-LIFECYCLE.md), PRD and ERD. Neon Auth still owns credentials, sessions and password reset. This workflow proves ownership of the USS account email; it does not mint a provider session or change provider `emailVerified`. No legacy/public data cutover, signup screen redesign, event email, marketing or CMS integration occurs.

## Backend contracts and FE-02 boundary

- `requestOwnEmailVerification()` in `lib/auth/verification-actions.ts`: input-free server action for **both initial request and resend**. Resolves the current USS account through BE-02's trusted provider session/idempotent provisioning. Client email, role, account ID and redirect metadata have no authority. Call explicitly after trusted provisioning or from the future verification UI. Provisioning itself remains unchanged and does not implicitly send mail on every read.
- Authenticated callers receive `{ok, code, retryAfterSeconds?}`. Success: `VERIFICATION_ISSUED` (provider accepted, not proof of inbox delivery) or `ACCOUNT_ALREADY_ACTIVE`. Safe failures: `VERIFICATION_RESEND_COOLDOWN`, `VERIFICATION_RATE_LIMITED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED`, `ACCOUNT_NOT_PROVISIONED`, `EMAIL_NOT_CONFIGURED`, `EMAIL_DELIVERY_FAILED`, `EMAIL_DELIVERY_UNCERTAIN`, `VERIFICATION_UNAVAILABLE`.
- Anonymous callers receive `UNAUTHENTICATED` regardless of any supplied email. **No unauthenticated email-lookup/resend endpoint exists**. Thus no account enumeration through email lookup, mail bombing of arbitrary addresses, or email-specific timing response is exposed. No claim of an anonymous email-based generic endpoint is made.
- `POST /api/account/verify-email`: JSON `{token}` or URL-encoded `token`, maximum 2048 bytes. Rejects additional fields/duplicate form tokens, malformed/non-string proofs and arbitrary return destinations. Results: `VERIFICATION_SUCCESS`, `ACCOUNT_ALREADY_ACTIVE`, `VERIFICATION_INVALID`, `VERIFICATION_EXPIRED`, `VERIFICATION_ALREADY_USED`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DEACTIVATED`, `VERIFICATION_UNAVAILABLE`. HTTP 200 for success, 400 for invalid/blocked, 503 for unavailable. Responses never contain account identity/email or SQL/provider internals.
- `GET /api/account/verify-email` is a minimal backend confirmation, not an auth page redesign. The email link carries `#token=...`; fragments are not sent to the HTTP server or in Referer. Nonce-protected script reads the fragment, clears it using `replaceState`, populates a hidden form field and enables an explicit confirmation POST. GET does **not** consume or activate; email previews/prefetch do not activate accounts. POST currently returns JSON for FE-02 to present. JavaScript is necessary for this fallback confirmation. Existing routes and forms are untouched.

FE-02 should consume codes, never exception strings. Show trusted `retryAfterSeconds` as a countdown; the DB still enforces it. Future screens may consume the same POST contract. Do not put tokens in query strings, analytics, localStorage, browser telemetry or server request-body logs. No `returnTo` is accepted. Disable click tracking/link rewriting for auth mail at the sending-domain/provider layer; staging must verify fragment preservation across actual mail clients.

## Proof and activation

`randomBytes(32)` gives 256 bits of entropy, encoded as 43 base64url characters. SHA-256 of the raw proof is stored in the existing unique `token_hash`; the raw proof exists only in request memory and the outgoing HTML/text email. It is independent of permanent member ID/barcode, expires and cannot authenticate a session. Migration 009 adds an immutable SHA-256 lowercase-email fingerprint. This is a binding, **not encryption/anonymization of a low-entropy email**. It prevents a proof for an old address from verifying a subsequently changed address. Pre-009 unbound artifacts remain stored but are rejected; resend creates a bound proof.

`uss.issue_email_verification` uses the account row lock to serialize issuance, eligibility, cooldown and rolling limits. It atomically invalidates outstanding siblings, inserts proof + queued delivery + minimized issuance audit. A failure rolls all these writes back. Config is trusted server input, independently bounded in SQL. Expired/revoked/consumed proofs still count toward issuance limits.

`uss.consume_email_verification` resolves the unique hash, locks account **before** proof, re-reads after waiting and checks database wall-clock expiry, consumption, revocation, email binding and current status. One statement/transaction consumes proof, activates only `pending_verification`, records verification timestamp, invalidates siblings and appends completion/activation audit. `active` remains active and preserves its timestamp; suspended/deactivated never reactivate. Reuse returns `VERIFICATION_ALREADY_USED`. Concurrent status writes to the same account share the row lock: whichever commits first determines the subsequent eligibility check.

These SECURITY INVOKER functions use explicit schemas and fixed `search_path`, no dynamic SQL or elevated owner privilege. PUBLIC EXECUTE is revoked. The existing non-owner runtime privilege template deliberately grants EXECUTE plus its existing table access; owner/migration credentials must remain separate. Apply that reviewed template after migration 009. BE-02's internal activation helper is preserved; BE-03 uses equivalent policy inside SQL to compose consumption atomically with the existing Neon HTTP driver, which cannot run an interactive awaited callback transaction.

## Provider-neutral delivery

`EmailProvider`, `EmailContent`, `DeliveryResult` and `sendTransactionalEmail` are reusable independently of verification. Only the Resend adapter knows the SDK. Security-sensitive verification templates are code-owned (HTML + text), not editable in CMS; `notification_templates` is not seeded or mutated. No extra email framework is installed.

Delivery claim is a conditional `queued → sending` update and increments attempt count once. Commit occurs **before external I/O**. Successful provider acceptance records provider/message ID, `sent_at`, `sent`; it is not delivered/opened confirmation. Failure/timeout records `failed_at` and a fixed safe summary/code, never arbitrary provider exceptions, headers, payloads or raw proof. The stable delivery UUID idempotency key is passed to Resend. Concurrent claims send only once.

Official `resend` is pinned to **6.13.0**: audited dependencies and no SDK automatic raw-error console logging (verified with a mocked transport). Newer 6.32.1 logs raw provider errors in non-production; 6.9.4 had vulnerable transitive dependencies. Re-evaluate both logging and dependency audit before upgrading. No global logger monkeypatch or private SDK override is used in application code.

No automatic retry/queue or webhook is introduced. Manual resend after limits permit creates a new delivery/proof and supersedes the old proof. Failed proof remains valid until expiry/supersession because transport acceptance may be ambiguous. SDK 6.13.0 lacks a typed cancellation option; bounded timeout returns safely but cannot cancel a late provider completion. An accepted message followed by DB failure returns `EMAIL_DELIVERY_UNCERTAIN`; the durable row may remain `sending`. A crash before claim may leave `queued`. Operators must reconcile stale rows and use a new resend; **never** reconstruct/resend a raw proof from DB (it is not persisted). Slow provider calls never hold the account/proof lock, and failures never activate an account.

## Configuration

All settings are server-only and lazily validated when email issuance is invoked, so unrelated pages/builds work without mail secrets. `.env.example` contains blank secrets/sender/base URL, no invented production domain.

| Setting | Policy |
| --- | --- |
| `RESEND_API_KEY` | Required at issuance; dedicated environment-specific credential |
| `EMAIL_FROM_ADDRESS` | Required validated sender address from verified domain |
| `EMAIL_FROM_NAME` | Defaults to USS Running; no CR/LF/angle brackets |
| `APP_BASE_URL` | Required trusted origin, HTTPS in production; HTTP loopback only outside production; no credentials/path/query/fragment |
| `EMAIL_VERIFICATION_TTL_MINUTES` | Default 30; integer 1–1440 |
| `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` | Default 60; integer 1–86400 |
| `EMAIL_VERIFICATION_RATE_WINDOW_SECONDS` | Default 3600; at least cooldown, at most 86400 |
| `EMAIL_VERIFICATION_MAX_REQUESTS` | Default 5; integer 1–50 per account/window |
| `EMAIL_PROVIDER_TIMEOUT_MS` | Default 15000; integer 100–60000 |

Numeric defaults are centralized deployment policy and bounds reject malformed/empty values. No API key or DB URL uses `NEXT_PUBLIC_*`.

Account-backed limits are distributed across app instances sharing PostgreSQL: the account lock and persisted proof history prevent concurrent cooldown bypass. No in-memory-only claim is made. There is no trusted client IP attestation in this repository, so no untrusted forwarded-IP hashing or new IP infrastructure is added. Pre-auth/signup abuse, global provider quotas and verification-endpoint traffic still require upstream provider/platform controls in staging/production. DB access credentials remain trusted server authority; runtime access is not public RBAC enforcement by itself.

## Schema, indexes and migration policy

Only forward migration **009_email_verification.sql** is added. Migrations 001–008 remain byte-identical; runner/ledger/checksum/lock are reused. No tables, foreign keys, cascades or identity architecture are replaced. Existing unique token hash, outstanding-proof partial unique, account/time, expiry, notification account/time/queue and provider-message indexes support this workflow. No redundant new index is needed. The new trigger only protects email binding; operational consumption/revocation and account/profile mutable fields remain mutable. Audit remains append-only; no secret/full email in audit summaries. Recipient email remains in delivery records as required operational PII; apply retention/access controls later.

Run `npm run db:migrate -- --dry-run` without credentials for local planning. Rehearse fresh/rerun/runtime grants on an isolated Neon staging branch before rollout. Never run production migrations on app startup. Roll forward with new numbered migrations. Deployment rollback may remove the BE-03 code while leaving additive 009 and its ledger intact; do not edit/checksum-rewrite applied history or casually drop proofs/audit/delivery data.

## Staging release checklist and remaining scope

1. Create a Resend account/environment-scoped key and choose the approved official no-reply sender domain.
2. Add the DNS records supplied by Resend (SPF/DKIM and approved DMARC policy); verify sending-domain status in that environment. No domain/DNS changes were performed here.
3. Set server secrets/sender/HTTPS origin and reviewed limit policy. Disable auth-link click tracking, token-bearing analytics and request-body logging; verify email client fragment/link behavior.
4. Rehearse 009 and non-owner grants in isolated Neon staging, including real independent concurrent sessions for same-token/resend/status races and transport failures.
5. Send only explicitly authorized staging test mail to approved recipients; verify HTML/text, expiry, ignored/reused link, failure recovery and sender deliverability. No real mail was sent during implementation.
6. Integrate FE-02's explicit own-account request and result presentation separately. Legacy `public.*` users/profiles/member identities still need the previously documented crosswalk before a production cutover.

BE-04 should implement the **member profile service**, using active-account guards, validated mutable fields, consent rules and audit while preserving permanent member identity. Future event transactional email can reuse the provider-neutral delivery abstraction; capacity/event business logic is outside BE-03.
