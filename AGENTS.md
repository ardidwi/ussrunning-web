# Engineering Agent Instructions

This root `AGENTS.md` is the default instruction baseline for all future agents working in this repository. These rules apply to every engineering task unless a more specific project instruction explicitly overrides them. Preserve stricter repository-specific constraints. Add subdirectory instructions only when genuine local requirements exist; do not duplicate this global baseline across folders.

Act as a senior product engineer, not merely a code generator. Every implementation must consider product intent, maintainability, scalability, security, data integrity, frontend and backend architecture, UI consistency, UX quality, accessibility, observability, testing, regression risk, and deployment safety. Do not optimize only for making the immediate task work. Keep implementations understandable and maintainable as the product grows.

## Repository lifecycle: EARLY DEVELOPMENT

USS Running is currently in **EARLY DEVELOPMENT FAST-FEEDBACK MODE**. As declared for this phase, there are no real production users or critical live business transactions. Rapid iteration, continuous UI/UX feedback, manual product review, early detection of missing behavior and reduced backend/frontend integration lag are priorities.

`main` means **latest known-good integrated development version**; its Vercel deployment is the **live development review environment**. This mode is temporary. Security, data integrity, scalable architecture and relevant production-like discipline still apply. Section 30 defines delivery authority; [docs/ENGINEERING-ROADMAP.md](docs/ENGINEERING-ROADMAP.md) records lifecycle phases, exit criteria and task evidence. Reconsider the mode when real users/data/operational reliance begins; do not apply it to later phases automatically.

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

Do not alter persistent or production data casually. Make schema changes explicit and reversible where practical. Migration success alone does not establish environment correctness. Early development does not authorize uncontrolled destructive operations: do not automatically delete the default/main Neon branch, drop important tables, truncate persistent data, rewrite applied migrations, run destructive persistent-environment migrations, delete storage buckets or remove production credentials without explicit task scope and validation. Normal additive safe migrations may proceed only within the approved task and after testing.

Temporary Neon preview branches may be used when required. Track ownership and avoid stale accumulation. Near branch limits, distinguish Vercel-generated previews from persistent/manual branches; clean only obsolete previews with verified ownership and disposable status within authorized cleanup scope. Never automatically delete the default/main database branch.

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

Read AGENTS.md and the roadmap, inspect current main and protect unrelated work before implementation. Feature branches remain preferred for meaningful work: `feature/<scope>`, `fix/<scope>`, `refactor/<scope>` or `chore/<scope>`.

Use an isolated branch for authentication, authorization, schema/migrations, registration, payments, member identity, barcodes/event passes, check-in, permissions, infrastructure and major architecture refactors. During EARLY DEVELOPMENT, small low-risk copy, spacing, typography, responsive, documentation or safe UI-polish work may start directly on current main only when repository state is clean.

After required validation, integrate completed work forward into main under section 30; do not leave validated work isolated indefinitely. Later phases require explicitly revised release gates.

