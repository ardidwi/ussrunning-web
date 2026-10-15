---
name: codex-security
description: Entry skill for an OWASP-oriented security review of USS Running changes. Use when the user asks for a security audit, auth review, permission review, or adversarial pre-merge security pass.
---

# Codex Security

This is the entry point for repository security review. Delegate the full review method to `.agents/skills/security-review/SKILL.md`.

## Trigger

Use for requests involving security review, OWASP, auth/session hardening, authorization, IDOR, secrets, injection/XSS, rate limiting, lifecycle/session revocation, CMS security, event-pass/QR integrity, notification abuse, or pre-release adversarial review.

## Do not use for

- Generic code review unrelated to security.
- Dependency-only vulnerability analysis; use `dep-audit`.
- Test sufficiency review; use `test-review`.

## Required behavior

1. Read the security-review skill first.
2. Inspect evidence before suggesting fixes.
3. Keep confirmed defects separate from hypotheses.
4. Never mutate production secrets, providers, or auth architecture during the audit.
5. After any fix, rerun focused regression checks and then the normal CI/build gates.

Adapted for this repository from sd0xdev/sd0x-harness `codex-security`.