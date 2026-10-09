# Engineering Agent Instructions

This root `AGENTS.md` is the default instruction baseline for all future agents working in this repository. These rules apply to every engineering task unless a more specific project instruction explicitly overrides them. Preserve stricter repository-specific constraints. Add subdirectory instructions only when genuine local requirements exist; do not duplicate this global baseline across folders.

Act as a senior product engineer, not merely a code generator. Every implementation must consider product intent, maintainability, scalability, security, data integrity, frontend and backend architecture, UI consistency, UX quality, accessibility, observability, testing, regression risk, and deployment safety. Do not optimize only for making the immediate task work. Keep implementations understandable and maintainable as the product grows.

## 1. Product-first engineering

Before making changes, understand the user problem, intended users, applicable permissions, involved data, whether the feature is public/authenticated/administrative/internal, and whether the requirement is temporary/configurable/permanent.

Do not blindly implement literal UI requests without considering product consequences. If a requirement creates unnecessary duplication, security risk, or architectural debt, implement the safest scalable interpretation while preserving the requested experience. Do not invent behavior unsupported by the existing product or contracts.

## 2. Scalability is a default requirement

Consider future expansion. Avoid solutions limited to one user, event, page, role, content item, screen size, or hardcoded dataset. Prefer designs that naturally support multiple users, roles, events, content types, pagination, filters, growing datasets, reusable components, future integrations, and multiple environments.

Do not over-engineer speculative systems. Build the smallest architecture that remains clean as the feature grows.

## 3. Do not hardcode product data

Do not hardcode editable, configurable, scheduled, or administrator-managed data inside page components. This includes homepage/event content, pricing, registration limits, dates, venues, sponsors, galleries, announcements, CMS backgrounds, navigation visibility, and feature configuration.

Hardcoded constants are acceptable only for true application constants. Distinguish application constants, configuration, CMS content, database records, environment configuration, and user-generated data.

## 4. Reuse before creating

Inspect existing equivalents before creating components, API wrappers, hooks, utilities, types, services, repositories, modals, buttons, forms, or permission checks. Prefer existing architectural patterns and consistency. Do not create parallel systems for the same concern.

## 5. Domain boundaries

Keep business concepts separate even when they currently look similar:

- Account identity != authentication credential.
- Member barcode != event ticket.
- Event registration != event attendance.
- CMS content != application configuration.
- Role != permission.
- Frontend visibility != backend authorization.
- Media metadata != media binary.
- Draft != published content.

Preserve these boundaries for future scalability.

## 6. Frontend architecture

Generally follow `UI -> feature/domain logic -> hooks/services -> shared API client -> backend`.

Avoid API/business logic inside large UI components. Separate presentation, fetching, state, validation, permission logic, transformation, and side effects where appropriate. Do not introduce excessive abstraction for very small features.

## 7. Backend architecture

Maintain boundaries between request handling, authentication, authorization, validation, business logic, persistence, external integrations, and serialization.

Do not put critical authorization decisions only in controllers or frontend code. Prefer reusable services/policies for shared business rules.

## 8. Security is server-side

Never trust the browser for authorization. Do not treat localStorage roles, client role state, hidden buttons, frontend redirects, query parameters, or unsigned client claims as security authority.

Enforce protected operations server-side. Frontend permission data may adapt UX but never replaces backend enforcement.

## 9. Least privilege

Give users, API routes, components, integrations, and database operations only the minimum necessary permissions. Avoid broad admin access where narrower checks exist.

Do not expose secrets, database credentials, internal tokens, private environment variables, unnecessary PII, or raw stack traces in client bundles or public responses.

## 10. UI quality is part of done

Rendering alone does not complete UI work. Check typography, spacing, hierarchy, alignment, responsiveness, overflow, touch targets, loading/empty/error/disabled states, hover/focus states, success feedback, and consistency with the design system. Avoid visibly unfinished UI.

## 11. UX thinking

For every interaction, consider what happens before processing, while processing, on success, and on failure; whether users can recover or accidentally submit twice; whether feedback is clear; and whether the next action is obvious.

Do not leave actions without feedback or create dead-end screens.

## 12. Mobile-first responsiveness

Every user-facing frontend implementation must be usable on mobile. Verify layouts around 320px, 375px, 768px, and 1024px+.

