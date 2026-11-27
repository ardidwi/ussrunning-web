import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loader } from "./frontend-loader.mjs";

const presentation = loader()("lib/data-rights/data-rights-presentation.ts");
const source = file => readFileSync(file, "utf8");

test("every server code maps to safe copy and unknown codes fall back without echoing input", () => {
  const { DATA_RIGHTS_CODES } = loader()("lib/data-rights/data-rights-types.ts");
  for (const code of [...DATA_RIGHTS_CODES, "UNAUTHENTICATED", "ACCOUNT_SUSPENDED", "EMAIL_NOT_VERIFIED"]) {
    const text = presentation.dataRightsMessage(code);
    assert.ok(text.length > 10 && !text.includes("DATA_RIGHTS_"), code);
  }
  const fallback = presentation.dataRightsMessage("<img src=x onerror=alert(1)>");
  assert.equal(fallback, presentation.dataRightsMessage("DATA_RIGHTS_UNAVAILABLE"));
  assert.equal(presentation.dataRightsMessage(undefined), fallback);
});

test("status presentation covers the full lifecycle and status is not conveyed by colour alone", () => {
  for (const status of ["pending", "approved", "rejected", "cancelled", "executed"]) {
    const p = presentation.STATUS_PRESENTATION[status];
    assert.ok(p.label && p.member && p.tone, status);
  }
  assert.equal(presentation.isOpenRequest({ status: "pending" }), true);
  assert.equal(presentation.isOpenRequest({ status: "approved" }), true);
  for (const status of ["rejected", "cancelled", "executed"]) assert.equal(presentation.isOpenRequest({ status }), false);
  assert.equal(presentation.isOpenRequest(null), false);
});

test("download filename only accepts the server's own shape", () => {
  const date = new Date("2026-11-27T00:00:00Z");
  assert.equal(presentation.exportFilename('attachment; filename="uss-running-data-2026-11-27.json"', date), "uss-running-data-2026-11-27.json");
  for (const header of [null, 'attachment; filename="../../evil.exe"', 'attachment; filename="uss-running-data-x.json"'])
    assert.equal(presentation.exportFilename(header, date), "uss-running-data-2026-11-27.json");
  assert.match(presentation.formatWhen("2026-11-26T03:15:00.000000Z"), /2026.*WIB$/);
  assert.equal(presentation.formatWhen("not a date"), null);
});

test("member settings: POST export, double-submit locks, confirmation step, no onboarding redirect", () => {
  const ui = source("features/member-dashboard/components/DataRightsSettings.tsx");
  assert.match(ui, /fetch\("\/api\/member\/data-export", \{ method: "POST"/);
  assert.ok((ui.match(/lock\.current/g) ?? []).length >= 4, "export and deletion actions are guarded against double submit");
  assert.match(ui, /Confirm your email/);
  assert.match(ui, /title="Cancel your deletion request\?"/);
  assert.match(ui, /role=\{notice\?\.tone === "error" \? "alert" : "status"\}/);
  const page = source("app/dashboard/settings/page.tsx");
  assert.ok(!page.includes("redirectIncompleteMember"), "data rights must stay reachable for incomplete profiles");
  assert.match(page, /getOwnDeletionStatus/);
});

test("admin queue: reason and typed ERASE confirmation, server-side authority, exported slot", () => {
  const actions = source("features/data-rights-cms/DeletionRequestActions.tsx");
  assert.match(actions, /confirm !== "ERASE"/);
  assert.match(actions, /reason\.trim\(\)\.length < 5/);
  const workspace = source("features/data-rights-cms/DataRightsWorkspace.tsx");
  assert.match(workspace, /export async function DataRightsWorkspace\(\{ query \}: \{ query: Query \}\)/);
  assert.match(workspace, /listDeletionRequests/);
  const queue = source("features/data-rights-cms/DataRightsQueue.tsx");
  assert.match(queue, /name="module" value="data-rights"/);
});

test("privacy retention copy is visibly marked pending owner approval", () => {
  const privacy = source("app/privacy/page.tsx");
  assert.match(privacy, /DRAFT — PENDING OWNER APPROVAL/);
  assert.match(privacy, /not final\s+legal text/);
  assert.match(privacy, /data-status="pending-owner-approval"/);
});

test("browser fixture is development-only", () => {
  const page = source("app/design-system/data-rights/page.tsx");
  assert.match(page, /process\.env\.NODE_ENV !== "development"\) notFound\(\)/);
  assert.match(source("features/data-rights-cms/DataRightsReference.tsx"), /process\.env\.NODE_ENV !== "development"\) return null/);
});
