# Vercel Preview Diagnostic

Purpose: trigger a clean, non-functional Preview deployment from the current `main` baseline so we can isolate whether the previous failures are specific to Vercel Preview provisioning rather than application source code.

This file intentionally changes no runtime, dependency, environment, database, auth, or product behavior.

Diagnostic interpretation:

- Preview READY: previous failure was likely stale/transient Preview or PR metadata/provisioning.
- Preview fails again with `Resource provisioning failed`: points to a systemic Preview provisioning/project-side issue.
- Preview reaches build/runtime and fails with a normal build or environment error: investigate Preview environment/config differences next.
