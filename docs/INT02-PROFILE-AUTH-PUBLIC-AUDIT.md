# INT-02 / Auth Content / Public Cutover Remote Audit

Status: remote-safe audit only. This file records contract gaps and integration risk; it does not authorize destructive cleanup or production configuration.

Observed main: `e0b4d292ee7e29863eadc52fb259ecd284310d78`.
INT-01 source integration: `b3e74d3c3f0367c9af380da820dd43ab5d81b1e7`.
INT-02 remains PLANNED in the roadmap at this checkpoint.

## 1. BE-04 profile contract vs current frontend projection

Authoritative BE-04 writable fields (`ProfilePatch`) currently include:

| Backend field | Backend read | Backend write validation | Current frontend editable | INT-02 action |
| --- | --- | --- | --- | --- |
| `fullName` | yes | required when changed, 2..`maxName` | yes | preserve |
| `phone` | yes | normalized `+?[0-9]{7,15}` | yes | preserve, derive limits from shared policy |
| `birthDate` | yes | ISO date, not future, bounded by `maxBirthAgeYears` | no | decide V1 UI or explicit defer |
| `gender` | yes | `PROFILE_POLICY.genderValues` | no | decide V1 UI or explicit defer |
| `city` | yes | 1..`maxCity` | yes | preserve |
| `emergencyContactName` | yes | 2..`maxName`; paired consistency enforced by backend | yes | preserve pair semantics |
| `emergencyContactPhone` | yes | normalized `+?[0-9]{7,15}`; paired consistency enforced | yes | preserve pair semantics |
| `instagramHandle` | yes | normalized lowercase handle, 1..30 | yes as `instagram` | preserve mapping |
| `jerseySize` | yes | `PROFILE_POLICY.jerseySizes` | no | likely useful for event/product workflows; decide explicitly |
| `runningPreferences.distancesKm` | yes | numeric list, each >0 and <=200 | no | explicit V1/defer decision |
| `runningPreferences.days` | yes | bounded to code-owned day vocabulary | no | explicit V1/defer decision |
| `runningPreferences.goals` | yes | up to 5 normalized strings | no | explicit V1/defer decision |
| `avatarMediaId` / `avatar` | yes | UUID + BE-04/BE-11 ownership/reference checks | no | do not fake URL upload path; wire only through approved media contract |
| `marketingConsent` | yes | boolean | no | expose only with clear consent UX/audit semantics |
| `privacyConsent` | read timestamp | write accepts only `true` | no | do not model as reversible checkbox; acceptance is append/consent event |

BE-04 additionally exposes server-owned account/profile metadata that must remain read-only in member UI: account id, email, permanent memberId, account status, emailVerified, displayName, profile version, consent timestamps, updatedAt, completion percentage and missing-field list.

### Current adapter mismatch

The frontend projection currently exposes only six editable presentation fields:
`fullName`, `phone`, `city`, `instagram`, `emergencyContactName`, `emergencyContactPhone`.

That is safe as a partial adapter, but INT-02 must not claim full BE-04 coverage until each omitted field is either:
1. represented in the UI with authoritative validation/options, or
2. explicitly documented as intentionally deferred for V1.

### Validation authority

Current frontend projection publishes `minimumPhoneDigits: 7`, `maximumPhoneDigits: 15`, and selected max lengths. Those values happen to match current BE-04 server validation, but INT-02 should eliminate duplicated policy where practical. The UI may expose presentation hints, while BE-04 remains authoritative for acceptance.

Do not duplicate dynamic server policy into scattered constants. Prefer one shared code-owned profile policy export or a safe typed presentation policy generated from it.

### Optimistic concurrency

Preserve the existing contract:
- backend `profile.version` -> frontend `revision`;
- save sends `expectedVersion`;
- `CONFLICT` never overwrites newer server state;
- user edits remain visible after conflict;
- refresh/reopen loads the authoritative latest profile.

### Lifecycle authority

