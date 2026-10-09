# USS workspace UX contract

Business source: docs/CMS-FOUNDATION.md, current user decisions 2026-10-02. Roles and account barcode are user requested; production authorization remains deferred.

## Canonical UI Map

| Capability     | Canonical owner                         | Source of truth                         | Allowed variants                          | Verification                |
| -------------- | --------------------------------------- | --------------------------------------- | ----------------------------------------- | --------------------------- |
| Form           | components/ui/Field.tsx + controls      | This contract                           | input, password, select, textarea, choice | Typecheck + browser         |
| Select/Listbox | Native select                           | Platform popup accepted for phone usage | role, status                              | Browser keyboard            |
| Scrollbar      | app/cms.css                             | DESIGN.md runtime mapping               | horizontal navigation                     | narrow viewport             |
| Toast          | components/ui/Toast.tsx + inline status | This contract                           | success, error                            | Save and storage failure    |
| CRUD           | DemoProvider update                     | docs/CMS-FOUNDATION.md                  | local demo                                | Stories create/edit/archive |
| Date           | Text event date                         | demo event scaffold                     | string                                    | no calendar promises        |

## Behavior

Public pages remain accessible. Preview role selector is clearly labeled demo. Member sees own profile and identity; CMS blocks member view and super admin alone sees user management. This is UI demonstration, never authorization. Production server routes must fail closed until session verification exists.
Story saves return to list; validation preserves values; archive is reversible through edit. Editing story forms can be cancelled explicitly; draft text is not auto persisted until Save Story. Website draft edits save immediately in browser; publish copies draft to local public preview. Upload errors preserve prior images and allow retry. Local storage errors are visible and no successful save is announced. State is intentionally device-local; no promise of remote publishing.
No hard-delete actions. No native confirm/alert dialogs. Real registration and check-in remain unavailable. Search is synchronous over capped local demo list, with explicit clear. Activity limited to 30 rows. Browser locale controls select geometry; owned copy is Indonesian and time display uses Asia/Jakarta.

## FE-01 shared form foundation

Product source: docs/PRD-USS-RUNNING.md section 5. components/ui owns control appearance,
label/hint/error association, password visibility, button loading, modal, toast and empty/loading patterns.
Controls.tsx remains the Indonesian local-demo adapter; server actions and their authority are unchanged.
Native selects and datetime-local use platform-owned popups intentionally; Asia/Jakarta remains the event-time contract.

Field errors reserve three lines at every width. Longer errors wrap in a keyboard-focusable, scrollable
message region; they never push the next field. Success feedback uses the same region.
Hints remain fully visible and wrap naturally. Callers supply human-readable messages and validation rules.
Required is both a visible marker and native metadata on the control; the wrapper never invents business rules.

Buttons default to type=button. Submit buttons explicitly set type=submit. Busy labels overlay the idle
content to retain dimensions. Pending actions disable submission. Native modal dialogs make background
content inert, trap focus, support Escape, and restore focus; destructive confirmation focuses Cancel first.
ToastProvider deduplicates messages, caps the stack at three and places dismissible notifications at the top
away from bottom form actions. Important errors also belong inline; toasts are never the only recovery path.
Existing demo inline feedback remains appropriate for device-local edits.

Auth split scrolling is owned by the login/join shells above 1000px; each form panel scrolls independently.
Below that width, document scrolling owns the form. Short desktop visual panels can scroll rather than clip.
Public/member/admin routes always retain document scrolling.
The /design-system reference returns notFound outside development. It performs no backend operations.

## Public navigation ownership

SiteHeader is the sole public navigation component on Home, About, Runs, Membership, Stories,
Partners and existing detail/legal pages. It derives current item from usePathname, including nested paths.
Mobile MENU uses shared Modal, supports keyboard focus/Escape, and closes after route selection.
It does not close when its long menu scrolls; modal cleanup restores document scrolling.
Auth retains its simpler branded shell. PageHero owns intro presentation, not copy.
Existing SiteFooter remains the sole public footer. Navigation never renders a distance meter.
Motion-specific progress remains Home-only.

## FE-02 authentication behavior

Canonical auth owners: components/auth/AuthShell.tsx, AuthFlow.tsx, AuthStatus.tsx, ResendVerification.tsx and useAuthRequest.ts. lib/auth/contract.ts owns typed adapter results; auth-errors.ts owns code mapping/copy; validation.ts owns immediate field validation; policy.ts exposes only public existing membership rules; return-path.ts owns safe destinations. docs/FE-02-AUTH-FRONTEND.md records current backend integration limits.

Requests run only on explicit submit, with a synchronous duplicate lock and idle/submitting/settled result phases. Recoverable failures preserve values. Register transitions only on a trusted verification_required result, never client activation. Verification/reset success returns to sign in. Forgot recovery copy does not disclose account existence. Resend countdowns originate from response timing; authorization and rate limits remain backend-owned.

Existing /login query views provide verification/forgot/reset and session-expiry presentation without route restructuring. Safe return paths exclude external URLs and auth/API/reference loops. Account statuses come from adapter results, never roles/query/localStorage. Lifecycle operations without a maintained backend contract fail honestly with unavailable feedback; the development reference remains production-inaccessible.

