---
name: security-review
description: Security-focused review for OWASP Top 10 risks, auth/session weaknesses, authorization bypass, unsafe input handling, insecure design, secrets, logging, and security-sensitive changes. Use for USS Running security review work; not for generic code review.
---

# Security Review

Use this skill for security-sensitive changes and pre-release security audits.

## USS guardrails

- Treat server authorization as authoritative; never trust frontend-only role checks.
- Preserve the existing auth/session/lifecycle architecture unless a separate approved change requires it.
- Do not expose secrets, credentials, tokens, private scan output, or sensitive user data in reports.
- Review before fixing. Identify root cause, blast radius, affected contracts, and regression risk first.
- Do not auto-upgrade dependencies or change auth providers as a side effect of a finding.
- Security and data-integrity findings require explicit verification evidence after the last edit.

## Review flow

1. Determine scope from the user request or current diff.
2. Inspect changed files plus nearby auth, permission, input, persistence, and configuration boundaries.
3. Review against OWASP Top 10:2025 themes: access control/SSRF, misconfiguration, supply-chain risk, crypto, injection/XSS, insecure design/rate limits, auth/session failures, integrity, logging/alerting, and fail-open/error paths.
4. For each finding report: severity, evidence path, exploit/precondition, impact, root cause, smallest safe fix, regression surface, and verification method.
5. Separate confirmed defects from design concerns and unverified hypotheses.
6. End with one gate: PASS, NEEDS FIX, or NEEDS HUMAN/ENVIRONMENT VALIDATION.

## USS-specific focus

Prioritize IDOR, role escalation, last-super-admin invariants, suspended/deactivated-session handling, CMS authorization/enumeration, notification abuse, event-pass/QR integrity, check-in boundaries, media delivery, upload validation, callback/trusted-origin configuration, and unsafe transactional state.

## Evidence rules

- Build/typecheck success is not proof of runtime security.
- Provider/live-session claims require real environment evidence.
- Do not claim a vulnerability fixed unless the exact affected path has a regression check or equivalent verified runtime evidence.

Adapted for this repository from sd0xdev/sd0x-harness `security-review` and OWASP-oriented review guidance.