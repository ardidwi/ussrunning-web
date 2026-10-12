import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loader } from "./frontend-loader.mjs";
const load = loader(),
  { qrBranding, USS_QR_LOGO } = load("features/qr/branding.ts"),
  { renderBrandedQr } = load("features/qr/render.ts"),
  { activePassMatches, passPath, passMessages } = load(
    "features/event-pass/model.ts",
  );
const ref = {
  eventId: "11111111-1111-4111-8111-111111111111",
  registrationId: "22222222-2222-4222-8222-222222222222",
};
const token = "USS-EVENT:1:" + "A".repeat(43);
const pass = {
  id: "pass",
  ...ref,
  status: "active",
  formatVersion: 1,
  issuedAt: "2035-01-01T00:00:00Z",
  expiresAt: null,
  barcode: { value: token, formatVersion: 1 },
};
test("QR defaults: USS logo, high correction and four-module quiet zone", () => {
  const c = qrBranding();
  assert.equal(c.centerLogoUrl, USS_QR_LOGO);
  assert.equal(c.errorCorrection, "H");
  assert.equal(c.quietZone, 4);
});
test("event override and explicit plain QR are supported", () => {
  assert.equal(
    qrBranding({ centerLogoUrl: "/event.svg" }).centerLogoUrl,
    "/event.svg",
  );
  assert.equal(qrBranding({ centerLogoUrl: null }).centerLogoUrl, null);
});
test("unsafe logo schemes cannot enter the rendering contract", () => {
  for (const s of [
    "javascript:alert(1)",
    "//example.com/a",
    "data:image/svg+xml,x",
  ]) {
    assert.equal(qrBranding({ centerLogoUrl: s }).centerLogoUrl, USS_QR_LOGO);
  }
});
test("oversized/nonfinite logo and padding are bounded", () => {
  const c = qrBranding({ logoScale: 900, logoPadding: 900, quietZone: 0 });
  assert.equal(c.logoScale, 0.12);
  assert.equal(c.logoPadding, 0.5);
  assert.equal(c.quietZone, 4);
  assert.equal(qrBranding({ logoScale: NaN }).logoScale, 0.1);
});
test("quiet zone upper bound avoids shrinking the readable symbol", () =>
  assert.equal(qrBranding({ quietZone: 1000 }).quietZone, 12));
test("a logo always requires high error correction", () =>
  assert.equal(qrBranding({ errorCorrection: "L" }).errorCorrection, "H"));
test("low contrast and inverted colors revert to opaque black/white", () => {
  for (const c of [
    { foreground: "#bbbbbb", background: "#ffffff" },
    { foreground: "#ffffff", background: "#000000" },
  ]) {
    const r = qrBranding(c);
    assert.equal(r.foreground, "#000000");
    assert.equal(r.background, "#ffffff");
  }
});
test("safe high contrast branding remains configurable", () =>
  assert.equal(qrBranding({ foreground: "#070707" }).foreground, "#070707"));
test("branding variations encode identical issued payload with no text transformation", async () => {
  const original = await renderBrandedQr(token);
  for (const config of [
    { centerLogoUrl: "/custom.svg" },
    { centerLogoUrl: null },
    { logoScale: 999 },
    { centerLogoUrl: "/missing.svg" },
  ]) {
    const next = await renderBrandedQr(token, config);
    assert.equal(next.svg, original.svg);
  }
  assert.ok(!original.svg.includes(token));
  assert.ok(!original.svg.includes("email"));
});
test("center logo never overlaps reserved QR structures", async () => {
  const { default: QRCode } = await import("qrcode");
  for (const value of [token, "x".repeat(120), "x".repeat(250)]) {
    const r = await renderBrandedQr(value, { logoScale: 0.12 });
    const m = QRCode.create(value, { errorCorrectionLevel: "H" }).modules;
    const half = (m.size * 0.12) / 2;
    let reserved = false;
    for (
      let y = Math.floor(m.size / 2 - half);
      y < Math.ceil(m.size / 2 + half);
      y++
    )
      for (
        let x = Math.floor(m.size / 2 - half);
        x < Math.ceil(m.size / 2 + half);
        x++
      )
        if (m.isReserved(y, x)) reserved = true;
    assert.equal(r.logoPercent === 0, reserved);
  }
});
test("empty and oversized rendering has controlled failure", async () => {
  await assert.rejects(renderBrandedQr(""));
  await assert.rejects(renderBrandedQr("x".repeat(2049)));
});
test("matching active BE-09 DTO is displayable", () =>
  assert.ok(activePassMatches(pass, ref)));
