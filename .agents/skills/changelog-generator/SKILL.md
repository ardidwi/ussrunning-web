---
name: changelog-generator
description: Generate user-facing release notes and internal change summaries from git history. Use for release checkpoints, weekly product updates, deployment summaries, or public changelog entries.
metadata:
  short-description: Generate changelogs from git history
---

# Changelog Generator

## Goal

Turn technical git history into clear release notes without losing important operational context.

## Workflow

1. Resolve the exact release range (for example previous tag → current main, previous deployment SHA → current deployment SHA, or a requested date window).
2. Read commit subjects and inspect ambiguous commits before classifying them.
3. Group changes into meaningful categories:
   - New features
   - Improvements
   - Fixes
   - Security / reliability
   - Developer / infrastructure changes
   - Breaking changes, if any
4. Translate implementation language into user/product impact while preserving factual accuracy.
5. Filter noise such as merge-only commits, formatting-only churn, and temporary branch housekeeping unless it materially affects release operations.
6. Keep external blockers and unvalidated items separate from completed release notes.
7. For production/release checkpoints, record exact implementation SHA, main SHA, deployment ID/SHA, validation result, and known limitations when available.

## USS Running rules

- Do not claim a feature is live only because it was committed.
- Distinguish source-integrated, CI-green, Vercel READY, and real provider/live QA.
- Do not say authenticated/provider QA passed unless it actually ran in the approved environment.
- Mention database migrations and required environment/config changes when they affect rollout.
- Keep internal security details out of public-facing changelogs.
- Do not hide known blockers behind marketing language.

## Suggested output

```markdown
# Release <date/version>

## New
- ...

## Improved
- ...

## Fixed
- ...

## Reliability / Security
- ...

## Operational notes
- Deployment: ...
- Validation: ...
- Remaining blockers: ...
```

Adapted from: https://github.com/composio-community/awesome-codex-skills/tree/master/changelog-generator
