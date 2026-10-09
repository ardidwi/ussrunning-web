# FE-04A architecture checkpoint — 2026-10-09

Read MEMBER-CARD-SERVICE.md, RBAC-AUDIT-FOUNDATION.md and BE-05-BE-06-VALIDATION.md before frontend edits. Combined FE-03 and the completed backend history on the dedicated frontend branch; backend commits remain intact. The dependency/lockfile snapshot comes unchanged from that backend branch, not from frontend upgrades. main remains 8eb9e394c2c6b7aa60221232d3f64b02394e7c84.

## Existing structure

- Trusted USS session: lib/auth/session.ts resolves Neon Auth; BE-02 maps it to the current account. BE-05 ownRecord uses active/verified guards and a fresh joined profile/card read. BE-06 getAuthorization/requirePermission/requireAnyPermission/requireRole reads fresh DB roles/status. Legacy lib/session.ts provider-role logic is explicitly not the new authority.
- API client: existing server actions, not REST/React Query. Member Card uses getOwnMemberCardPresentation(); audit uses getAuditHistory(); revisions use getRevisionHistory()/getHistorySnapshot(). Reuse their shared result/DTO types. No new API/provisioning/client engine.
- Member layout: FE-03 MemberDashboardShell, modal mobile navigation, profile/overview sections; its provisional profile loader remains outside this task. Replace only the Member Card placeholder with the exact BE-05 owner read. The layout's legacy session read must not block the canonical card response.
- Design system: FE-01 Field/Input/Select/Button/Modal/Toast/Skeleton/EmptyState/Badge and tokens; FE-02 AuthStatus/error copy/return path. Member/card/CMS composition remains black/red/white, square, editorial, with readable functional type. Shared primitives remain canonical.
- Barcode: existing qrcode dependency renders QR image codes. Legacy CMS Barcode exposes the full opaque value in labels/text and silently loses rendering failures; its export burns a logo into the code. Do not reuse those shortcomings for the production card. Reuse qrcode itself, with a four-module quiet zone, backend-issued value verbatim, logo in a separate centered brand area, explicit render/error/export state and SVG rendering-only download. No UUID generation, PII payload, ticket/attendance claim.
- CMS: /admin currently renders AdminWorkspace tabs backed by public.* reads/actions and legacy requireAdmin. BE-06 explicitly did not authorize legacy cutover or implement domain writers. A fresh BE-06 guard and minimized presentation snapshot will own new CMS navigation/read-only history. Existing modules can show honest integration-boundary states; no unguarded legacy mutation is connected. Legacy development reference remains clearly separated. No new role-management backend, restore or CMS writer.
- History: audit default 25/max100, default30/max366-day UTC window; opaque cursors preserve fixed filters/window. Revision preview supports site_content/story/partner/event, safe partial scalar snapshots only. Use the existing /admin route's query views; no invented REST or route tree.

## Planned dependency direction

Server components/actions -> existing BE-05/BE-06 services -> shared DTOs -> reusable feature UI. Server permission projection -> permission provider/can/canAny/hasRole -> navigation and presentation controls. Backend guards continue to enforce every protected read/action regardless of UI state. New frontend authorization snapshots exclude account email/ID/session/provider data.

## Boundaries

No production DB/provider/email operation, migration, deployment, backend commit rewrite or main merge. Real Neon independent sessions/runtime role/crosswalk and physical scan/export validation remain staging gates. FE-03 profile cutover and CMS writers are separate tasks; no silent dual write or legacy role bootstrap. FE-04B/C and FE-05A/B/C will be separately committed and validated.
