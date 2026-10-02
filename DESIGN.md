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
