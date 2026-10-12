---
version: alpha
colors:
  background: "#070707"
  foreground: "#ffffff"
  primary: "#ff3b21"
  panel: "#151515"
  border: "#424242"
  muted: "#bdbdbd"
typography:
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    lineHeight: "1.55"
  display:
    fontFamily: "Impact, Arial Narrow, sans-serif"
rounded:
  DEFAULT: "0px"
spacing:
  panel: "1.5rem"
components:
  Workspace:
    height: "44px"
---

## Overview

USS urban running identity, extending the existing black/white/red website. Product screens prioritize editing from a phone; public editorial retains the established display type.

## Colors

Runtime ownership: app/globals.css defines brand --black, --white, --red. app/cms.css defines --cms-panel, --cms-border, --cms-muted, --cms-gap and maps workspace styling to them. This document records values, not generated output.

## Typography

Impact display headlines used sparingly. Arial body and controls, minimum 14px labels, 16px inputs. Monospace only for account IDs.

## Layout

240px desktop sidebar becomes horizontal navigation below 800px. Document scrolling owns long forms. Preview barcode retains complete quiet zones.

## Elevation & Depth

Flat panels with borders; no decorative shadows.

## Shapes

Square controls and panels mirror established brand.

## Components

Shared Field, ImageField, Barcode and Workspace; provider owns local demo state. Native selects are intentional for mobile platform interaction.

## Do's and Don'ts

Keep demo disclosure visible. Do not present role selection as real login. No decorative fake QR codes. Keep preview images out of security/identity decisions.

## FE-01 runtime tokens and hierarchy

components/ui/ui.css owns shared form aliases of globals.css brand colors:
--uss-bg, --uss-surface, --uss-text, --uss-muted, --uss-border, --uss-control-bg,
--uss-danger, --uss-success, --uss-warning, --uss-focus, --uss-primary-bg, --uss-primary-text.
Light auth panels retain their existing off-white surfaces and black controls; dark CMS/profile panels
retain black/red/white. Square --radius-sm/--radius-md remain 0. Borders remain flat; only modal overlays
use --uss-shadow-modal. No new font or UI dependency is introduced.

Spacing tokens: --space-1/2/3/4/5/6/8/10/12/16 = 4/8/12/16/20/24/32/40/48/64px.
Shared controls use --control-height (52px), body input text 16px, labels/hints/errors 14px.

Typography token roles: display (64–128px responsive Impact), H1 (48–96px responsive Impact),
H2 (32px), H3 (24px), section title (14px bold uppercase), body (16px/1.5),
small body/label/helper/error (14px/1.5), caption (12px). Existing public editorial headlines retain
their approved responsive sizes; these role tokens guide new member/auth/CMS surfaces rather than
globally restyling public pages. Body and controls use Arial/Helvetica.

Form sections own 24px padding and 24px field gaps (16px on narrow screens).
Error regions reserve three lines with visible, operable overflow for longer feedback.
Password controls retain the shared input geometry and a 44px visibility target.
Modal height is bounded by dynamic viewport height; its whole surface scrolls on short screens.
Shared motion is limited to controls/loading and is disabled by prefers-reduced-motion.

## FE-01 public shell extension

The homepage navigation is now the canonical SiteHeader on every public route.
components/layout/public-shell.css owns --page-gutter (16px to 64px), --page-max (1440px),
--header-height (96px desktop / 82px mobile), and --uss-paper / --uss-red brand aliases.
Desktop logo is 140px (110px compact desktop, 92px mobile). The outlined MY USS navigation
variant retains the homepage's pill treatment; normal actions remain rectangular.
Active pathname and nested-route navigation use USS red plus aria-current.

PageHero and SectionKicker own intro spacing/type while pages retain their copy, section order
and unique compositions. Existing light editorial contrast sections are preserved.
Footer uses the same dark surface, borders, type and gutters. Its newsletter uses canonical fields.
SiteHeader owns no distance calculation; HomeMotionExperience alone owns canvas, chapters,
HUD, timeline and 5000m progress. Its rendering engine is unchanged.

## FE-02 authentication flows

AuthShell preserves the existing login visual, typography and scroll composition; join keeps its crew panel. components/auth/auth-flows.css owns composition and uses FE-01 tokens without new colors, fonts or control variants. Critical errors remain inline; account outcomes use restrained bordered status blocks. Labels and policy text stay readable on phones.

## FE-03 member workspace

MemberDashboardShell owns a 240px desktop sidebar and a modal menu below 768px, with document scrolling throughout. The overview uses a restrained Impact welcome, square bordered identity/completion panels, and readable Arial information. Member composition lives in components/dashboard/member-dashboard.css; control tokens stay in ui.css. Existing unused legacy dashboard selectors were retired from cms.css. No public shell, motion or brand color changed.

## FE-04 / FE-05 runtime ownership

features/member-card owns private card composition. It reuses the existing qrcode dependency and the BE-05 protocol validator, with high correction and four-module white quiet zones. The centered USS logo sits in the card's separate brand area, never over required code modules. Member ID is human-readable; the full opaque payload is not noisy text. SVG export renders the same backend-issued value and does not create an identity or credential.

features/cms reuses MemberDashboardShell's functional grammar and FE-01 controls. Permission-aware navigation uses links to existing /admin query views. Audit/revision entries use wrapping bordered lists on all widths, with native platform selects/date inputs. Dates filter UTC calendar days; displayed history timestamps explicitly use Asia/Jakarta (WIB). No new colors/fonts/library or homepage-style marketing hero in CMS. Legacy AdminWorkspace remains a clearly separate development reference pending the backend-documented legacy crosswalk.

## FE-06 overview composition

features/member-dashboard owns the overview, independent domain section slots and loading geometry.
The signature is the member's own name in the restrained USS display face, followed by the functional
identity/completion pair. Four quieter bordered sections reserve space for future activity without
inventing counts, dates or registrations. No new palette, font, radius or spacing token is introduced.
MemberDashboardShell remains the navigation/scroll owner; MemberAvatar is shared with FE-04.

## FE-07 registration composition

features/event-registration owns public event detail and wrapping registration lists, using
the existing public gutters, display hierarchy, flat borders and shared buttons/badges/dialog.
MemberDashboardShell continues to own member navigation and scrolling. Native time elements
display each event's IANA timezone explicitly. No new palette, typeface or dependency.

## FE-08 Event Pass composition

features/event-pass owns the restrained square pass panel, timezone-aware event details,
status and shared actions. Its signature is the large static QR on an opaque light surface;
surrounding typography, borders and spacing consume the FE-01 tokens. BrandedQrCode in
features/qr owns rendering configuration and centered branding, independent of pass identity.
The existing USS white logo uses a small black patch within a bounded white pad. Logos may
occupy at most 12% of the symbol width (including padding); reserved QR patterns are never
covered. Four-module quiet zones, high correction and dark/light contrast take precedence
over branding. Failed event artwork falls back to USS, then a plain QR. Permanent member
barcode presentation and the public motion engine are unchanged.

## FE-09 crew operations

Scanner surfaces reuse FE-01 square controls, USS black/white/red tokens and the existing
member shell. A large static result heading and labeled success/error border serve crew
recognition. The camera viewport is bounded for short phones; result acknowledgement is
a full-width touch action. No animation overlays QR decoding. Runtime ownership is
features/check-in/check-in.css; public and Event Pass visuals are unchanged.