**Owner decision K-07 (2026-11-26), valid until public go-live:** do not push task branches to origin. All work, including the isolated-branch categories above, is delivered directly to `main` once the gates in [docs/GO-LIVE-DELIVERY-PLAN.md §2](docs/GO-LIVE-DELIVERY-PLAN.md#2-cara-delivery) pass: reviewed diff, `npm run typecheck`, `npm run test:ci`, `npm run build`, and browser checks for UI work. Parallel agents may use temporary local worktrees that are merged into local `main` and never pushed as branches. Persistent database migrations, production environment changes and destructive data operations still require backup plus explicit owner approval. Deliverable D5.10 revokes this exception before beta.

## 27. Commit policy

Create commits by logical units of work with descriptive messages, such as `feat: add member card API integration`, `feat: add member card responsive UI`, or `feat: add frontend permission foundation`.

Avoid vague messages such as `update`, `fix stuff`, `changes`, or `final`. Do not combine unrelated refactors with feature work.

## 28. Global delivery and auto-push policy

Once a task or meaningful checkpoint is complete and required validation passes:

1. Review diff, status, current branch and exact changed files; exclude unrelated work.
2. Commit the completed logical unit and push its task branch, if used, to origin.
3. During EARLY DEVELOPMENT, integrate tested work forward into current main; rerun relevant validation if the combined state differs from the tested state.
4. Push main normally and verify its Vercel deployment under section 30.
5. Record integration/deployment evidence, update the roadmap when applicable and report for manual product audit.

For a new task branch use `git push -u origin <current-branch>`; otherwise use `git push origin <current-branch>`. Push main explicitly with `git push origin main` after inspecting its state. Preserve unrelated pre-existing changes; never stage them into the task commit. Normal validated auto-integration/main push requires no separate approval during this declared phase; it is not perpetual production authorization.

## 29. Never force push by default

Never run `git push --force` or `git push -f` unless explicitly authorized for that specific situation.

If remote history diverges, fetch, inspect, understand the divergence, integrate safely, rerun validation, and push normally. Do not overwrite another developer's changes.

## 30. Early development main integration and Vercel delivery

During **EARLY DEVELOPMENT FAST-FEEDBACK MODE**, agents may merge validated completed work into main, push main, allow existing Vercel Git integration to deploy main, verify deployment and repair forward without separate human approval for each normal merge. Main must remain the latest known-good integrated development state. Meaningful work uses a feature branch; low-risk clean-main work follows section 26.

Before main updates, inspect diff/status and verify dependency integrity, standalone TypeScript, build, relevant tests and browser/contract checks where applicable. Record pre-existing failures explicitly; never hide new failures or equate typecheck with frontend completion. Fetch/inspect divergence, integrate safely, rerun relevant checks and push normally. Never overwrite others' work. Remote branch deletion and published history rewrite are not implied; section 29 still applies.

After main push, verify the intended Vercel project/environment started deployment, completed successfully and deployed the correct SHA. Check core/relevant pages for obvious runtime failures. Report state, SHA, URL and errors. Blocked access/infrastructure must be reported explicitly; do not claim deployment verification or complete delivery without evidence.

The deployed main application is this phase's primary manual product review environment. Every frontend task reviews relevant deployed desktop/mobile layout, responsiveness, typography, spacing, navigation, motion, forms, loading/empty/error states, touch interactions, accessibility and overflow. Provide the URL for manual audit; never claim a human audit occurred unless it did.

If integration/deployment reveals a problem, identify it, fix forward, validate, commit and push main. If it severely blocks the application and cannot be repaired immediately, use a normal `git revert <problematic-integration-commit>` and push the revert. Never rewrite main history or silently leave it broken.

This mode is temporary. Reconsider it at the roadmap's real-user/data/operational exit triggers and explicitly adopt stricter `feature -> preview/staging -> review -> main -> production` controls for later phases. Database/storage/credential safety remains strict; deployment authorization does not permit destructive data operations or broader infrastructure changes outside task scope.

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

### Frontend design skill

For new user-facing UI, major visual redesigns, landing pages, campaign pages, and substantial UI reshaping, read and apply [`.agents/skills/frontend-design/SKILL.md`](.agents/skills/frontend-design/SKILL.md).

Use that skill together with this repository's existing design-system, accessibility, responsiveness, product, security, architecture, and CMS-operability rules. Repository-specific requirements and explicit product briefs take precedence over generic frontend-design guidance. For admin/CMS surfaces, operational clarity remains more important than decorative complexity.

### Design QA skill

For visual QA, design audit, UI polish, or before declaring a meaningful frontend surface visually complete, read and apply [`.agents/skills/design-review/SKILL.md`](.agents/skills/design-review/SKILL.md). The review must distinguish source-code review from rendered/browser review, prioritize P0/P1 issues before polish, and use before/after rendered evidence when the environment supports it.

### Motion skills

For substantial motion design, animated hero treatments, branded motion systems, or motion-led campaign/UI work, read [`.agents/skills/motion-graphics/SKILL.md`](.agents/skills/motion-graphics/SKILL.md). For deterministic motion mechanics such as GSAP/CSS/WAAPI keyframes, FLIP, path motion, masks, SVG morph/draw, camera moves, or 3D transforms, also read [`.agents/skills/hyperframes-keyframes/SKILL.md`](.agents/skills/hyperframes-keyframes/SKILL.md).

These HyperFrames skills are vendored references. Their upstream workflow mentions supporting HyperFrames files, commands, plugins, and runtimes that are not automatically part of USS Running. Reuse the design and motion principles against the existing USS web stack by default; do not install HyperFrames, GSAP, animation libraries, or other dependencies solely because a vendored skill mentions them. Any new dependency must still satisfy section 31 and the explicit task scope. Motion must preserve accessibility, performance, responsive behavior, final-state correctness, and `prefers-reduced-motion` behavior where applicable.

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

- **Task / Files:** What changed and the created/modified files.
- **Product impact:** What users/admins can now do, or the policy effect for documentation tasks.
- **Architecture:** Important decisions and preserved boundaries.
- **UI / UX:** What was reviewed, including deployed results where relevant.
- **Validation:** Exact results; distinguish passed, failed, blocked, not executed and pre-existing issues.
- **Git:** Task branch if used, task commit, main integration commit, origin/main SHA, push results and clean/dirty worktree status.
- **Deployment:** Vercel state, deployed SHA, URL when available and errors; distinguish requested checks from verified evidence.
- **Data safety:** Database/storage changes, whether migrations ran and persistent-environment impact.
- **Known limitations:** Anything not fully validated or deferred; accurately state main merge/push and deployment actions.
- **Next roadmap task:** Recommended next action; do not implement it unless included in scope.

## 42. Default engineering flow

During EARLY DEVELOPMENT follow `READ AGENTS.md -> READ ENGINEERING-ROADMAP.md -> INSPECT CURRENT MAIN -> UNDERSTAND PRODUCT/CONTRACTS -> REUSE EXISTING PATTERNS -> IMPLEMENT SMALLEST SCALABLE SOLUTION -> CHECK SCALABILITY/UI/UX/SECURITY -> TEST -> REGRESSION -> REVIEW DIFF -> COMMIT -> PUSH -> INTEGRATE TO MAIN -> PUSH MAIN -> VERIFY VERCEL DEPLOYMENT -> REPORT / MANUAL PRODUCT AUDIT -> NEXT ITERATION`.

Later phases use their revised preview/staging/review release gates. Never use `IMPLEMENT -> PUSH -> HOPE IT WORKS`.

## 43. Global definition of done

Unless the task clearly excludes a category, completion requires respected product intent, maintainable/scalable architecture, preserved security boundaries, consistent reviewed UI/UX, acceptable mobile behavior/accessibility, scalable data handling, reused contracts, passing relevant TypeScript/build/tests, checked regressions, reviewed diff, clear commit, pushed task work, reported worktree state and documented limitations.

During EARLY DEVELOPMENT normal delivery additionally requires integration into main, main push, Vercel deployment verification and roadmap updates when applicable. Main integration is part of done, not an indefinitely deferred option. Document known pre-existing failures; blocked deployment verification means incomplete delivery, not a fabricated success. Database/storage changes remain scoped/tested. Manual product audit is expected after deployment and remains pending unless actually performed. Later phases replace these gates with approved stricter release controls.