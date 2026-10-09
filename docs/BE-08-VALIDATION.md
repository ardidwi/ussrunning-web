# BE-08 validation

Task branch feature/event-registration-service starts from validated main 53169054bca2756d36cbba0c0d4984ca3ef84bf3. Original dirty FE-06 worktree and separate auth worktree preserved.

Initial source checkpoint:
- npm ci --ignore-scripts PASS: 259 installed/260 audited, zero reported vulnerabilities; existing email-package deprecations.
- deps:check, build and standalone TypeScript PASS.
- Registration SQL-backed tests 27/27; all current regression suites 171/171 (144 existing +27 registration), zero failures/skips.
- Offline migration dry-run PASS: existing 001–009, no database accessed. DB suite tests fresh/repeat/checksum/rollback/FK/identity behavior. No schema migration/index/grant changes needed.
- next lint FAILED: known Next 16 unsupported tooling, unchanged.

Coverage: booking/idempotency, last-slot and 12-applicant fixtures, full waitlist-off and unlimited events, unpublished/private/lifecycle/window checks, active verified account enforcement, invitation/custom-required fail-closed, spoofing/cross-user denial, owner/admin cancellation, attended-registration protection, cancelled reapplication capacity, stale cancel/reapply race, exact microsecond pagination, event capacity edit safety, fresh authority after suspension/revocation, atomic audit failure rollback, runtime least privilege and sanitized DB failures.

PGlite serializes transactions: fixtures and statement-order assertions are not live Neon concurrency proof. No real provider/member request, production DB change, email, pass, payment or check-in service. Event row locking is the documented production strategy; independent Neon sessions/load/timeout and runtime-role deployment remain pending.

Scope audit: only registrations domain, minimal BE-07 capacity edit guard, new tests and docs. Existing auth, member identity, FE-06 and UI untouched by this task. Main updates from parallel auth/frontend work will be preserved by normal forward integration and combined validation; exact final SHA/deployment results are reported after delivery.

Integrated checkpoint: normal forward merge includes origin/main 164d2b0 (trusted auth cutover and FE-06). Only roadmap conflicted; both completed entries preserved. npm ci --ignore-scripts, deps:check, production build, standalone TypeScript and offline migration dry-run PASS. Full integrated suite 184/184 PASS (157 inherited +27 registration), zero failures/skips. No dependency/auth/frontend changes authored by BE-08. Known next lint limitation unchanged.