The member UI may map suspended/deactivated/unverified states to presentation feedback, but it must never mutate or infer account activation. BE-02/BE-04/session guards remain authoritative.

## 2. Auth copy and BE-15 ownership audit

Current source split:

| Surface | Current source | BE-15 target | Recommendation |
| --- | --- | --- | --- |
| Login normal heading/copy | hardcoded `app/login/page.tsx` | `auth.login` | migrate under FE-14/public auth-content cutover |
| Login left visual/copy | legacy `getLoginHero()` in `AuthShell` | `login.visual` | migrate under FE-14; media must be delivery-safe |
| Login next-run panel | legacy `getRuns()` in `AuthShell` | no exact BE-15 slot | use BE-07 public event read if retained; do not overload content CMS |
| Register intro/form copy | hardcoded `app/join/page.tsx` | `auth.register` | migrate under FE-14/public auth-content cutover |
| Forgot password copy | code-owned flow copy | none | keep code-owned until typed slot exists |
| Reset password copy | code-owned flow copy | none | keep code-owned until typed slot exists |
| Verify email copy | code-owned flow copy | none | keep code-owned until typed slot exists; wording must not promise automatic activation |

CMS must never control auth policy, return URLs, verification token handling, resend eligibility, recovery/reset security, account lifecycle, provider authority or session behavior.

Recommended verify wording for later editorial cleanup should describe email confirmation without saying it automatically activates the account. Account state after verification remains backend-owned.

## 3. Public cutover divergence against current main

Compared against `e0b4d292ee7e29863eadc52fb259ecd284310d78`:

| Candidate | Status | Ahead | Behind | Changed runtime files |
| --- | ---: | ---: | ---: | --- |
| `feature/public-stories-cutover` | diverged | 2 | 4 | `app/stories/page.tsx`, `app/stories/[slug]/page.tsx` |
| `feature/public-partners-cutover` | diverged | 2 | 5 | `app/partners/page.tsx` |
| `feature/footer-site-content-cutover` | diverged | 1 | 4 | `components/SiteFooter.tsx` |
| `feature/public-home-site-content-cutover` | diverged | 2 | 2 | `app/page.tsx` |
| `feature/public-events-primary-listing` | diverged | 1 | 2 | `app/runs/page.tsx` |

No candidate should be force-rebased or bundled. Validate from current main, reconcile forward-only, and merge one at a time.

Recommended order remains:
1. Stories
2. Partners
3. Footer
4. Homepage
5. Events listing
6. Legacy retirement re-audit/docs

This order minimizes blast radius: route-local migrations first, global footer after proven path, aggregator homepage later, event compatibility fallback last.

## 4. INT-02 acceptance additions

INT-02 should not be marked DONE until the final checkpoint records:

- exactly which BE-04 fields are editable in V1 and which are intentionally deferred;
- no server-owned identity/lifecycle fields can be edited by the browser;
- policy options/limits used by UI cannot drift silently from BE-04;
- full optimistic conflict behavior remains intact;
- privacy consent is not represented as a reversible preference if the backend contract is acceptance-only;
- marketing consent semantics remain explicit and auditable;
- avatar uses the approved media ownership/reference contract only;
- error/helper text has stable layout space and field-level validation does not cause form jumping;
- loading/disabled/toast/error states remain intact;
- mobile, short viewport, 200% zoom, keyboard and unsaved-change navigation are validated;
- suspended/deactivated/unverified/session-revoked states fail closed.

## 5. Integration guard after INT-02

After INT-02 source integration:

1. fetch/prune and record new main SHA;
2. compare all five public candidates again because ahead/behind counts above will be stale;
3. validate Stories and integrate only if green;
4. verify exact main SHA + Vercel READY/core Stories smoke;
5. checkpoint roadmap;
6. repeat independently for Partners, Footer, Homepage and Events;
7. only then re-audit `lib/content.ts` and remove adapters proven dead.

No branch deletion based only on naming. No force push. No blind `ours/theirs`. No fake content fallback if authoritative public services are empty.
