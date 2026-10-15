---
name: design-review
description: Visual design QA for USS Running. Finds visual inconsistency, spacing and hierarchy issues, generic/AI-looking patterns, accessibility regressions, motion problems, and slow or unclear interactions, then verifies fixes with evidence.
license: Adapted from garrytan/gstack design-review under the MIT License in LICENSE.txt.
---

# USS Running Design Review

Use this skill for visual QA, design audit, UI polish, or when reviewing a frontend change before it is considered done.

This is a repository-adapted review workflow inspired by `garrytan/gstack/design-review`. It intentionally does not depend on gstack's Claude-specific runtime, onboarding scripts, telemetry, or local browser binaries. Repository rules in `AGENTS.md`, the product brief, and the existing USS design system always take precedence.

## Goal

Review the rendered product like a senior product designer and frontend QA engineer, not as a code-only reviewer. Find visible defects, explain why they matter, fix the smallest correct source issue when implementation is in scope, and re-check the rendered result.

A review is not complete because the DOM renders or tests pass. Judge the painted UI.

## Review order

1. **Understand the surface**
   - Identify the page or flow, target user, primary task, expected state, relevant role/permission, and whether this is public, member, admin, or CMS UI.
   - Read the applicable product brief and existing components before proposing visual changes.

2. **Capture the baseline**
   - Review the actual rendered surface at the relevant route.
   - Prefer screenshots or browser evidence at desktop and mobile widths when the environment supports it.
   - Record the viewport and state being reviewed so before/after comparisons are meaningful.

3. **Audit hierarchy and composition**
   - Is the primary action or message obvious within a few seconds?
   - Check information hierarchy, alignment, rhythm, grouping, density, whitespace, and reading order.
   - Flag accidental symmetry, arbitrary centering, or repeated card patterns that flatten hierarchy.
   - Structural devices must communicate structure, not exist as decoration.

4. **Audit typography**
   - Check type scale, weights, line height, measure, wrapping, truncation, and contrast.
   - Avoid decorative labels, excessive all-caps, random emphasis, or type treatments that feel generic rather than USS-specific.
   - Verify headings and body text remain readable at 200% zoom where practical.

5. **Audit spacing and geometry**
   - Look for inconsistent paddings, margins, gaps, radii, control heights, icon alignment, border weights, and container widths.
   - Compare repeated components directly instead of judging each in isolation.
   - Fix root tokens/components when the inconsistency is systemic; do not patch many one-off values.

6. **Audit states and interaction clarity**
   - Check loading, empty, error, disabled, hover, focus, active, success, destructive, and confirmation states relevant to the flow.
   - Every action should make its result clear. Avoid dead ends and ambiguous CTAs.
   - Admin/CMS screens prioritize operational clarity over visual novelty.

7. **Audit responsive behavior**
   - Verify around 320px, 375px, 768px, and desktop where applicable.
   - Look for horizontal overflow, clipped controls, broken sticky/fixed elements, unusable tables, awkward wrapping, touch targets, and content hidden behind navigation.
   - Responsive adaptation should preserve hierarchy, not merely shrink desktop UI.

8. **Audit accessibility**
   - Verify visible keyboard focus, semantic controls, accessible names, labels, color-independent status, sufficient contrast, and logical tab order.
   - Motion must respect `prefers-reduced-motion` when applicable.

9. **Audit motion and perceived performance**
   - Motion must explain a transition, state change, hierarchy, or spatial relationship.
   - Flag scattered fade/slide effects, decorative perpetual animation, delayed feedback, layout-jank, or transitions that make the UI feel slower.
   - Prefer one intentional signature motion over many unrelated effects.
   - Interaction-triggered motion should confirm what changed.

10. **Audit AI/template tells**
    - Challenge identical rounded cards everywhere, generic gradient washes, arbitrary numbered labels, decorative eyebrows, unnecessary arrows, stock SaaS composition, excessive shadows, and repeated entrance animations.
    - Do not remove a pattern merely because it appears on this list; remove or revise it when it is not justified by the USS brief.

## Severity

Classify findings so fixes happen in the right order:

- **P0 — blocker:** unusable flow, inaccessible core action, severe overlap/overflow, unreadable text, destructive ambiguity, or a visual defect that prevents task completion.
- **P1 — major:** wrong hierarchy, broken responsive state, inconsistent component behavior, major focus/contrast issue, or motion that materially hurts usability.
- **P2 — polish:** spacing, alignment, typography, copy, subtle state, or consistency defect that does not block the task.
- **P3 — optional:** subjective refinement with low user impact. Do not churn stable UI for P3 alone.

Fix P0/P1 first. Do not spend the review on micro-polish while obvious task-level defects remain.

## Fix loop

For every in-scope fix:

1. Identify the visible symptom.
2. Trace it to the smallest correct source component/token/layout rule.
3. Check whether the same source affects other routes or states.
4. Implement the smallest scalable correction.
5. Re-render the same viewport/state.
6. Compare before/after evidence.
7. Run relevant TypeScript/build/tests and browser checks required by `AGENTS.md`.

Do not weaken tests, hide overflow, crop content, or remove states merely to make screenshots look clean.

## Motion-specific handoff

If the review identifies a motion problem or a request for substantial motion design, also read:

- `../motion-graphics/SKILL.md` for motion composition principles.
- `../hyperframes-keyframes/SKILL.md` for deterministic keyframe mechanics, seek-safe timelines, final-state verification, and GSAP/CSS/WAAPI guidance.

The HyperFrames source skills contain video/composition tooling instructions that may not exist in this repository. Reuse their motion principles where applicable to the USS web runtime; do not introduce HyperFrames tooling or dependencies unless the task explicitly calls for them and repository dependency rules are satisfied.

## Review output

A design review report should include:

- routes/surfaces and states reviewed;
- viewports or devices checked;
- findings grouped by P0/P1/P2/P3;
- exact source areas changed, if fixes were in scope;
- before/after evidence where available;
- accessibility and reduced-motion notes;
- tests/build/browser validation performed;
- unresolved findings or subjective decisions needing product input.

Never say the design is "fully QA'd" if only source code was inspected. Distinguish code review, rendered review, and human product approval.
