# FE-04 / FE-05 delivery report — 2026-10-09

## Architecture findings

FE-04A was recorded before implementation in FE-04A-ARCHITECTURE.md. Existing Next.js App Router server actions are the integration boundary; no new API or auth provider. FE-01 controls/tokens and FE-02 AuthStatus/return-path feedback are reused. MemberDashboardShell supplies functional navigation and mobile dialog grammar. BE-05 supplies exact MemberCardResult/MemberCardPresentationDTO; BE-06 supplies permissions, history policy, audit/revision actions and typed results. Production reads enforce fresh backend account/status/permission guards.

The completed backend branch was integrated into the frontend branch with merge 1670bae. Its package.json/package-lock.json snapshot is unchanged by frontend work; inherited FE-02/FE-03 adapters are preserved. No backend-owned source/API or backend regression tests changed relative to this integration baseline. The engineering-rules commit a91f910 is separate from frontend feature commits.

## FE-04 result

/dashboard/member-card server-loads getOwnMemberCardPresentation through a request-cached server adapter. Explicit loading, success, anonymous, pending, suspended, deactivated, missing profile, forbidden, service and network feedback replace blank screens. Refresh discards the displayed card while rechecking; a busy ref prevents repeated requests. Recovery preserves safe navigation. Defensive presentation rejects malformed/unsupported barcode data and non-active success DTOs.

MemberCard is reusable; backend DTOs remain shared. Avatar/Unicode initials, escaped wrapping name, active/verified text, distinct human member ID, centered USS branding and accessible identifier-only barcode are displayed. A failed avatar before hydration now falls back correctly. Existing qrcode renders the exact backend-issued USS-UUID value with correction H and four-module white margin. Branding sits above the code rather than damaging modules. SVG download is the exact displayed SVG; no identity is generated. Download/render failures are controlled. Full opaque UUID, email and phone are not presented as noisy UI text or added to the payload. Member barcode does not log in, register or check in a member.

## FE-05 result

features/permissions/server.ts obtains fresh BE-06 authorization and projects only roles, granted permission names and own display name. permissionView, PermissionsProvider, usePermissions and PermissionGate centralize can/canAny/hasRole presentation. A claimed role alone never constructs grants. Default context denies access. Backend requireAnyPermission gates /admin independently of navigation. Server actions retain independent permission enforcement.

Member navigation exposes USS CMS only with a trusted grant. Existing /admin query views use permission-filtered navigation: members have no administrative modules; admins have operational content/history; super_admin additionally has members/settings capabilities. No fake Roles/Partners routes were added. Members/role management, settings and legacy content/media mutations show honest integration boundaries: BE-06 explicitly leaves legacy public.* identity crosswalk and protected writers for later work. No unsafe legacy action is wired into the new production workspace. The old workspace remains an isolated development reference.

## Audit and revision foundation

Audit uses getAuditHistory, default 25/max 100 records and default 30/max 366-day policy. GET filters expose UTC calendar boundaries, exact action, entity category and bounded size. Cursor links retain exact server window microseconds, filters and opaque cursor; no totals are invented. Wrapping lists show safe actor display name/system label, action, entity, changed field names and Asia/Jakarta timestamps. Actor account IDs, unsafe metadata and exceptions are not displayed.

Revision history uses getRevisionHistory/getHistorySnapshot for four canonical entity types. Parent reference comes from an audit/editor link or explicit input; backend validates ownership/scope. Typed scalar previews show only allowed partial fields, with pagination and controlled empty/invalid/missing/forbidden/service states. They are labelled Revision preview and never claimed complete or restorable. No restore action exists.

## Validation results

- Clean install: npm ci --ignore-scripts passed; 267 packages installed, 268 audited, zero vulnerabilities. Existing peer/deprecation notices remain. npm install was not run separately. No manifest/lock upgrade or drift was introduced.
- npm run build: passed, including the repeat after avatar fix.
- TypeScript: node node_modules/typescript/bin/tsc --noEmit --incremental false passed, including final repeat.
- Backend regression: 106/106 passed: DB23, auth18, email19, profile21, member-card6, RBAC/history19. These use isolated PGlite/provider fixtures, not production infrastructure.
- New Node frontend tests: 19/19 passed (card8, permissions/history11), final repeat passed. Existing Node testing pattern reused; no framework added.
- Browser assertions: 36/36 passed on final runs (30 layout/state/navigation checks + 6 interaction checks). An initial avatar fallback assertion failed; the pre-hydration failure was fixed and retested successfully.
- Responsive: 320/375/768/1024/1366px; 1366x768; mobile 320x480; desktop/CMS 200% CSS zoom. No horizontal page overflow in tested card/revision layouts. Long names/previews wrap; barcode fits; mobile dialog opens/dismisses with Escape. Screenshots manually inspected at 320px. CSS zoom is an approximation, not a native browser-zoom certification.
- Browser interactions: actual SVG download matches displayed SVG and filename; network retry feedback; broken-avatar initials; permission-revoked history hides data even under elevated presentation fixture; next-page link keeps backend microsecond window/limit.
- Production smoke: eight public/auth routes returned 200; /design-system reference returned 404; unauthenticated /dashboard/member-card and /admin with role=super_admin returned controlled feedback with no card or fictional identity. HTTP200 is the controlled page UX, not successful authorized data access.
- Accessibility: semantic headings/nav/links/buttons, FE-01 labelled/associated fields, text status, barcode description, visible inherited focus, async status/alerts and mobile dialog Escape checked. Screen-reader/device assistive testing remains staging scope.
- Strict premium static audit: zero errors/warnings/findings. Native date ownership recorded. git diff --check passed.
- npm run lint: failed with the known Next16 unsupported next lint command (Invalid project directory .../lint). Tooling/dependencies were not modified to conceal this.

