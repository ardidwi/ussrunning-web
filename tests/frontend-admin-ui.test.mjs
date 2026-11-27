import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loader } from "./frontend-loader.mjs";

// Admin UI lane: navigation per role, slot contract, member UI policy and scanner relocation.
const load = loader();
const { ROLE_PERMISSIONS } = load("lib/authz/permissions.ts");
const { permissionView } = load("features/permissions/model.ts");
const { CMS_MODULES, cmsModule } = load("features/cms/navigation.ts");
const model = load("features/members-cms/model.ts");
const { checkInHref } = load("features/check-in/model.ts");
const visible = role => CMS_MODULES.filter(item => permissionView(role ? { roles: [role], permissions: ROLE_PERMISSIONS[role], displayName: "x" } : null).canAny(item.permissions)).map(item => item.id);

test("unauthenticated and member see no admin modules", () => {
  assert.deepEqual(visible(null), []);
  assert.deepEqual(visible("member"), []);
});
test("admin sees members (restricted), photo review, scanner and event ops but not roles, data requests or settings", () => {
  const ids = visible("admin");
  for (const id of ["overview", "members", "moderation", "member-scanner", "check-in", "participants", "notifications", "media"]) assert.ok(ids.includes(id), id);
  for (const id of ["roles", "data-rights", "settings"]) assert.ok(!ids.includes(id), id);
});
test("super_admin sees every module", () => assert.deepEqual(visible("super_admin"), CMS_MODULES.map(item => item.id)));
test("unknown module falls back to overview", () => assert.equal(cmsModule("../etc"), "overview"));

test("slot registry is empty by default and every slot is a permission-gated nav module", () => {
  const src = readFileSync("features/cms/admin-slots.tsx", "utf8");
  assert.match(src, /export const ADMIN_SLOTS: AdminSlotRegistry = \{\s*(\/\/[^\n]*\n\s*)*\};/);
  const page = readFileSync("app/admin/page.tsx", "utf8");
  assert.match(page, /isAdminSlot\(module\)/);
  assert.ok(page.indexOf("access.canAny(item.permissions)") < page.indexOf("isAdminSlot(module)"), "permission check precedes slot rendering");
  for (const id of ["media", "participants", "notifications", "data-rights"]) assert.ok(CMS_MODULES.some(item => item.id === id && item.permissions.length));
});

test("lifecycle actions mirror backend transitions and never offer super_admin changes", () => {
  const m = (status, emailVerified = true, roles = ["member"]) => model.lifecycleOperations({ status, emailVerified, roles });
  assert.deepEqual(m("active"), ["suspend", "deactivate"]);
  assert.deepEqual(m("suspended"), ["activate", "deactivate"]);
  assert.deepEqual(m("suspended", false), ["deactivate"]);
  assert.deepEqual(m("deactivated", false), []);
  assert.deepEqual(m("pending_verification", false), ["deactivate"]);
  assert.deepEqual(m("active", true, ["member", "super_admin"]), []);
});
test("reason is mandatory, bounded plain text", () => {
  for (const bad of ["", "    ", "abcd", "<script>", "x".repeat(501), "ok reason\u0000"]) assert.ok(model.reasonError(bad), bad);
  assert.equal(model.reasonError("Member asked to close."), null);
  assert.ok(model.reasonError("x".repeat(241), model.PHOTO_REASON_LIMITS));
});
test("known conflict, last super admin and self-action codes have explicit messages", () => {
  for (const code of ["USER_CONFLICT", "USER_LAST_SUPER_ADMIN", "USER_SELF_ACTION_FORBIDDEN", "USER_PROTECTED"]) assert.ok(model.USER_MESSAGES[code]);
  for (const code of ["ROLE_CONFLICT", "ROLE_LAST_SUPER_ADMIN", "ROLE_SELF_ACTION_FORBIDDEN", "ROLE_TARGET_INELIGIBLE"]) assert.ok(model.ROLE_MESSAGES[code]);
  assert.ok(model.isConflict("USER_CONFLICT") && model.isConflict("AVATAR_CONFLICT") && !model.isConflict("USER_FORBIDDEN"));
  assert.match(model.messageFor({}, "SOMETHING"), /Nothing was changed/);
});
test("member query rejects unsupported filters before any server call", () => {
  const q = values => model.memberQuery(key => values[key] ?? "");
  assert.equal(q({}).ok, true);
  for (const values of [{ status: "banned" }, { search: "ab" }, { search: "<b>" }, { cursor: "%%" }, { member: "1" }]) assert.equal(q(values).ok, false);
  assert.equal(model.membersHref({ status: "active", search: "a&b" }), "/admin?module=members&status=active&search=a%26b");
});
test("check-in moved into /admin; legacy routes redirect", () => {
  assert.equal(checkInHref(), "/admin?module=check-in");
  assert.equal(checkInHref("a/b"), "/admin?module=check-in&event=a%2Fb");
  for (const file of ["app/dashboard/check-in/page.tsx", "app/dashboard/check-in/[eventId]/page.tsx"])
    assert.match(readFileSync(file, "utf8"), /redirect\(/);
  assert.ok(!readFileSync("features/check-in/components/ScannerScreen.tsx", "utf8").includes("/dashboard/check-in"));
});
