---
name: risk-assess
description: Assess implementation and PR risk using breaking-surface, blast-radius, migration-safety, and change-scope reasoning. Use before merging security, data-integrity, auth, schema, or large cross-module changes.
---

# Risk Assess

Use this skill to estimate whether a change is safe to continue, needs deeper review, or should be split.

## Dimensions

1. Breaking surface — removed/renamed exports, changed signatures, API/schema contract changes, deleted behavior.
2. Blast radius — direct and indirect consumers of changed modules, shared components, auth/session boundaries, database functions, and public routes.
3. Change scope — files/directories touched, LOC delta, cross-layer changes, migration/config coupling.
4. Migration safety — additive vs destructive schema changes, runtime grants, rollback/forward recovery path, pending migrations.
5. Regression signals — recent bug magnets, repeated fixes/reverts, fragile tests, or stale branch reconciliation.

## USS interpretation

- Low: narrow, additive, well-tested, no contract changes.
- Medium: multiple modules or shared components but contained and covered.
- High: auth/roles/session, database transaction semantics, provider callbacks, public API contract, or wide shared UI surface.
- Critical: destructive migration, privilege invariant risk, irreversible data mutation, secret/provider changes, or unknown production impact.

## Gate

Return PASS, REVIEW, BLOCK, or NEEDS HUMAN CONFIRMATION.

## Required report

Include affected contracts, dependencies, migration/config impact, rollback/forward recovery, test evidence, unvalidated environment assumptions, and the smallest safe next action.

Do not use numeric scoring as a substitute for engineering judgment. Security and data-integrity changes always receive deep review even if the diff is small.

Adapted for this repository from sd0xdev/sd0x-harness `risk-assess`.