Evidence: fe-04-05-evidence/backend-regression.json, browser.json, browser-interactions.json, production-smoke.json, card-320.png, cms-320.png and FE-04-05-static-audit.json. Browser scripts use the preinstalled external Playwright runtime and Chrome; no project dependency added.

## Limits and next work

Frontend limitation: profile/overview retain the FE-03 provisional integration, intentionally outside this scope. Keyboard/mobile interaction checks do not replace real assistive-device certification.

Backend integration limitation: operational legacy CMS writes, user/role/settings mutations and public.* crosswalk remain disconnected until protected typed services are supplied/reviewed. Real authenticated BE-05/BE-06 reads have not been exercised against Neon in this task. Canonical service/action code is integrated and unauthed local reads were exercised; backend security/data behavior was validated with isolated regression fixtures.

Staging-only validation: real verified/member/admin/super_admin sessions, role revocation across sessions, real actor/history data, device camera scan, printed/downloaded code scan and live network failures. This Chrome runtime has no BarcodeDetector; no independent physical decode was claimed. No verification email was sent.

Future scope: finish protected CMS writers/crosswalk and profile integration, then module editors. Event passes, registration, attendance/scanner, barcode reissue and revision restore remain separate domains.

## Git and safety

Branch: feature/member-card-rbac-frontend. Feature commits: 3f7df20 (FE-04), 4d3f410 (FE-05 permissions/shell), b427fae (avatar hydration fix), plus the following audit/revision delivery commit. See git log for the final immutable SHA. The report is committed with history UI/evidence. Push/clean-tree result is supplied in the final response after execution.

main remained 8eb9e394c2c6b7aa60221232d3f64b02394e7c84. Backend integration merged only into the dedicated frontend branch. No merge or push to main, production DB change, migration, email delivery, deployment, identity generation, dependency upgrade or lockfile drift from backend baseline occurred.

## Files added/modified

- `DESIGN.md` — modified
- `UX-CONTRACT.md` — modified
- `app/admin/error.tsx` — added
- `app/admin/loading.tsx` — added
- `app/admin/page.tsx` — modified
- `app/dashboard/layout.tsx` — modified
- `app/dashboard/member-card/loading.tsx` — added
- `app/dashboard/member-card/page.tsx` — modified
- `app/design-system/page.tsx` — modified
- `app/layout.tsx` — modified
- `components/dashboard/MemberDashboardShell.tsx` — modified
- `docs/FE-04A-ARCHITECTURE.md` — added
- `features/cms/CmsModuleBoundary.tsx` — added
- `features/cms/CmsShell.tsx` — added
- `features/cms/cms-foundation.css` — added
- `features/cms/navigation.ts` — added
- `features/member-card/api/server.ts` — added
- `features/member-card/components/MemberBarcode.tsx` — added
- `features/member-card/components/MemberCard.tsx` — added
- `features/member-card/components/MemberCardReference.tsx` — added
- `features/member-card/components/MemberCardScreen.tsx` — added
- `features/member-card/member-card.css` — added
- `features/member-card/utils/barcode.ts` — added
- `features/member-card/utils/presentation.ts` — added
- `features/permissions/Permissions.tsx` — added
- `features/permissions/model.ts` — added
- `features/permissions/server.ts` — added
- `features/shared/ServiceFeedback.tsx` — added
- `premium-ui.json` — modified
- `tests/frontend-loader.mjs` — added
- `tests/frontend-member-card.test.mjs` — added
- `docs/FE-04-05-static-audit.json` — added
- `docs/fe-04-05-evidence/backend-regression.json` — added
- `docs/fe-04-05-evidence/browser-check.cjs` — added
- `docs/fe-04-05-evidence/browser-interactions.cjs` — added
- `docs/fe-04-05-evidence/browser-interactions.json` — added
- `docs/fe-04-05-evidence/browser.json` — added
- `docs/fe-04-05-evidence/card-320.png` — added
- `docs/fe-04-05-evidence/cms-320.png` — added
- `docs/fe-04-05-evidence/production-smoke.json` — added
- `features/cms/CmsReference.tsx` — added
- `features/history/AuditHistory.tsx` — added
- `features/history/RevisionHistory.tsx` — added
- `features/history/query.ts` — added
- `tests/frontend-permissions-history.test.mjs` — added
- `docs/FE-04-05-REPORT.md` — added
