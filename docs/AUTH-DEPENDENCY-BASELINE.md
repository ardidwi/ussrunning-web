# USS Running auth dependency baseline

Dependency policy is owned by integration/release engineering. Feature code must use internal auth/session contracts and the Neon SDK, not import transitive Better Auth implementation APIs.

## Supported versions

| Package | Version |
| --- | --- |
| next | 16.3.8 |
| react / react-dom | 19.2.6 |
| @neondatabase/auth | 0.5.0-beta |
| @neondatabase/serverless | 1.2.0 |
| @neondatabase/auth-ui | 0.3.0-beta |
| better-auth / @better-auth/core / @better-auth/passkey | 1.6.23 |
| better-call | 1.3.7 |
| @better-fetch/fetch | 1.3.1 |
| @daveyplate/better-auth-ui | 3.3.15 |
| @better-auth/api-key | Absent from this dependency subtree |

Preserve each branch's own manifest, including BE-03's resend 6.13.0, server-only, and backend test dependencies. Do not replace it with another branch's manifest or lockfile.

## Approved overrides

```json
{
  "overrides": {
    "@better-auth/core": "1.6.23",
    "@better-fetch/fetch": "1.3.1",
    "@neondatabase/auth-ui@0.3.0-beta": {
      "@daveyplate/better-auth-ui": "3.3.15"
    }
  }
}
```

- **Core 1.6.23:** Neon Auth pins better-auth 1.6.23, while passkey's ^1.6.23 core peer permits 1.7.x. Core 1.7.x requires better-call 1.4.0 and fetch 1.3.2, conflicting with the approved 1.6 family. Pin the compatible core.
- **Fetch 1.3.1:** Neon Auth, Better Auth 1.6.23, and passkey require this exact version. Broad UI dependency ranges can otherwise select a different copy. Pin the peer-compatible version.
- **UI wrapper 3.3.15:** Neon auth-ui 0.3.0-beta declares Daveyplate UI 3.4.0. That package introduces api-key ^1.5.6 (resolving to 1.7.7) and better-call 2.0.2. The selected 3.3.15 package has neither dependency and supports the existing 1.6 auth peers and wrapper declaration exports. This is an intentional scoped override of an upstream exact dependency, not a provider replacement. Neon's published UI bundle contains embedded UI code; the external package override does not replace all bundled code.

Remove an override only after a verified Neon Auth release supplies a natively compatible graph and all applicable builds, TypeScript checks, auth regression tests, email tests, and frontend audits pass. Review overrides individually; do not remove them just because installation exits successfully.

## Deterministic repair and delivery

The historical backend lockfiles retained UI 3.4.0, API-key 1.7.7, and Better Call 2.0.2 even after overrides were added. A fresh lockfile generated from each committed manifest plus this policy removed those entries and passed full npm graph checks. Manifest-only dependency changes previously left main/frontend locks at Next 15.5.26 with Neon absent.

For an explicitly approved repair, work in an isolated clean validation context. Remove only its generated node_modules and package-lock.json; regenerate with npm install --package-lock-only --ignore-scripts. Inspect the diff, then validate:

```sh
npm ci --ignore-scripts
npm run deps:check
npm run build
node node_modules/typescript/bin/tsc --noEmit --incremental false
```

deps:check uses npm ls --all to detect invalid, peer-invalid, missing, and extraneous dependency problems throughout the installed tree. Optional unmet integrations may be listed without indicating corruption. Never accept an invalid tree merely because npm reports an override or a build succeeds.

Run the scripts available on the branch:
- BE-01: npm run db:test.
- BE-02: npm run db:test and npm run auth:test.
- BE-03: additionally npm run email:test.
- FE-01: existing form, public-shell/motion, and workspace browser audits.
- FE-02: existing contract, auth-flow, visual, and public-shell/motion audits.

Browser reference audits require a localhost development server because /design-system is development-only. Do not enable that route in production to run the audit. next lint remains an existing unsupported command under Next 16; this repair does not modify lint infrastructure.

## Validation checkpoint: 2026-10-09

Fresh Option A graphs passed npm ci and full npm ls checks on BE-01, BE-02, BE-03, FE-01, and FE-02. All builds and standalone TypeScript checks passed. DB tests: 23/23 on each backend baseline; auth: 18/18 on BE-02 and BE-03; email: 19/19 on BE-03. FE-01 passed 27 form viewport cases, 80 public-shell cases including motion, and 10 workspace cases. FE-02 passed its contract checks, 53 responsive auth cases and flow assertions, visual checks, and 80 public-shell cases including motion.

Development reference screens emitted hydration warnings despite passing browser assertions; this metadata-only repair does not fix or establish the origin of those warnings. Local Next runtime smoke returned 200 for login/join and an expected NETWORK_ERROR against a dummy loopback auth endpoint, confirming route/SDK initialization without production requests. Standalone Node cannot resolve Next's extensionless next/headers import; use the Next runtime for SDK smoke tests.

Domain tests use isolated PostgreSQL WASM and mocked provider/transport boundaries. These checks are not live provider sign-in/sign-up/sign-out or production database/email tests. No migration, schema, secret, environment contract, or application source change is part of this repair.

## Ongoing rules

1. Commit dependency manifest changes with their matching lockfile.
2. Review security-sensitive Neon/Better Auth family changes explicitly; never adopt a transitive 1.7 upgrade silently.
3. Never use force or legacy-peer dependency bypass flags as a delivery solution.
4. Repair forward-only, preserving completed feature history.
5. Document every override's upstream cause, expected versions, and removal criteria.
6. Gate future CI/agent delivery on install, dependency health, build, TypeScript, and applicable domain/frontend tests.
7. Preserve internal auth/session boundaries as member, CMS, event, admin, integration, email, and future mobile/API features expand.
