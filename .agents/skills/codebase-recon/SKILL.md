---
name: codebase-recon
description: Analyze git history before large changes or audits to identify hotspots, bug magnets, firefighting patterns, risky files, and branch/repository health. Use when entering a codebase, planning a large refactor, or performing a zero-hotfix risk audit.
metadata:
  short-description: Recon codebase risk from git history
---

# Codebase Recon

## Goal

Use repository history to find the files and areas most likely to regress before reading or changing large parts of the codebase.

## Phase 1: Repo vitals

Collect:

```bash
echo "COMMITS=$(git rev-list --count HEAD)"
echo "FIRST_COMMIT=$(git log --reverse --format='%ad' --date=short | head -1)"
echo "LATEST_COMMIT=$(git log --format='%ad' --date=short | head -1)"
echo "BRANCHES=$(git branch -a | wc -l | tr -d ' ')"
```

Choose an analysis window appropriate to repo size. Do not use a tiny recent window for a young/small repository.

## Phase 2: Risk analysis

Run independent checks for:

### Hotspots

```bash
git log --format=format: --name-only --since="1 year ago" | sort | uniq -c | sort -nr | head -20
```

### Bug magnets

```bash
git log -i -E --grep="fix|bug|broken|regression|hotfix" --name-only --format='' --since="1 year ago" | sort | uniq -c | sort -nr | head -20
```

### Firefighting / rollback history

```bash
git log --oneline --since="1 year ago" | grep -iE 'revert|hotfix|emergency|rollback'
```

### Recent additions

```bash
git log --diff-filter=A --since="1 year ago" --name-only --format='' | sort | uniq -c | sort -nr | head -20
```

### Contributor concentration

```bash
git shortlog -sn --no-merges
```

## Cross-reference

Identify:
- files appearing in both hotspots and bug magnets
- high-change files with weak test coverage
- migrations/config/auth files frequently involved in fixes
- areas with repeated revert/hotfix commits
- active branches that may overlap the planned work

Before modifying a high-risk file, inspect its latest callers, tests, config, migrations, and API contracts.

## USS Running zero-hotfix extensions

Pay extra attention to:
- auth/session/profile lifecycle
- roles and permissions
- migrations and runtime grants
- registration/capacity/payment authority
- event pass / QR / attendance
- media delivery
- CMS publication lifecycle
- notifications/retry/idempotency
- public-content fallbacks

Do not conclude a file is safe simply because it has few commits; new security-sensitive code can still be high risk.

## Report

Summarize:
1. repo vitals
2. top hotspots
3. bug magnets
4. high-risk overlap
5. firefighting frequency
6. branch/concurrency risks
7. files to inspect first
8. recommended tests before touching them

This skill is read-only by default. Do not commit generated reports unless the user asks.

Adapted from: https://github.com/yujiachen-y/codebase-recon-skill/tree/main/skills/codebase-recon