## FE-03 member profile behavior

Business sources: PRD sections 3, 7, 18–19; ERD proposed member_profiles; docs/FE-03-MEMBER-FRONTEND.md records the provisional boundary. The original FE-03 foundation predates BE-04; the AUTH-CUTOVER-owned adapter now projects its trusted owner contract. Proposed ERD columns do not constitute an implemented API. Production does not infer active/verified status from the provider session, write legacy profiles, or manufacture completion.

MemberDashboardShell owns member navigation and one main landmark. Mobile navigation reuses Modal; current links use aria-current. Profile sections reuse canonical Field/Input/FormSection/FormActions, Button, Toast and validation associations. ProfileCompletion only presents response percentage/missing fields. MemberFeedback reuses FE-02 AuthStatus, code normalization, verification route and safe return paths.

Profile saves are pessimistic, submit-locked and revision-aware. Recoverable failures preserve edits; conflict requires an explicit return/reload rather than silently overwriting. Internal links and sign-out use MemberNavigationGuard's discard dialog; actual unload uses beforeunload. Same-page anchors remain usable. Browser history navigation is not comprehensively blocked. Sensitive edits are not persisted in browser storage. Restricted responses remove protected form content. Optional marketing controls and unsupported profile fields wait for BE-04; registration remains the owner of required privacy consent.

Member route titles follow `{Page} — USS Running`. Controlled errors leave navigation and sign-in/retry available; unavailable events are distinguished from a known empty registration list. The guarded reference uses fictional data and cannot activate in production.

## FE-04 / FE-05 trusted frontend boundary

Business sources: docs/MEMBER-CARD-SERVICE.md and docs/RBAC-AUDIT-FOUNDATION.md. getOwnMemberCardPresentation, getAuditHistory, getRevisionHistory and getHistorySnapshot remain the sole existing service contracts. Shared DTOs are imported directly; no duplicate REST/session/auth model. Server reads/actions enforce lifecycle and permissions independently of presentation.

features/permissions/server.ts projects only backend-verified roles, granted permission names and own display name. PermissionsProvider/usePermissions/PermissionGate and permissionView are the central presentation owners. Client roles never derive grants; default context denies everything. Member CMS entry and CmsShell navigation consume this projection. /admin requires BE-06 requireAnyPermission via its server adapter before rendering protected UI. Query views cannot grant access. Legacy CMS writes/public.* crosswalk are not silently activated; unavailable modules are explicit boundaries rather than fake operations.

Member Card refresh removes the card while checking current status and replaces it with controlled lifecycle/network/service feedback on failure. The barcode is identifier-only; it never reserves a slot or proves check-in. Rendering failure has explicit retry; exports use the same value, contain no credential and may represent historic status. Avatar fallback, escaped names and bounded responsive code area preserve usability.

Audit GET filters default to backend 25/30-day policy, cap at 100/366 days and reset pagination. Next/first navigation preserves the exact backend window (including microseconds), filters and opaque cursor. No count/offset/total is invented. Actor display uses only safe backend displayName or neutral account/system label; private actor IDs and raw metadata are not displayed. Existing /admin query views keep routes unchanged.

Revision preview is a safe partial typed snapshot, never a restore point or complete backup. Generic views never show raw JSON, rich content or unsupported fields, and implement no restore/edit/delete. A parent reference is supplied by an editor/audit link or explicitly entered; all IDs are independently checked by backend services. Forbidden/missing/service failures remain controlled. Native date/select popup ownership is accepted for this English USS interface. The production reference route remains inaccessible; fictional card/permission/history fixtures are independently guarded and cannot grant backend authority.

Audit date filters use native date inputs owned by the browser; dates are explicit UTC calendar boundaries. This avoids a second date-picker interaction system.

## FE-06 dashboard boundary

The overview now consumes BE-04 getOwnMemberProfile through a request-local server adapter.
Only displayName (profile, then account, then issued member ID), memberId, active/verified status,
avatar and authoritative completion are projected into its client boundary. Email, contact details,
profile concurrency version and barcode are not serialized into the overview. FE-03 profile editing
keeps its separate adapter/cutover ownership; this dashboard does not redefine profile policy.

DashboardScreen uses loading -> settled success/error. Explicit refresh performs another guarded
server read, removes private content while checking, blocks repeated activation and discards late
responses after unmount. Denied/inactive failures never retain member identity. ServiceFeedback
reuses FE-02 lifecycle/session copy and safe sign-in return paths; unknown infrastructure errors
remain controlled unavailable feedback. No automatic polling, browser storage or fake identity.

DashboardSection is a content slot for future independently loaded domain sections. Current event
registrations/history/passes/notifications have no owner collection contract and explicitly report
unavailable, not a fabricated empty list or zero count. A future known-empty collection may use the
shared EmptyState after the service confirms it. Member Card links to FE-04; no barcode is rendered
or generated by the dashboard. PermissionsProvider/PermissionGate remain presentation owners.
Development-only dashboard fixtures are independently gated and cannot activate in production.
