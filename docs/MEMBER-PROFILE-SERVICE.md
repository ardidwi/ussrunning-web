# BE-04 — Member profile service

> Go-live completion rules, member numbers and private photos are documented in the [Member Identity handover](MEMBER-IDENTITY-HANDOVER.md). The sections below record the original service foundation.

Based on [PRD](PRD-USS-RUNNING.md), [ERD](ERD-USS-RUNNING.md), [database foundation](DATABASE-FOUNDATION.md), [account lifecycle](AUTH-ACCOUNT-LIFECYCLE.md) and [email verification](EMAIL-VERIFICATION.md). Neon Auth, account provisioning/verification, immutable identity and legacy routes remain unchanged. No frontend/page/Member Card rendering, upload, administrative editing, CMS, event or email workflow is added.

## Schema audit and compatibility

Actual schema: `uss.member_profiles.account_id` is PK/FK to accounts with RESTRICT deletion. Fields are `full_name` (nullable since 008), `phone`, `birth_date` (date), `gender`, `city`, `emergency_contact_name`, `emergency_contact_phone`, `instagram_handle`, `jersey_size`, `running_preferences` (object JSONB), `avatar_media_id` (FK to media_assets), `marketing_consent`, `marketing_consent_at`, `privacy_consent_at`, `created_at`, `updated_at`. The existing timestamp trigger, account/profile/media PK indexes, unique member/barcode constraints and account identity trigger suffice. **No migration, new index, grant or extension is needed**; 001–009 and runtime grants remain unchanged.

Legacy dashboard/form still read/write `public.user_profiles` through their existing actions. No silent dual write or frontend cutover. Historical migration needs verified provider/account crosswalk, preservation of permanent IDs, deliberate first_name/last_name → full_name, mobile → phone, emergency_contact_mobile → emergency_contact_phone and Instagram normalization. Legacy birth/gender/jersey/preferences/avatar and legal consent evidence may be absent or incompatible. Do not infer privacy consent or replace established IDs. Unknown legacy preference shapes require a reviewed transform/backfill, never silently overwriting with `{}`.

BE-02 already repairs minimal missing profiles on first trusted account access without overwriting existing data. If a profile is unexpectedly missing after that guard (e.g. privileged deletion during a request), this service returns `PROFILE_NOT_FOUND`; it does not invent PII or perform an independent competing provisioner. Remediation is a new trusted provisioning request or reviewed operational repair. Missing account returns controlled account error. Partial profiles retain all fields omitted from PATCH.

## FE-03 / FE-04 operations

Import server actions from `lib/member/profile-actions.ts`; DTOs from `profile-types.ts`. There is one access path, no duplicate REST API. All operations resolve the trusted session through `requireActiveAccount()`. Input-free reads ignore any supplied identifiers; update rejects extra identity keys. Admin/super_admin have exactly the same **own-account-only** behavior, no role-based editing of other members.

```ts
getOwnMemberProfile(): Promise<ProfileResult<MemberProfileDTO>>
updateOwnMemberProfile(input: UpdateProfileInput): Promise<ProfileResult<MemberProfileDTO>>
getOwnMemberCard(): Promise<ProfileResult<MemberCardDTO>>

// Frontend echoes the opaque version from its read. Never calculate it itself.
updateOwnMemberProfile({
  expectedVersion: profile.version,
  changes: { phone: "+447700900123", city: "London" }
})
```

`ProfileResult<T>` is `{ok:true,data:T}` or `{ok:false,code,fieldErrors?}`. Field errors contain field names + safe `INVALID`, `REQUIRED`, `UNSUPPORTED`, `INCONSISTENT` codes, never submitted values. Stable failures reuse BE-02 auth codes, plus `PROFILE_NOT_FOUND`, `PROFILE_VALIDATION_ERROR`, `PROFILE_UNAVAILABLE`, `MEDIA_NOT_FOUND`, `CONFLICT`. FE must map codes, not parse exception strings. A conflict requires reload/reconcile; never silently overwrite another form's changes.

