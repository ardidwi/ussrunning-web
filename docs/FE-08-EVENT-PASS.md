# FE-08 — Event Pass UI

## Architecture and routes

MemberDashboardShell, FE-01 controls/feedback/loading and the existing permission presentation
layer remain canonical. `/dashboard/registrations/[id]?eventId=…` implements the PRD registration
detail entry without restructuring `/runs/[slug]` or the existing dashboard/history routes.
Pass details mark Events active in desktop/mobile navigation. No scanner or CMS writer changes.

`features/event-pass/api/actions.ts` consumes BE-08 `getCurrentRegistration` and BE-09
`getCurrentEventPass` / `issueCurrentEventPass`. Only eventId/registrationId cross the request
boundary; backend services resolve trusted ownership, lifecycle and eligibility independently.
Shared RegistrationDTO, EventPassDTO and PassResult types are reused. Reads never issue;
explicit Request Event Pass is backend-idempotent, followed by a fresh guarded read. The PRD's
automatic issuance/confirmation email orchestration is not implemented by this frontend.

EventPassScreen owns idle/loading/issuing and settled backend results. PassFeedback reuses
FE-02/06 account/session feedback. Pending/unverified, suspended/deactivated, forbidden,
missing, waitlisted, cancelled, revoked, expired/ineligible, unavailable/network/server states
have controlled recovery and no scannable QR. Refresh and issuance remove the QR while checking,
guard repeated requests, ignore unmounted responses and restore focus. Returning from background
rechecks access; backend expiry schedules a fresh read, never a client-derived expired/eligible verdict.

Registration history and recent dashboard records use the shared PassEntry. Check Event Pass
performs an explicit owner read; only a successful active result offers View Event Pass.
NOT_FOUND offers Request Event Pass. List navigation receives no credential. No automatic
per-record request waterfall, list API, remaining capacity, canCancel or fake availability.
BE-08 cursor pagination and the three-record dashboard preview are preserved.

## QR branding contract

`features/qr/BrandedQrCode.tsx`, `branding.ts` and `render.ts` reuse the existing qrcode package.
They encode exactly BE-09 barcode.value, never member ID, PII, URL wrappers or frontend identity.
No token is displayed as primary text, logged, placed in navigation/analytics or persisted in
browser storage. The DTO has no member display name, so the pass adds no second profile/PII read.

QrBranding supports centerLogoUrl, logoScale (fraction of symbol width), logoPadding (QR modules,
inside the bounded patch), errorCorrection, foreground/background and quietZone (QR modules).
Event Pass uses H correction. Logos clamp to 12% of symbol width; padding clamps to 0.5 modules;
quiet zone clamps to 4–12 modules. Colors require opaque light background/dark modules with
high contrast or fall back to black/white. Reserved finder/timing/format/alignment modules are
never obscured: a protected center renders plain. Logo selection is event override -> USS asset
-> plain on image failure; explicit null requests plain. QR has no animation, stays responsive,
and includes an accessible description plus phone brightness/current check-in guidance.

No persisted per-event branding field exists. Production uses USS defaults; query parameters
cannot set branding. A future backend/CMS projection must supply validated media branding
without changing the token contract. Permanent member barcode/export remains unchanged.
Screenshots are credentials for presentation, not offline validation or attendance proof.

## Verification

Final evidence is recorded in `fe-08-evidence`. New Node tests cover typed delegation, denial,
credential-free navigation, failed issuance, rechecking, protocol/resource mismatch, unchanged
payload and branding bounds. Browser fixtures are independently development-only, clearly
fictional, and production reference/custom-logo routes return 404.

The browser suite uses bundled Playwright/Chrome and an independent jsQR 1.4.0 decoder installed
only under the owned temporary tool directory (npm pack, not a project dependency). It decodes
actual rendered screenshots at 320/375/1024px for USS/custom/plain/oversized/failing-logo cases.
The Next development-only floating indicator is hidden only during these captures, because it
otherwise overlays the QR; no product content/modules are hidden. Physical scanning is separate.
Screenshots are stored outside Git under the owned FE-08 visualization directory.

