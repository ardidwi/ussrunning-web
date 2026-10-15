---
name: gh-fix-ci
description: Inspect and fix failing GitHub Actions checks using root-cause analysis. Use when a PR or branch CI is red, a workflow job fails, or the user asks to diagnose GitHub Actions without guessing.
metadata:
  short-description: Diagnose and fix GitHub Actions failures
---

# GitHub CI Root-Cause Fix

## Goal

Diagnose the exact failing GitHub Actions job, identify the smallest root-cause fix, validate it, and only then allow integration. Never patch blindly from a stale failure.

## Workflow

1. Confirm repository, current branch, PR number, head SHA, and latest `origin/main`.
2. Fetch current PR checks and identify the failing GitHub Actions check. Treat non-GitHub checks (for example Vercel) as separate external evidence.
3. Inspect the exact workflow run and failing job log for the current head SHA.
4. Extract the first actionable failure and distinguish root cause from follow-on failures.
5. Check whether `main` advanced after the failing run. If yes, reconcile forward-only before patching when the new main can materially change the failure.
6. Propose the smallest safe fix. Do not change architecture, providers, dependencies, migrations, or product behavior unless the failure proves that change is required.
7. Run focused tests for the changed area, then the repository's required CI gates.
8. Re-check GitHub Actions on the exact new head SHA. Do not reuse green evidence from an older SHA after source changes.
9. Only recommend merge when required checks for the exact candidate are green.

## Safety rules

- Never force-push or rewrite shared history just to make CI green.
- Never delete or weaken tests to hide a failure.
- Never bypass typecheck/build/security gates.
- Preserve concurrent work and latest-main changes.
- For database/auth/role failures, inspect transactional and concurrency behavior before changing business rules.
- If logs are unavailable, report that limitation instead of guessing.
- Keep production secrets and provider credentials out of logs, diffs, and comments.

## Useful commands

```bash
gh auth status
gh pr view --json number,url,headRefName,headRefOid,baseRefName
gh pr checks <pr> --json name,state,bucket,link,startedAt,completedAt,workflow
gh run view <run_id> --json name,workflowName,conclusion,status,url,event,headBranch,headSha
gh run view <run_id> --log
```

If a run-level log is unavailable but a job ID is known:

```bash
gh api "/repos/<owner>/<repo>/actions/jobs/<job_id>/logs"
```

## Completion report

Report:
- failing check and exact SHA
- root cause
- files changed
- focused validation
- full required gate result
- remaining external checks/blockers
- whether the candidate is safe to merge

Adapted from: https://github.com/composio-community/awesome-codex-skills/tree/master/gh-fix-ci
