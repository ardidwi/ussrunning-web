---
name: dep-audit
description: Audit dependency and supply-chain security risk without blindly mutating the dependency graph. Use for npm/package vulnerability review, lockfile risk, or pre-release dependency security checks.
---

# Dependency Audit

Use this skill to inspect third-party dependency risk.

## Default mode

Read-only. Do not run auto-fix or upgrade commands unless the user explicitly approves the dependency change.

## Procedure

1. Detect the package manager from the committed lockfile.
2. Run the ecosystem audit command at the requested severity threshold; default to moderate.
3. Record direct vs transitive dependency, severity, advisory/CVE when available, affected versions, fixed versions, and whether the vulnerable path is actually reachable or only theoretical.
4. Check whether an upgrade would be major/breaking and whether it can affect Next.js, React, auth, Neon, build tooling, or deployment behavior.
5. Recommend the smallest compatible remediation; do not perform broad upgrades as cleanup.
6. After an approved dependency change, run locked install validation, dependency graph check, TypeScript, focused tests, full tests, and production build.

## USS rules

- Keep `package-lock.json` and `package.json` consistent.
- No `npm audit fix --force`.
- No blind major upgrades.
- Supply-chain findings that cannot be safely remediated immediately must be documented with exposure, mitigation, owner, and follow-up.
- Vercel/provider failures are not automatically dependency failures; distinguish infrastructure from source defects.

## Output

Report severity counts, concrete vulnerable packages, reachability/context, remediation options, compatibility risk, and a PASS / REVIEW / BLOCK gate.

Adapted for this repository from sd0xdev/sd0x-harness `dep-audit`.