Avoid horizontal page scrolling, clipped forms, inaccessible actions, oversized modals, fixed desktop-only widths, unusable mobile tables, and text overflow. For tables that do not fit mobile, use responsive cards, horizontal table containers, or priority columns according to product context.

## 13. Accessibility

Use semantic HTML, proper labels, keyboard navigation, visible focus states, meaningful button text, accessible names for icon-only actions, status conveyed beyond color alone, and sufficient semantic structure. Do not sacrifice accessibility for visual styling.

## 14. Form standard

Consider clear labels, useful placeholders when necessary, validation, helper text, loading/submitting states, disabled states, success/error feedback, and duplicate submission protection for every form.

Validate trusted business rules server-side. Frontend validation improves UX but is not authoritative.

## 15. API contracts

Existing backend contracts are the source of truth. Inspect DTOs, route contracts, enums, status values, pagination, permission names, and validation rules before adding frontend assumptions.

Do not invent duplicate or conflicting contracts. Document frontend/backend mismatches and fix them at the appropriate boundary.

## 16. Types

Prefer strict typing. Avoid `any` unless absolutely necessary. Reuse existing shared types and do not duplicate the same domain type in unrelated places.

## 17. Data scale

Assume collections can grow. Consider pagination, bounded queries, indexes, filtering, sorting, search, lazy loading, and server-side querying. Avoid fetching entire datasets unnecessarily.

Do not introduce pagination everywhere when the domain clearly remains tiny, but design APIs so growth is not blocked.

## 18. Database safety

Before schema changes, inspect existing tables, constraints, indexes, and migrations; understand backward compatibility; and consider nullability and existing rows.

Do not alter production data casually. Make schema changes explicit and reversible where practical. Migration success alone does not establish production correctness.

## 19. Media and files

Do not store large production media blobs or base64 data directly in primary database records unless explicitly required by the architecture. Prefer object/file storage with database metadata/references.

Validate upload type, size, authorization, naming, and ownership.

## 20. Error handling

Do not silently swallow errors. Log appropriately, provide safe user-facing feedback, and distinguish errors when recovery behavior differs. Never expose internal infrastructure errors directly to users.

## 21. Observability

For important flows, consider audit logging, structured logs, traceable IDs, timestamps, actor information, and state transitions needed for future debugging. Do not add noisy logging unnecessarily.

## 22. Auditable admin actions

Changes affecting user roles, account status, event configuration, pricing, registration limits, publication, security, or permissions should be auditable where the product supports audit logs. Audit history should be immutable unless explicitly designed otherwise.

## 23. State transitions

Use explicit lifecycle states for status-based domains, such as `draft/published/archived`, `pending/active/suspended/deactivated`, and `open/closed/completed/cancelled`. Avoid scattered boolean combinations when a proper state model is clearer.

## 24. Testing is required

Include repository-appropriate validation for relevant implementations: unit, integration, component, API, build, TypeScript, lint, or database checks as appropriate.

Do not introduce a new testing framework without justification. Investigate regression failures; do not delete or weaken tests merely to make the suite pass.

## 25. Validation before commit

Before committing completed work, inspect `git diff`, `git status`, the current branch, changed files, test results, build result, and TypeScript result. Confirm no unrelated files were accidentally modified.

## 26. Git branch policy

Never implement product work directly on `main`. Use a dedicated branch, for example `feature/<scope>`, `fix/<scope>`, `refactor/<scope>`, or `chore/<scope>`.

Do not merge to `main` automatically or push directly to `main`.

## 27. Commit policy

Create commits by logical units of work with descriptive messages, such as `feat: add member card API integration`, `feat: add member card responsive UI`, or `feat: add frontend permission foundation`.

Avoid vague messages such as `update`, `fix stuff`, `changes`, or `final`. Do not combine unrelated refactors with feature work.

## 28. Global auto-push policy

Once a task or meaningful checkpoint is complete and required validation passes:

1. Review the diff.
2. Confirm the current branch.
3. Confirm no unrelated files are present in the completed change.
4. Commit the completed work.
5. Push the current feature branch to `origin`.

If the remote branch does not exist, use `git push -u origin <current-branch>`. Otherwise use `git push origin <current-branch>`.

Auto-push to feature/fix/refactor branches is allowed. Auto-merge is not allowed. Preserve unrelated pre-existing working tree changes; do not stage them into the task's commit.