Read DTO:
- `account`: id, email, memberId, status, emailVerified, displayName. No provider ID, barcode, roles/grant metadata, tokens or audit data.
- `profile`: fullName, phone, birthDate (`YYYY-MM-DD` or null), gender, city, emergencyContactName, emergencyContactPhone, instagramHandle, jerseySize, runningPreferences, avatar, marketingConsent, marketingConsentAt, privacyConsentAt, updatedAt (UTC ISO), version (opaque 64-hex optimistic token).
- `completion`: percentage and missingFields.

Member-card DTO contains **only** displayName, memberId, barcodeValue, status, optional avatar. Display name prefers profile full name, then account display name, then member ID (not email). Barcode is returned only to the authenticated active owner, never via public lookup. It is an opaque permanent identifier, not login/RBAC/event-attendance authority; never encode other DTO fields into its payload. Rendering/logo placement and scan testing remain FE-04/later scanner work.

All profile/card reads and writes require `active` plus verification timestamp. Pending returns `EMAIL_NOT_VERIFIED`; suspended/deactivated return existing guard errors; anonymous returns `UNAUTHENTICATED`. No limited pending profile read is introduced; FE-02 uses its existing own-account verification contract. Completion and consent do not redefine activation/lifecycle rules.

## PATCH allowlist and validation

Allowed `changes` keys: fullName, phone, birthDate, gender, city, emergencyContactName, emergencyContactPhone, instagramHandle, jerseySize, runningPreferences, avatarMediaId, marketingConsent, privacyConsent. Every other key (including accountId, provider ID, email, member ID, barcode, status, role, created/updated/consent timestamps) is rejected. Top-level input allows only expectedVersion and changes. All values are bound parameters; column identifiers come from a fixed developer-owned mapping.

Central policy lives in `profile-policy.ts`, used by validation/repository. Initial gender vocabulary: female, male, non_binary, prefer_not_to_say; sizes XS/S/M/L/XL/XXL/3XL. These are code-owned initial supported choices, not CMS-configurable taxonomy. Future approved additions should change the one policy or add a proper reference contract; never duplicate lists across UI/backend. City is free plain text. Weekdays are stable mon–sun; running goals are bounded free labels, not a hardcoded business-interest list.

- Command JSON max **8192 bytes**; plain objects only, unknown keys/cycles/exotic/unbounded payloads rejected. Server Action framework transport limits still apply upstream.
- Supplied fullName: trimmed/collapsed whitespace, 2–120 chars, cannot clear once supplied. Bootstrap may remain null. City: optional 1–100 chars. Emergency name: optional 2–120 chars. Angle brackets/control characters rejected; store plain text, never HTML. Consumers must render legacy/provider text as escaped text, never `dangerouslySetInnerHTML`.
- Phone: optional 7–15 digits, optional leading `+`; only spaces/parentheses/hyphens removed. Reject letters/extensions/misplaced plus, do not guess country or add Indonesia prefix. Local numbers remain local; formatting is not proof of reachability.
- Birth date: strict valid calendar date, no future UTC calendar date, maximum age 120 years centrally bounded. No demographic field required for active membership.
- Emergency contact changes validate the **merged stored/new pair** atomically. Both name/phone present or both absent; unrelated edits preserve existing partial legacy contacts rather than erase them.
- Instagram: optional leading @ removed, lowercase, 1–30 letters/numbers/underscore/dot; no URLs/scripts. Jersey size uppercased and policy-checked; gender policy-checked. Optional text/null may clear; fullName is the exception.
- Preferences: replace the whole object deliberately, never unbounded merge. Only distancesKm (up to 8 finite values >0 and <=200), days (up to 7 policy weekdays), goals (up to 5 trimmed plain labels, each 1–60 chars); max 1024 encoded bytes, deduplicated lists. Arbitrary nesting/keys/types rejected. Unknown stored legacy shape returns controlled unavailable state pending transform; no silent data loss.
- Avatar ID: null clears; non-null must be UUID and reference an **active JPEG/PNG/WebP/AVIF uploaded_by this account**. SQL FK is final protection; media row is share-locked during mutation. Unknown/foreign/archived/SVG/non-image references all return `MEDIA_NOT_FOUND`, without exposing media ownership. No upload/storage API is implemented. Reads suppress unsafe/foreign/archived assets and return only id, HTTPS public URL without credentials, altText, dimensions. Private/signed delivery and storage URL policy belong to the later media service; no storage key/uploader is exposed.

