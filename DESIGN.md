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
