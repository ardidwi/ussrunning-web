# Data retention & data-subject rights (D1.6)

> **Status: engineering draft, pending owner approval.** This describes what the code does today.
> It is not legal text and has not been reviewed by counsel. The public `/privacy` page shows a
> matching summary that is visibly marked "pending owner approval".

## 1. Own-data export

- Member → **Settings → Your data → Download my data** (`POST /api/member/data-export`, same-origin only, `no-store`).
- Requires an active, verified account (`DATA_RIGHTS_PERMISSIONS.export`, today `profile.read.self`).
- Contents, all anchored on the session account (never a request parameter):
  account (USS Member ID, email, display name, status, timestamps, own role codes), profile,
  consents (marketing + timestamp, privacy acceptance timestamp), avatar metadata plus a short-lived
  signed URL (`MEDIA_PRIVATE_URL_TTL_SECONDS`, 60–900 s; never a storage key), registrations with own
  custom-field answers, attendance (check-ins), event-pass metadata, notification history addressed to the
  account, and own data-rights requests.
- Excluded: other people's identities (reviewers, scanners, deciders), staff `admin_note`, pass token
  hashes/hints, member barcode value, auth-provider user id, audit log internals, storage keys, provider ids.
- Rate limit: 3 exports per account per rolling hour. Each export writes `data_rights.export.generated`.

## 2. Deletion request lifecycle

```
pending ──approve──▶ approved ──execute──▶ executed
   │  └──reject───▶ rejected                ▲ (idempotent retries for storage/session follow-ups)
   └──cancel (member)─▶ cancelled ◀──cancel (member)── approved
```

- Member submits with an optional reason (≤ 500 chars) and must type their account email as confirmation.
- One open (`pending`/`approved`) request per account (DB unique index); 3 submissions per 24 h.
- Super admin queue (`DATA_RIGHTS_PERMISSIONS.manage` + DB `super_admin` check): approve/reject need a
  reason (5–500 chars); nobody may decide or execute a request about themselves.
- Terminal states (`rejected`, `cancelled`, `executed`) are immutable (DB trigger). Every transition is
  audited (`data_rights.deletion.requested|approved|rejected|cancelled|executed`).
- The last usable super admin cannot request deletion; approval and execution re-check the invariant.

## 3. Erasure (execution)

One database transaction (`uss.execute_account_deletion`, SECURITY DEFINER, re-checks authority):

| Data | Action |
| --- | --- |
| Account email / display name / last login / verification time | Replaced by `deleted-<account id>@erased.invalid` / cleared; status → `deactivated` |
| Roles | All assignments removed |
| Outstanding email-verification tokens | Invalidated |
| Member profile (name, phone, birth date, gender, city, emergency contact, Instagram, jersey, preferences, consents, avatar review) | Row deleted |
| Avatar media rows | Archived, alt text/caption/filename cleared; physical objects queued in `uss.data_erasure_objects` |
| Upcoming registrations (pending/confirmed/waitlisted, event not started) | Cancelled (releases capacity) |
| Registration custom-field answers, staff notes | Deleted / cleared |
| Event passes | Revoked by the existing account-status trigger |
| Notification deliveries | Recipient → `erased@erased.invalid`, rendered payload → `{"erased": true}`, queued items cancelled |
| Deletion request free-text reason | Cleared |

After commit (external I/O can never join the transaction):

- Avatar objects are deleted from the private bucket through the erasure adapter
  (`lib/data-rights/data-rights-adapters.ts`, S3 `DeleteObject`, only `member-avatars/<uuid>.<ext>` keys on the
  provider that stored them). Each attempt is audited; failures stay `pending` and are retried by running
  **Execute** again (idempotent; the erasure itself never runs twice).
- Sessions: USS authorization fails closed immediately because every guarded request re-reads account
  status from the DB. Provider-side session revocation is attempted through the Neon Auth admin API when
  available; the outcome (`data_rights.sessions.revoked|unavailable`) is audited.

## 4. What is retained, and why

| Retained | Form | Reason |
| --- | --- | --- |
| Account row (id, member number, opaque barcode, provider id) | No contact data | Referential integrity for history; blocks silent re-provisioning of the erased identity |
| Audit log rows | Unchanged, append-only; actor id now resolves to an anonymised account (pseudonymised) | Security and accountability record |
| Past registrations, check-ins, pass status rows | No name/answers/notes | Anonymised attendance counts and event history |
| Notification delivery facts (type, status, timestamps) | Recipient/payload redacted | Delivery accounting |
| Deletion request row | Status, timestamps, decision reason, erasure counts | Proof the request was honoured |
| CMS content the person created as staff | Unchanged (organisation content) | Not personal profile data; bylines need separate editorial review |

Retention periods for these residual records are **not yet decided** (owner gate). Until then they are kept
indefinitely in pseudonymised form.

## 5. Known limitations / owner gates

- Re-signup with the same provider identity is blocked (provisioning reports `ACCOUNT_CONFLICT`) until the
  Neon Auth user is removed by an operator. Provider-identity deletion is not automated.
- Provider session revocation depends on the Neon Auth admin API being enabled for the server; otherwise it is
  recorded as `unavailable` (USS access is still denied).
- Published event media in which the member appears is handled through the existing content-review process,
  not by this flow.
- Backups follow the database provider's retention window and are not rewritten.
- Final retention periods and the public privacy wording require owner (and ideally legal) approval.
