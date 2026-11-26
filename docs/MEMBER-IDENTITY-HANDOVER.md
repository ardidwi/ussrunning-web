# Member Identity integration handover

Branch `local/member-identity` started at `df5924760ef19b759582b5d7a84d2ed935d1143c`. The work covers D0.5, D1.1–D1.5, and D1.7–D1.11. D1.6 and the staff moderation queue in D2.4 are separate deliverables. The lead owns integration and deployment.

## Shared contracts

- Migration `020_member_identity.sql` uses the allocation in the go-live delivery plan. It backfills permanent sequence numbers while preserving old account IDs, barcodes, versions and timestamps. Apply it before the application code and apply the sequence grant from `database/runtime-grants.sql` to the existing non-owner runtime role. Keep bootstrap out of application grants.
- Run `npm run admin:bootstrap` only on the intended operator connection with `DATABASE_URL_UNPOOLED` and `USS_SUPER_ADMIN_EMAIL` set. The target needs a provisioned, verified active USS account. Repeating for the chosen account is idempotent. The database serializes bootstrap against other super-admin role changes and writes one audit entry on the first successful grant.
- Reconcile shared changes in `lib/authz/permissions.ts`, `features/permissions/model.ts`, `features/cms/navigation.ts` and `app/admin/page.tsx`. `media.upload.self` belongs to baseline membership. `members.lookup` and `members.photo.review` belong to admin and super admin. The scanner at `/admin?module=member-scanner` receives name, member ID, account status and a short-lived photo URL when available.
- For D2.4, `moderateMemberAvatar` accepts `{ accountId, avatarId, decision, reason? }`, where decisions are `approved` or `rejected`. Rejection requires a member-facing reason of 5–240 characters. The action compares the submitted avatar ID against the current photo and checks the backend staff permission. The future queue needs an authorized read that excludes emergency contact details and raw storage keys.
- For automatic pass issuance, reuse `uss.member_profile_missing(account_id)` inside the existing account-lock transaction. An incomplete profile yields `PROFILE_INCOMPLETE` for RSVP creation, pass issuance and pass read. Cancellation, registration history, and staff check-in for previously issued passes retain their existing contracts. Staff check-in remains operational if a staff account has membership onboarding pending.
- Legacy avatars remain in storage. Members with those photos must upload a new private photo to complete onboarding. The card, scanner and directory show the formatted member number, such as `USS-000123`. Legacy readers and the exact directory filter remain compatible with the immutable old UUID-based member ID.
- Public copy follows K-01 and K-02 and needs owner acceptance. These surfaces already use English.

## Security and data boundaries

Server-side photo decoding caps input bytes, pixel dimensions and frames. The pipeline writes a fresh 512×512 WebP without source metadata, keeps the object private, and commits metadata, profile replacement and success audit together. Presigned previews expire according to the existing private storage configuration. PNG export uses an owner-authorized, non-cached same-origin photo read tied to the current asset. The CMS media library excludes member photos. The reference UI and its synthetic identities are development-only.

Upload and barcode lookup quotas are per actor under database account locks. Barcode lookup returns an identity projection and records the outcome without retaining the barcode. A successful storage write followed by a failed attachment may leave an unreferenced private object. Retention cleanup needs a reference audit and belongs to the storage owner. Previously signed URLs may work until expiry after a photo is replaced or rejected.

Use Node.js 22 for verification. Local checks use PGlite and synthetic fixtures. Mobile browser QA uses `/design-system/member-identity` and `scripts/verify-member-identity-browser.cjs` with a development server listening on port 4300. The reference simulates authenticated backend responses. Test authenticated flows, camera capture and downloads on physical Android Chrome and iOS Safari in an isolated environment before launch.

## Local validation

- Node.js 22.23.5 and the committed npm lockfile. Locked install and dependency tree validation passed.
- Clean base commit baseline passed 841/841. The completed regression run passed 848/848 with `--test-concurrency=2`, including all seven new Member Identity PGlite tests. The corrected RBAC run passed 19/19.
- Standalone TypeScript, optimized Next.js production build and eight local production smoke requests passed. The development fixture returned 404 in the production build, and the protected photo route rejected anonymous reads with a no-store response.
- Chromium passed 43 scenarios at 320, 375, 768, 1024 and 1440px with zero recorded browser runtime errors. The synthetic camera decoded the 720×960 downloaded PNG. Keyboard crop and result focus, invalid photo selection, manual scanner entry, and no-match feedback were exercised.
- The local security review covered actor permission checks, lifecycle, the non-owner bootstrap denial, avatar validation and metadata stripping, storage and audit boundaries, replacement conflicts, and the reduced scanner response. Isolated provider and physical phone testing remain launch gates.

## Launch blockers

The existing lockfile resolves affected versions of Next.js and Better Auth. `npm audit --audit-level=moderate` reported two critical, three high and two low package findings. The lead should coordinate shared dependency remediation and provider verification. The registry findings establish the package versions and advisory severity. Exposure through the managed auth provider still needs verification. [Next.js Image Optimization advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Next.js cache advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Better Auth advisory](https://github.com/advisories/GHSA-965c-763c-88jm).

The handover uses local PGlite and synthetic storage. Deployment and persistent-environment changes require lead ownership.
