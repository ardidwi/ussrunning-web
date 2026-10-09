import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const load = loader(),
  { cardPresentation, initials } = load(
    "features/member-card/utils/presentation.ts",
  ),
  { renderMemberBarcode } = load("features/member-card/utils/barcode.ts");
const value = "USS-11111111-1111-4111-8111-111111111111";
const result = {
  ok: true,
  code: "MEMBER_CARD_AVAILABLE",
  data: {
    displayName: "Fictional Runner",
    memberId: "USS-PREVIEW",
    barcode: { value, formatVersion: 1 },
    status: "active",
    avatar: null,
  },
};
test("card presentation uses exact shared backend DTO and preserves both distinct identities", () => {
  assert.equal(cardPresentation(result), result);
  assert.notEqual(result.data.memberId, result.data.barcode.value);
});
test("all backend lifecycle failures remain safe failure results", () => {
  for (const code of [
    "UNAUTHENTICATED",
    "EMAIL_NOT_VERIFIED",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DEACTIVATED",
    "PROFILE_NOT_FOUND",
    "PROFILE_UNAVAILABLE",
  ])
    assert.deepEqual(cardPresentation({ ok: false, code }), {
      ok: false,
      code,
    });
});
test("defensive non-active success never displays a card", () => {
  for (const [status, code] of [
    ["pending_verification", "EMAIL_NOT_VERIFIED"],
    ["suspended", "ACCOUNT_SUSPENDED"],
    ["deactivated", "ACCOUNT_DEACTIVATED"],
  ])
    assert.equal(
      cardPresentation({ ...result, data: { ...result.data, status } }).code,
      code,
    );
});
test("malformed or unknown barcode protocols cannot render member identity", () => {
  for (const raw of [
    null,
    {
      ...result,
      data: {
        ...result.data,
        barcode: { value: "email@example.com", formatVersion: 1 },
      },
    },
    {
      ...result,
      data: { ...result.data, barcode: { value, formatVersion: 2 } },
    },
    { ...result, data: { ...result.data, barcode: null } },
  ])
    assert.equal(cardPresentation(raw).code, "PROFILE_UNAVAILABLE");
});
test("initials fallback handles empty names and Unicode without splitting surrogate pairs", () => {
  assert.equal(initials("  "), "");
  assert.equal(initials("Preview Runner"), "PR");
  assert.equal(initials("🦊 Runner"), "🦊R");
});
test("renderer gives existing QR library only backend payload, H correction and four-module quiet zone", async () => {
  let received;
  const mock = loader({
    qrcode: {
      toString: (input, options) => {
        received = { input, options };
        return Promise.resolve("<svg/>");
      },
    },
  });
  assert.equal(
    await mock("features/member-card/utils/barcode.ts").renderMemberBarcode(
      value,
    ),
    "<svg/>",
  );
  assert.equal(received.input, value);
  assert.equal(received.options.margin, 4);
  assert.equal(received.options.errorCorrectionLevel, "H");
  assert.equal(received.options.type, "svg");
  assert.ok(!JSON.stringify(received).includes("Fictional"));
});
test("real renderer produces stable SVG without PII or textual full UUID", async () => {
  const first = await renderMemberBarcode(value),
    second = await renderMemberBarcode(value);
  assert.equal(first, second);
  assert.ok(first.startsWith("<svg"));
  assert.ok(first.includes("viewBox"));
  assert.ok(first.includes("#ffffff"));
  for (const text of [
    value,
    result.data.displayName,
    result.data.memberId,
    "email",
    "phone",
  ])
    assert.ok(!first.includes(text));
});
test("invalid barcode data is rejected before rendering", async () => {
  for (const payload of [
    "Runner",
    "runner@example.com",
    "+62812345678",
    "USS-" + value,
    value.toLowerCase(),
  ])
    await assert.rejects(renderMemberBarcode(payload));
});