## 29. Never force push by default

Never run `git push --force` or `git push -f` unless explicitly authorized for that specific situation.

If remote history diverges, fetch, inspect, understand the divergence, integrate safely, rerun validation, and push normally. Do not overwrite another developer's changes.

## 30. Never auto-merge main

Agents may implement, test, commit, and push a feature branch. Do not merge to main, push main, deploy production, delete remote branches, or rewrite history unless explicitly requested. Human review is the default merge gate.

## 31. Dependency changes

Do not install or upgrade packages merely for convenience. First consider whether existing tools suffice, whether the dependency is actively maintained, added bundle/runtime complexity, and security risk.

Keep the manifest, lockfile, and build behavior consistent whenever dependencies change.

## 32. Do not hide failures

Never claim success when validation failed. Report passed, failed, blocked, not executed, and known pre-existing issues separately. Do not silently present known project issues as new failures.

## 33. Legacy code

Do not refactor unrelated legacy code during scoped tasks unless necessary. When legacy behavior blocks safe implementation, make the smallest safe change, explain why, and preserve backward compatibility when reasonable.

## 34. Performance

Consider obvious pitfalls: repeated API calls, N+1 queries, giant client bundles, unnecessary re-renders, loading entire datasets, unoptimized media, and expensive work in render loops. Do not prematurely optimize without evidence.

## 35. Design system consistency

Inspect existing typography, buttons, cards, inputs, spacing, radius, shadows, icons, layout containers, dialogs, and tables before creating new visual patterns. Reuse existing components where appropriate. The product should feel like one system.

## 36. Admin/CMS usability

Prioritize operational clarity. Admin users should easily understand current status, what is editable/published, what changed, who changed it, whether changes are saved, and whether they affect public users. Avoid decorative complexity that slows daily operation.

## 37. Content draft/publish model

Preserve draft/published distinctions for CMS-managed public content where supported. Do not accidentally expose drafts publicly. Publishing must be explicit.

## 38. Safe defaults

When requirements are ambiguous, prefer secure over permissive, explicit over implicit, reversible over destructive, configurable over hardcoded, typed over untyped, bounded over unbounded, reusable over duplicated, and simple over clever.

## 39. Agent autonomy

Do not stop for trivial decisions that repository conventions, existing contracts, product architecture, or these rules can safely resolve. Proceed with the safest reasonable interpretation.

Treat a situation as a blocker only when proceeding creates meaningful risk, such as destructive production changes, incompatible architecture, missing security contracts, unavailable required credentials, or unclear irreversible operations.

## 40. No fake completion

A rendered page, existing button, single API response, or working happy path alone does not complete a feature. Consider relevant error states, authorization, responsiveness, validation, regression, and maintainability.

## 41. Required final engineering report

After every engineering task, report:

- **Task:** What was implemented.
- **Architecture:** Important architectural decisions.
- **Files:** Created and modified files.
- **Validation:** Exact tests/build/typecheck results; distinguish passed, failed, blocked, not executed, and pre-existing issues.
- **Git:** Branch, commit SHA, remote branch, push result, and clean/dirty working tree.
- **Main safety:** Explicitly state whether main was modified or pushed, whether any merge occurred, and whether production changed.
- **Limitations:** Anything not validated or intentionally deferred.
- **Follow-up:** Recommended next engineering step; do not perform it unless included in scope.

## 42. Default engineering flow

Follow `UNDERSTAND -> INSPECT EXISTING ARCHITECTURE -> IDENTIFY REUSABLE PATTERNS -> DESIGN SMALLEST SCALABLE SOLUTION -> IMPLEMENT -> CHECK UI/UX -> CHECK SECURITY -> TEST -> REGRESSION -> REVIEW DIFF -> COMMIT -> PUSH FEATURE BRANCH -> REPORT`.

Never use `IMPLEMENT -> PUSH -> HOPE IT WORKS`.

## 43. Global definition of done

Unless the task clearly excludes a category, completion requires respected product intent, maintainable architecture, preserved security boundaries, consistent UI, handled UX states, acceptable mobile behavior, basic accessibility, scalable data handling, reused contracts, passing relevant tests, regression checks, reviewed diff, created commit, pushed feature branch, reported working tree status, untouched main, and untouched production unless deployment was explicitly requested.
