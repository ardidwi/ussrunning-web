# USS CMS foundation

Requested 2026-10-02: mobile-friendly CMS, Stories editorial, dynamic backgrounds/gallery, super_admin/admin/member, permanent account identity and barcode. Existing free membership is preserved.

This is an explicitly local browser demo, not authentication. Role preview never grants server access. No personal credentials are collected. Only fictional accounts should be entered. Do not use localStorage role claims for Neon authorization.

## Data and integration boundary

`lib/cms.ts` owns serializable types and permission mapping. `DemoProvider` is the sole local demo data adapter; replace with authenticated API/repository methods when integrating Neon. No database credentials belong in client bundles. Initialize account UUID and unique public ID transactionally on the server; enforce unique indexes for member ID/barcode and story slug. Public signup always assigns member. Only a server-verified super admin grants elevated roles. Every API checks session and ownership. Member reads only own account and registrations.

Code 39 SVG encodes the full opaque account UUID with USS prefix, preserves quiet zones and never embeds name/email/phone. The code is an identifier, not an authorization credential. It is a genuine barcode; production identity is issued by the backend. Event registration gets a separate token/pass; account barcode does not establish attendance. Scanner resolves authorized event registration before recording check-in.

Suggested records: accounts, sessions (auth provider owned), site_content (draft/published), stories, categories, media_assets, gallery_items, events, registrations, event_passes, audit_logs. Media binary storage is separate from records; demo uses small browser data URLs. Define storage integration before activating production uploads.

## Included now

Three role previews, role-dependent menus, account UUID/barcode SVG download, member profile edit, super admin account creation/role edit, local draft/published homepage and login backgrounds, mobile cover override, focal point and overlay, local gallery ordering/visibility, Stories create/edit/draft/publish/archive/featured and public detail, event edit scaffold, capped activity log.

## Deferred until backend

Real login/signup/password recovery, server role enforcement, durable cross-device records, production media storage, registration/check-in and event tickets, article scheduling, SEO metadata per story, multi-user conflict control, full pagination, sponsor editor and remaining global CMS sections. Demo content changes do not publish to other visitors. No migrations executed.