for (const [label, change] of [
  ["revoked", { status: "revoked" }],
  ["wrong registration", { registrationId: "other" }],
  ["wrong event", { eventId: "other" }],
  ["member barcode", { barcode: { value: "USS-uuid", formatVersion: 1 } }],
  ["wrong protocol", { formatVersion: 0 }],
])
  test("never display " + label, () =>
    assert.ok(!activePassMatches({ ...pass, ...change }, ref)),
  );
test("navigation contains only resource IDs, never the pass credential", () => {
  assert.ok(passPath(ref).startsWith("/dashboard/registrations/"));
  assert.ok(!passPath(ref).includes(token));
});
for (const code of [
  "EVENT_PASS_REVOKED",
  "EVENT_PASS_EXPIRED",
  "EVENT_PASS_NOT_ELIGIBLE",
  "EVENT_PASS_NOT_CONFIGURED",
])
  test("safe feedback for " + code, () =>
    assert.ok(passMessages[code].length > 20),
  );
function adapter({
  registration = { ok: true, data: { id: ref.registrationId } },
  read = { ok: true, data: pass },
  issue = { ok: true, data: pass },
} = {}) {
  const calls = [];
  const a = loader({
    "next/cache": { revalidatePath: (p) => calls.push(["invalidate", p]) },
    "@/lib/registrations/registration-actions": {
      getCurrentRegistration: async (v) => {
        calls.push(["registration", v]);
        return registration;
      },
    },
    "@/lib/passes/pass-actions": {
      getCurrentEventPass: async (v) => {
        calls.push(["read", v]);
        return read;
      },
      issueCurrentEventPass: async (v) => {
        calls.push(["issue", v]);
        return issue;
      },
    },
  })("features/event-pass/api/actions.ts");
  return { a, calls };
}
test("read delegates exact resource reference without client account or role", async () => {
  const { a, calls } = adapter();
  assert.ok(
    (
      await a.readEventPass({
        ...ref,
        accountId: "forged",
        role: "super_admin",
      })
    ).ok,
  );
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["registration", "read"],
  );
  assert.deepEqual(calls[0][1], ref);
  assert.deepEqual(calls[1][1], ref);
});
test("no pass read never implicitly issues", async () => {
  const { a, calls } = adapter({
    read: { ok: false, code: "EVENT_PASS_NOT_FOUND" },
  });
  const r = await a.readEventPass(ref);
  assert.equal(r.data.pass.code, "EVENT_PASS_NOT_FOUND");
  assert.ok(!calls.some((c) => c[0] === "issue"));
});
test("registration authorization denial short-circuits private reads", async () => {
  const { a, calls } = adapter({
    registration: { ok: false, code: "UNAUTHENTICATED" },
  });
  assert.equal((await a.readEventPass(ref)).code, "UNAUTHENTICATED");
  assert.equal(calls.length, 1);
});
test("pass lifecycle denial removes previously read registration context", async () => {
  const { a } = adapter({ read: { ok: false, code: "ACCOUNT_SUSPENDED" } });
  const r = await a.readEventPass(ref);
  assert.ok(!r.ok);
  assert.ok(!("data" in r));
});
test("list entry projects availability only, no token or identity", async () => {
  const { a } = adapter();
  assert.deepEqual(await a.readPassEntry(ref), { ok: true, available: true });
});
test("malformed/mismatched backend success fails closed", async () => {
  for (const data of [null, { ...pass, eventId: "other" }, { ...pass, barcode: null }]) {
    const { a } = adapter({ read: { ok: true, data } });
    assert.equal((await a.readEventPass(ref)).code, "EVENT_PASS_UNAVAILABLE");
  }
});
test("issuance failure is not changed into fabricated success", async () => {
  const { a, calls } = adapter({
    issue: { ok: false, code: "EVENT_PASS_REVOKED" },
  });
  assert.equal((await a.requestEventPass(ref)).code, "EVENT_PASS_REVOKED");
  assert.deepEqual(
    calls.map((c) => c[0]),
    ["issue"],
  );
});
test("successful issuance is rechecked before presenting a credential", async () => {
  const { a, calls } = adapter();
  assert.ok((await a.requestEventPass(ref)).ok);
  assert.deepEqual(
    calls.filter((c) => c[0] !== "invalidate").map((c) => c[0]),
    ["issue", "registration", "read"],
  );
});
test("development fixtures are independently guarded; no privileged backend action", () => {
  const source = readFileSync(
    "features/event-pass/components/PassReference.tsx",
    "utf8",
  );
  assert.match(source, /process.env.NODE_ENV\s*!==\s*"development"/);
  assert.ok(!source.includes("issueCurrentEventPass"));
  assert.match(
    readFileSync("app/design-system/qr-fixture/route.ts", "utf8"),
    /process.env.NODE_ENV\s*!==\s*"development"/,
  );
});
