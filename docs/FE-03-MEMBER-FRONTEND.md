# FE-03 member frontend integration boundary

Status: provisional UI contract. BE-04 and the production account-lifecycle contract are absent from this checkout. This document does not define a backend API or change the proposed schema.

## Production behavior

`lib/member/server.ts` reads the existing trusted provider session once per server request via React cache. No session returns UNAUTHENTICATED; the UI links to the existing FE-02 login with a safe intended route and expiry presentation. A provider session alone does not establish active/verified member status. Until BE-04 is connected, it returns PROFILE_UNAVAILABLE. No profile SQL, provisioning insert, event query or identity generation runs.

`lib/member/profile-action.ts` is the single authorized update boundary: no session returns UNAUTHENTICATED; otherwise PROFILE_UNAVAILABLE. It does not call the legacy profile action, forward unsupported values to a database, or claim a save. Existing backend/session/action files are unchanged. The existing sign-out action is reused.

## Provisional presentation DTO

`lib/member/contract.ts` owns MemberResult: ready(profile), or error(code, optional field indicators). Ready must mean a server-authorized own-profile read for an active, verified account. Restricted results contain no profile. The DTO contains:

- values: fullName, phone, city, instagram, emergencyContactName, emergencyContactPhone
- memberId: human-readable summary only; no barcode value or account role
- revision: backend-issued concurrency/version identifier
- completion: backend-issued percentage and missingFields
- policy: client-visible required fields, maximum text lengths and phone digit bounds

These editable concepts already exist in the legacy scaffold; their naming is a provisional UI model, not an exact BE-04 request DTO. No speculative birth date, gender, jersey, running-preference or marketing field is persisted or presented. These controls await BE-04's supported fields, enum options, privacy policy and validation rules. Required registration privacy consent remains FE-02's responsibility.

The decoder validates and whitelists the DTO, rejects malformed successes/policies, strips extra data and never renders raw upstream messages. Known auth errors normalize through FE-02; PROFILE_UNAVAILABLE and PROFILE_CONFLICT add profile-specific outcomes. Server field indicators become owned correction copy. Local validation respects response policy, optional empty values, phone format/bounds and paired emergency details. The form never derives completion rules or active-member status.

## BE-04 connection checklist

Replace the unavailable boundary with the existing BE-04 authorized service/API, map its exact DTO into this presentation model, and translate the form to its exact update request. Keep ownership/status checks on the server for every read and mutation. Supply authoritative completion and visible rules. Map validation field codes, stale revision, session expiry, restrictions, network and service failures. A successful update must return the newly confirmed profile and completion; do not optimistically announce a save. Extend supported controls only after their backend contract is known.

Events and registration history currently show unavailable copy, not fabricated empty records. Member Card, Events and Settings routes are scoped placeholders. Legacy RSVP/pass/barcode presentation is no longer in the overview; backend actions and barcode primitives remain unchanged for their later scoped tasks.

## Development reference

The existing `/design-system` server route returns 404 unless NODE_ENV is development. MemberReference and its fictional adapter independently refuse production activation. Use `?surface=member&flow=overview|profile&scenario=active|complete|long|pending|suspended|deactivated|expired|unavailable|failure|loading|save-failure|stale|malformed|server-validation|save-expired`. This creates no session/account, calls no backend/provider, stores no personal data and grants no production authority. Completion numbers/rules are clearly isolated fixtures, not frontend production calculations.

Unsaved edits are held only in memory. Internal links and sign-out prompt with the shared discard dialog; real unload uses the browser lifecycle warning. Back/forward is not comprehensively intercepted. Restricted mutation outcomes hide form data and guide recovery; re-authentication does not persist personal drafts.
