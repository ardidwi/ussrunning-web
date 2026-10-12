# FE-09 Scanner / Check-In UI

## Contract and routes

Crew entry: `/dashboard/check-in`; selected event: `/dashboard/check-in/[eventId]`.
The existing dashboard shell presents this navigation only through `PermissionGate`
with `events.manage`. Both managed event reads and every BE-10 scan resolve trusted
server authorization. Hiding navigation is presentation only.

`features/check-in/api/actions.ts` projects managed event metadata and bounds the
selection list to 20 rows with the existing opaque cursor. `submitCheckIn` calls
`scanEventPass({ eventId, value })` unchanged. No account, role or device identity is
submitted. Permanent Member Card values are rejected before submission and remain
independently rejected by BE-09/BE-10.

The managed event DTO does not expose check-in enablement/open/close fields. The UI
shows the event title, timezone-aware start and lifecycle status, and clearly states
that scan availability is checked on submission. It never invents a window or local
eligibility rule. BE-10 determines cross-event, pass, registration, account and window
eligibility and returns authoritative attendance.

## Camera and interaction

`CameraScanner` owns permission/loading/active/denied/unavailable/paused presentation.
`camera.ts` owns getUserMedia, rear-camera preference, bounded sequential decoding,
stream release and lazy native/worker decoder startup. `qr-scanner@1.4.2` is pinned:
its native BarcodeDetector path and worker fallback avoid a large scanner SDK.
The only additional transitive package is its OffscreenCanvas types. No existing
package versions are upgraded. Reference: https://github.com/nimiq/qr-scanner.

The camera is requested only on Start camera. Tracks and worker stop while submitting,
at a result, when hidden, and on unmount. Scan next acknowledges the prior result and
allows a requested camera to resume. A synchronous latch prevents duplicate detections
before React updates; no automatic attendance retry occurs. Rate-limit countdown uses
only BE-10 retryAfterSeconds and does not replace server enforcement.

Manual input uses the same action and event context. Values are forwarded exactly,
never trimmed, parsed into identity, logged, placed in URLs, or stored persistently.
Network/unknown mutation outcomes explicitly remain unconfirmed; repeating an eligible
scan is safe because BE-10 owns idempotency. Safe confirmation shows display name,
member ID, event, confirmed registration and the timestamp. No token/hash, internal
registration/pass/attendance UUID, email, phone or auth ID is displayed.

## States and ownership

ScannerScreen: idle -> submitting -> result -> explicit acknowledgement; refreshing
rechecks failed context. Central copy covers all current CheckInCode values plus network
failure. Success and already checked-in are distinct. Staff account/permission denial
removes scan actions. Wrong-event success data fails closed defensively. Existing FE-01
controls, FE-02 account feedback and FE-05 permission presentation remain canonical.

Development reference `/design-system?surface=scanner` is independently guarded by
NODE_ENV at its route and component/adapter. Its fictional success data never calls
check-in or creates attendance. Production reference routes remain unavailable.

## Validation and delivery

Validation passed: 417/417 Node (44 scanner), scanner browser 118 cases / 644 assertions,
navigation 4 / 16, FE-08 128 / 386 plus 16 independent decodes, FE-07 138 / 254,
FE-06 43 / 154; all reported zero runtime/hydration errors. Clean install, dependencies,
production build, standalone TypeScript and diff check pass. Strict UI audit has zero
findings. Production local smoke passed 73/73. Known next lint is unsupported. Browser
fixtures exercise the actual worker decoder with rendered FE-08 default-logo, custom-logo
and plain QR camera frames. This is synthetic camera testing, not a physical phone scan.

## Operational limitations

Real authenticated active staff mutations and separate concurrent Neon connections are
not validated by frontend fixtures. Physical phones, screenshots on another device,
outdoor brightness, scan distances and iOS/Android camera compatibility require crew QA.
Existing isolated migration/keyring/role setup gates remain BE-09/BE-10 operations work.
No migration, auth configuration, token/check-in semantics or FE-08 behavior is changed.
FE-12 should expose trusted check-in configuration in a supported read contract and
integrate operational event administration. Scanner UI does not add manual attendance
override, participant search, reversal, payment or CMS writers.
