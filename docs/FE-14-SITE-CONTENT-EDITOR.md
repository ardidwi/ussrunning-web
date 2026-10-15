# FE-14 Dynamic Site Content Editor

Status: **DONE (source integration)**

## Delivery checkpoint

- Feature branch: `feature/site-content-editor`
- Validated candidate: `4ba0d44a2df7fd182bc13db288e987c35a8345c0`
- Integrated main: `b00a3d7c3916cdab8c18269b6f3370637c5cb2ef`
- CI: GitHub Actions run `38676921667` — locked install, dependency graph, standalone TypeScript, integrated Node/domain tests, and production build all passed.
- Vercel: exact integrated main SHA reported **success** by the Vercel commit check; inspector target `HTnZRvvaTbDB1K8bVDQUUgnXsxoT`.
- Persistent migrations: none added or applied by FE-14. It consumes the existing BE-15 contract/migration.

## Scope delivered

`/admin?module=content` now uses the protected BE-15 site-content actions instead of the CMS unavailable placeholder. The workspace covers all ten typed slots already defined by BE-15:

- `homepage.hero`
- `homepage.membership`
- `homepage.manifesto`
- `homepage.marquee`
- `homepage.featured`
- `homepage.sections`
- `login.visual`
- `auth.login`
- `auth.register`
- `footer.global`

The editor supports typed draft creation/update, optimistic-version conflict feedback, explicit publish/unpublish/archive lifecycle, draft payload preview, and BE-11 MediaAsset selection for supported media references. Public/runtime validation remains authoritative in BE-15. Auth/session/provider/lifecycle policy is deliberately not editable from the content editor.

## Boundaries and remaining evidence

This checkpoint does **not** claim real authenticated admin mutations against a trusted persistent Neon environment, persistent media delivery, or human browser/device product QA. Those remain staging/release evidence. FE-18/FE-19 still own broad responsive/accessibility hardening; BE-22 owns real environment readiness.

A remote branch-setup mistake briefly created two FE-14 setup files on `main`; both were immediately removed with normal forward commits before the validated FE-14 integration. No history was rewritten or force-pushed, and the main tree was restored to the pre-setup tree before the feature was integrated.

Next dependency sequence: finish/reconcile FE-13 when its preserved Codex work is pushed, then BE-18 Role & Permission Administration before FE-15 Users/Roles UI.