Final integrated results:

| Check | Actual result |
| --- | --- |
| npm ci --ignore-scripts | PASS; 259 added / 260 audited / 0 vulnerabilities; existing transitive deprecations retained |
| npm run deps:check | PASS; no FE-08 manifest/lock diff |
| npm run build | PASS |
| standalone tsc --noEmit --incremental false | PASS |
| combined Node regression | 338/338 PASS, including 31 FE-08 and 37 incoming BE-11 tests |
| FE-08 browser | 128 cases / 386 assertions PASS; runtime 0 / hydration 0 |
| independent QR screenshot decoding | 16/16 PASS |
| FE-07 browser regression | 138 cases / 254 assertions PASS; runtime 0 / hydration 0 |
| existing UI audits | form 27 responsive + 5 interactions; public 80 responsive + 2 nav + 1 motion + 4 zoom; workspace 10; auth 53 responsive + 35 flows; profile 41; dashboard 43 cases / 154 assertions; card/CMS 30 layout + 6 available interactions PASS |
| anonymous production local smoke | 62/62 PASS; 320/375/768/1366 + 200% zoom; production reference/logo endpoint 404; runtime/hydration 0 |
| strict UI audit | 0 findings |
| npm run lint | Known FAIL: unsupported next lint / invalid lint directory under Next 16 |

Coverage includes 320/375px, tablet, desktop, short viewport, 200% zoom, long title,
visible keyboard focus/restore, reduced motion, duplicate issue/check prevention, no token
text/URL leakage, revoked/restricted/network refresh, expiry recheck and dashboard/history entry.
Five older audit hydration warnings (auth 2 / public 3) remain; they do not affect the fresh pass
or production smoke results and are not suppressed or claimed resolved.

Initial checks exposed the Next tooling overlay covering QR screenshots and an intentional
empty-body 404 endpoint causing browser navigation failure. The decoder capture hides only
Next tooling; the endpoint guard is checked with an HTTP request. A transient Next router
initialization exception during live edits was recorded, then absent in the frozen final suite.
The expiry review removed a client-clock-derived verdict in favor of a backend recheck; all
relevant validation was rerun. No failed run is counted as a pass.

## Boundaries and remaining dependencies

- **Frontend:** no pass export/reissue/restore, scanner, payment, email or client authorization.
  Persisted event-specific QR branding remains a future backend/CMS extension.
- **Backend integration:** approved persistent migration 010 and dedicated server keyring setup,
  trusted active owner/role sessions and real issuance/read/revocation QA remain staging gates.
  No real active-member mutation or email delivery was tested/performed here.
- **Staging/device:** screenshots decoded in software do not prove camera, glare, brightness,
  sharing/replay handling or server-authorized attendance. FE-09 consumes BE-10 with trusted
  staff permissions, event/window checks and current eligibility; no scanner logic was changed.
- **Existing QA:** unsupported Next 16 `next lint` is retained. Older auth/public audit hydration
  warnings remain a root-cause task; successful FE-08/deployed probes do not close it.
- **FE-12:** public legacy/editorial event migration, operational CMS writers and validated
  per-event branding/media ownership need their own contracts and implementation.

## Delivery safety

Started at 0425feaa4715ea4f4f9cc0f287b771a855064a86. Main advanced with BE-11
3ca433b5b6648e17ecc70df7499b0875cdb6982b; its media service, migration and approved Sharp
manifest/lock changes were inspected and preserved by forward-only fast-forward while FE-08
edits remained intact. FE-08 introduces no manifest/lock drift. BE-09/BE-10 are untouched.
Task/main/deployment SHAs are verified after push and returned in the delivery report.
No force push, history rewrite, discarded work, auth configuration change, persistent database
mutation/migration or production-readiness claim. Main deployment is manual development review.
