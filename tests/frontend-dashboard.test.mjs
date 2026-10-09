import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const { dashboardProjection, completionGuidance } = loader()(
  "features/member-dashboard/model.ts",
);
const base = {
  ok: true,
  data: {
    account: {
      id: "private-account",
      email: "private@example.invalid",
      memberId: "USS-TEST",
      status: "active",
      emailVerified: true,
      displayName: "Account Name",
    },
    profile: {
      fullName: "Profile Name",
      avatar: null,
      phone: "+123456789",
      version: "private-version",
      emergencyContactName: "Private Contact",
    },
    completion: {
      percentage: 20,
      missingFields: ["phone", "city", "emergencyContact"],
    },
  },
};
test("overview projects only allowed identity and server completion", () => {
  const result = dashboardProjection(base);
  assert.equal(result.data.displayName, "Profile Name");
  assert.equal(result.data.completion.percentage, 20);
  assert.equal(
    Object.keys(result.data).sort().join(),
    "avatar,completion,displayName,emailVerified,memberId,status",
  );
  for (const secret of [
    "private-account",
    "private@example",
    "private-version",
    "Private Contact",
    "+123456789",
    "barcode",
  ])
    assert.ok(!JSON.stringify(result).includes(secret));
});
test("name fallback follows owner identity, never email", () => {
  assert.equal(
    dashboardProjection({
      ...base,
      data: { ...base.data, profile: { ...base.data.profile, fullName: null } },
    }).data.displayName,
    "Account Name",
  );
  assert.equal(
    dashboardProjection({
      ...base,
      data: {
        ...base.data,
        profile: { ...base.data.profile, fullName: null },
        account: { ...base.data.account, displayName: null },
      },
    }).data.displayName,
    "USS-TEST",
  );
});
test("inactive or unverified success cannot display protected identity", () => {
  for (const [status, code] of [
    ["pending_verification", "EMAIL_NOT_VERIFIED"],
    ["suspended", "ACCOUNT_SUSPENDED"],
    ["deactivated", "ACCOUNT_DEACTIVATED"],
  ])
    assert.deepEqual(
      dashboardProjection({
        ...base,
        data: { ...base.data, account: { ...base.data.account, status } },
      }),
      { ok: false, code },
    );
  assert.deepEqual(
    dashboardProjection({
      ...base,
      data: {
        ...base.data,
        account: { ...base.data.account, emailVerified: false },
      },
    }),
    { ok: false, code: "EMAIL_NOT_VERIFIED" },
  );
});
test("safe backend failure codes survive without unsafe metadata", () => {
  for (const code of [
    "UNAUTHENTICATED",
    "AUTH_NOT_CONFIGURED",
    "AUTH_UNAVAILABLE",
    "PROFILE_NOT_FOUND",
    "PROFILE_UNAVAILABLE",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DEACTIVATED",
    "EMAIL_NOT_VERIFIED",
  ])
    assert.deepEqual(
      dashboardProjection({ ok: false, code, extra: "raw error" }),
      { ok: false, code },
    );
});
test("malformed identity and completion degrade without recalculating rules", () => {
  for (const result of [
    null,
    { ok: true, data: null },
    { ...base, data: { ...base.data, profile: null } },
    {
      ...base,
      data: {
        ...base.data,
        account: { ...base.data.account, status: "unknown" },
      },
    },
    {
      ...base,
      data: { ...base.data, profile: { ...base.data.profile, fullName: 42 } },
    },
    ...[-1, 101, NaN].map((percentage) => ({
      ...base,
      data: { ...base.data, completion: { percentage, missingFields: [] } },
    })),
    {
      ...base,
      data: {
        ...base.data,
        completion: { percentage: 30, missingFields: null },
      },
    },
  ])
    assert.deepEqual(dashboardProjection(result), {
      ok: false,
      code: "PROFILE_UNAVAILABLE",
    });
});
test("completion guidance handles backend emergency pair and future fields safely", () => {
  assert.match(
    completionGuidance(base.data.completion),
    /an emergency contact/,
  );
  assert.ok(
    !completionGuidance(base.data.completion).includes("emergencyContact"),
  );
  assert.match(
    completionGuidance({ percentage: 90, missingFields: ["futureField"] }),
    /Review your profile/,
  );
  assert.match(
    completionGuidance({ percentage: 100, missingFields: [] }),
    /up to date/,
  );
});
test("backend remains the authority for percentages and missing guidance", () => {
  const result = dashboardProjection({
    ...base,
    data: {
      ...base.data,
      completion: { percentage: 70, missingFields: ["city"] },
    },
  });
  assert.equal(result.data.completion.percentage, 70);
  assert.deepEqual(Array.from(result.data.completion.missingFields), ["city"]);
});
test("server adapter calls canonical owner read once per explicit read and returns minimized projection", async () => {
  let calls = 0;
  const load = loader({
    react: { cache: (fn) => fn },
    "@/lib/member/profile-actions": {
      getOwnMemberProfile: async () => {
        calls++;
        return base;
      },
    },
  });
  assert.equal(
    (await load("features/member-dashboard/api/server.ts").loadDashboard()).data
      .memberId,
    "USS-TEST",
  );
  assert.equal(calls, 1);
});
test("unexpected server exceptions become unavailable without exposing internals", async () => {
  const load = loader({
    react: { cache: (fn) => fn },
    "@/lib/member/profile-actions": {
      getOwnMemberProfile: async () => {
        throw new Error("secret SQL");
      },
    },
  });
  assert.deepEqual(
    await load("features/member-dashboard/api/server.ts").loadDashboard(),
    { ok: false, code: "PROFILE_UNAVAILABLE" },
  );
});
