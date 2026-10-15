---
name: test-review
description: Review whether tests are sufficient for a USS Running change, especially auth, roles, sessions, database invariants, CMS mutations, public flows, and regression-prone UI. Use after implementation or before merge; not for generic code review.
---

# Test Review

Use this skill to judge test sufficiency, not merely test pass/fail status.

## Review dimensions

- Happy path coverage.
- Failure/error handling.
- Authorization and lifecycle boundaries.
- Edge cases and invalid input.
- Concurrency/transaction behavior where relevant.
- Regression coverage for the actual bug or risk being changed.
- Browser/runtime evidence for user-facing behavior.
- Mock quality: do not let mocks replace the behavior that needs proving.

## USS evidence priority

1. Focused automated regression on the real affected path.
2. Integration test across module/database boundaries.
3. Browser/E2E validation for UI and user flows.
4. Real environment/provider validation when behavior depends on Neon, Resend, Vercel, sessions, media, QR/device, or callbacks.
5. Manual evidence only when automation is impractical; document why.

## Required edge cases

For security/data-integrity changes, inspect at minimum: unauthorized actor, stale version/conflict, suspended/deactivated account, invalid/empty/extreme input, duplicate/replay action, network/provider failure, and concurrent mutation when an invariant could race.

For responsive UI, verify 320px/mobile, desktop, zoom/readability, loading/error states, no horizontal overflow, and reduced-motion where motion is involved.

## Gate

Return one of:
- SUFFICIENT
- NEEDS ADDITIONS
- NEEDS ENVIRONMENT VALIDATION

List exactly which missing test or runtime proof blocks confidence. Never infer production readiness from TypeScript/build alone.

Adapted for this repository from sd0xdev/sd0x-harness `test-review`.