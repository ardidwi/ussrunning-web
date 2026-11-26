# USS Running Web

USS Running community platform for public editorial content, free membership, event RSVP, member passes, and CMS administration.

## Public routes

- `/` Editorial homepage and motion experience
- `/about` USS Running story and mission
- `/runs` Published community events
- `/runs/[slug]` Event detail
- `/membership` Free membership information
- `/join` USS ID registration
- `/stories` Editorial / journal
- `/partners` Partnership landing page
- `/privacy` Privacy Policy
- `/terms` Terms of Use
- `/login` Member/admin login

## Authenticated routes

- `/dashboard` Member profile, USS ID, RSVP history, event passes, and upcoming runs
- `/admin` Admin / super-admin CMS and operational controls

## Stack

- Next.js 16
- React 19
- TypeScript
- Neon Postgres
- Neon Auth
- `@neondatabase/serverless`
- QR / barcode generation
- Custom responsive CSS and Canvas motion system

## Current backend capabilities

The current implementation includes:

- Neon Auth backed accounts
- USS member profiles and member codes
- Member profile service with optional Instagram and emergency-contact fields (mandatory profile photo and required-field gate are planned in the go-live plan)
- Published event management from CMS
- Event RSVP with `registered`, `waitlist`, `cancelled`, and `checked_in` states
- Capacity-aware RSVP processing
- Server-side enforcement of event publication and RSVP-open status
- Per-event run pass / QR payload generation
- Member dashboard and RSVP history
- CMS-managed hero, media, event, story, partner, and site settings
- Role hierarchy for member, admin, and super admin

## Planning documents

- [Go-live delivery plan](docs/GO-LIVE-DELIVERY-PLAN.md) — phased backend/frontend/ops deliverables with acceptance criteria up to public launch.
- [Target architecture](docs/ARCHITECTURE-TARGET.md) — current-state audit (2026-11-26) and target architecture for identity, CMS media, events and administration.
- [Engineering roadmap](docs/ENGINEERING-ROADMAP.md) — historical task status and evidence.

## RSVP integrity rules

RSVP writes are serialized per event so concurrent requests cannot overbook the final available slot. Capacity counts only active `registered` and `checked_in` participants. When capacity is full, a valid RSVP becomes `waitlist`. A cancelled registration can only become active again after the server re-checks current event status and capacity.

Only events that are both published and have `registration_status = 'open'` accept RSVP writes.

## Content fallback behavior

Presentation fallback runs are used only when no database is configured, such as a local presentation-only environment. When the live database is configured, an intentionally empty published-event list stays empty and is never replaced by demo event content.

## Local development

Required environment configuration includes a valid `DATABASE_URL` and Neon Auth settings used by the existing auth integration. Do not commit credentials or secrets to the repository.

Run:

```bash
npm install
npm run dev
```

Production builds should be verified with:

```bash
npm run build
```
