import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const load = loader(),
  { permissionView } = load("features/permissions/model.ts"),
  { ROLE_PERMISSIONS } = load("lib/authz/permissions.ts"),
  { CMS_MODULES } = load("features/cms/navigation.ts"),
  { auditQuery, revisionQuery, historyHref } = load(
    "features/history/query.ts",
  );
const snapshot = (role) => ({
  roles: [role],
  permissions: ROLE_PERMISSIONS[role],
  displayName: "Fictional Reviewer",
});
test("missing permission snapshot fails closed", () => {
  const access = permissionView(null);
  assert.equal(access.can("stories.manage"), false);
  assert.equal(access.canAny([]), false);
  assert.equal(access.hasRole("super_admin"), false);
});
test("member snapshot allows self features and no administrative modules", () => {
  const access = permissionView(snapshot("member"));
  assert.equal(access.can("member_card.read.self"), true);
  assert.equal(
    CMS_MODULES.filter((item) => access.canAny(item.permissions)).length,
    0,
  );
});
test("admin sees operational content/history but no elevated capabilities", () => {
  const access = permissionView(snapshot("admin"));
  for (const p of [
    "stories.manage",
    "events.manage",
    "cms.content.manage",
    "audit.read",
  ])
    assert.equal(access.can(p), true);
  for (const p of [
    "users.manage",
    "roles.manage",
    "settings.manage",
    "audit.read.all",
  ])
    assert.equal(access.can(p), false);
  assert.equal(access.hasRole("super_admin"), false);
});
test("super_admin snapshot permits elevated modules with exact hasRole semantics", () => {
  const access = permissionView(snapshot("super_admin"));
  assert.equal(access.hasRole("admin"), false);
  for (const p of [
    "users.manage",
    "roles.manage",
    "settings.manage",
    "audit.read.all",
  ])
    assert.equal(access.can(p), true);
});
test("frontend never derives permissions from a claimed role alone", () => {
  const access = permissionView({
    roles: ["super_admin"],
    permissions: [],
    displayName: "Fictional",
  });
  assert.equal(access.can("users.manage"), false);
  assert.equal(access.canAny(["users.manage", "stories.manage"]), false);
});
test("audit filter defaults/bounds use canonical HISTORY_POLICY", () => {
  assert.equal(auditQuery({}).filters.limit, 25);
  for (const value of ["101", "0", "1.5", "-1", "Infinity"])
    assert.equal(auditQuery({ limit: value }).ok, false);
  assert.equal(auditQuery({ limit: "100" }).filters.limit, 100);
});
test("audit rejects invalid, incomplete, reversed and excessive date windows", () => {
  for (const query of [
    { fromDate: "2026-02-30", untilDate: "2026-03-01" },
    { fromDate: "2026-01-01" },
    { fromDate: "2026-04-01", untilDate: "2026-03-01" },
    { fromDate: "2024-01-01", untilDate: "2026-01-01" },
  ])
    assert.equal(auditQuery(query).ok, false);
});
test("date-only filters map unambiguously to inclusive UTC calendar dates", () => {
  assert.deepEqual(
    auditQuery({ fromDate: "2026-10-01", untilDate: "2026-10-09" }).filters,
    {
      limit: 25,
      from: "2026-10-01T00:00:00.000Z",
      until: "2026-10-09T23:59:59.999Z",
    },
  );
});
test("next-page filters retain exact trusted microsecond window and opaque cursor", () => {
  const query = {
    from: "2026-09-09T00:00:00.123456Z",
    until: "2026-10-09T00:00:00.123456Z",
    cursor: "opaque-position",
    limit: "50",
    action: "story.published",
  };
  assert.deepEqual(auditQuery(query).filters, { ...query, limit: 50 });
  assert.ok(
    historyHref("activity", query).startsWith("/admin?module=activity&"),
  );
});
test("revision input permits only canonical entity types and bounded pages", () => {
  const id = "22222222-2222-4222-8222-222222222222";
  assert.equal(revisionQuery({ entity: "story", entityId: id }).limit, 25);
  for (const q of [
    { entity: "account", entityId: id },
    { entity: "story", entityId: "invalid" },
    { entity: "story", entityId: id, limit: "101" },
  ])
    assert.equal(revisionQuery(q), null);
});
test("server permission projection omits account/provider/email/barcode data", async () => {
  const mock = loader({
    "@/lib/authz/guards": {
      getAuthorization: async () => ({
        account: {
          id: "private-id",
          email: "private@example.com",
          barcodeValue: "opaque",
          displayName: "Safe Name",
        },
        roles: ["admin"],
      }),
      requireAnyPermission: async () => {
        throw Error("Raw SQL secret");
      },
    },
  });
  const service = mock("features/permissions/server.ts");
  const response = await service.loadPermissions();
  assert.deepEqual(Object.keys(response.data).sort(), [
    "displayName",
    "permissions",
    "roles",
  ]);
  assert.ok(!JSON.stringify(response).includes("private"));
  assert.equal(
    (await service.loadCmsPermissions()).code,
    "AUTHORIZATION_UNAVAILABLE",
  );
});