## Completion and consent

`PROFILE_COMPLETION_FIELDS` centralizes recommended guidance: fullName 20%, phone 20%, city 20%, complete emergency-contact pair 40%. Minimal null profile is 0%; name-only bootstrap 20%; all four recommendations 100%. Missing keys are fullName, phone, city, emergencyContact. Instagram/birth/gender/jersey/avatar/preferences/marketing/legal consent are not needed to reach 100%. Valid active account requirements remain trusted provider mapping, issued immutable IDs and verified active state, enforced by existing guards/DB. Percentage never authorizes anything.

Marketing is optional boolean; a real change updates `marketing_consent_at` to server DB time and appends a communication-preference audit. False is valid opt-out, not account deactivation. Privacy is separate: `privacyConsent: true` records server timestamp only if absent, plus a minimized acceptance audit. Client cannot set/clear/replace that timestamp; repeated acceptance preserves first evidence. False/null privacy payload is rejected. Withdrawal/deletion requests and policy-version/locale/legal-text evidence need a future dedicated consent workflow; do not overwrite historic acceptance. This task does not claim a full legal-consent ledger or newsletter integration.

## Transaction, concurrency and performance

No new DB client or interactive callback transaction. The existing Neon HTTP driver executes a fixed READ COMMITTED batch: bounded lock timeout, account row lock, then a fresh-snapshot CTE that locks profile, rechecks active/verified account state, compares expected version, validates merged emergency/media relations, updates changed columns and appends audits. Same account-first lock order as BE-03/status changes. External provider/network I/O is absent. Later media multi-row services must respect this lock order.

Version is SHA-256 of the canonical PostgreSQL profile-row JSON snapshot (including updated_at); all four timestamptz columns are normalized to epoch numbers before hashing, independent of session TimeZone. It is an owner-only concurrency fingerprint, **not authentication, anonymization or identity**. It detects actual changes even if updated_at has close/equal clock precision. Mandatory expectedVersion protects stale/parallel forms; no last-write-wins path. If one update wins, another based on old version gets `CONFLICT`. Exact no-op with current version does not update timestamp or emit duplicate audit. A retry with old version after a material change conflicts and must reload. Do not round/derive the token from display timestamps. Read/check reuse the same server-owned canonicalization; rehearse the real Neon HTTP path before cutover.

Profile + consent timestamp + `member.profile.updated`, `member.communication_preferences.updated`, `member.privacy_consent.accepted` audits are atomic. Audit failure rolls everything back. Summaries contain **changed field names only**, no phone/name/email/emergency data/preferences, prior/new values or secret/session identifiers. No console/raw SQL error logging. A post-commit fresh profile read supplies the response; if account status changes or transport/read fails after commit, the caller may receive a controlled failure even though the write committed—reload before retry. No transaction is kept open for response formatting.

Read is one account/profile/media join after the existing request-local session/provisioning guard, with fresh DB lifecycle recheck. Card has one such query and omits contact DTO construction. Mutations use a fixed transaction and one post-commit join; no per-field/per-item N+1, role lookups beyond existing provisioning, new sensitive-profile cache or unnecessary phone/social indexes. Profiles/media use existing PKs. No claims about live multi-session performance were made from PGlite tests.

## Release boundary and next task

No production DB/migration/provider change or automatic cutover. Stage real Neon transport, runtime role, independent-session status/profile/media races, legal consent/backfill and historical member identity crosswalk before wiring FE-03/04 to these actions. Tests use synthetic in-memory fixtures, never production PII. Existing UI/routes remain unchanged; source/build audit does not substitute for a browser/provider-session integration rehearsal.

Member-card identity DTO is covered here. Recommended next backend task: **BE-06 — RBAC + Audit/Revision Foundation**, with centralized privileged permissions, audited role/status changes and safe revision primitives. The repository's older task plan labels BE-05 as Media/CMS core; this recommendation follows the current request's Member Card/Barcode-contract decision. Neither CMS nor BE-06 admin management is implemented by BE-04.
