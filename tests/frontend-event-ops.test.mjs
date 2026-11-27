// D2.5 / D2.7 admin slot adapters and presentation rules. Authority lives server-side (see event-participants and
// notification-service tests); these checks pin that the UI delegates to it and never adds authority of its own.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loader } from "./frontend-loader.mjs";
const nmodel = loader()("features/notifications-cms/model.ts");
const pmodel = loader()("features/events-cms/participants-model.ts");
const dto = (o = {}) => ({ id: "n", type: "registration_confirmed", channel: "email", status: "pending", eventId: "e", registrationId: "r", passId: null, attemptCount: 0, retryable: false, nextAttemptAt: null, queuedAt: "2026-11-27T00:00:00Z", sentAt: null, failedAt: null, version: 1, errorCode: null, provider: null, ...o });

test("queue actions follow the delivery state machine", () => {
  assert.equal(nmodel.canResend(dto()), true); assert.equal(nmodel.canCancel(dto()), true);
  assert.equal(nmodel.canResend(dto({ status: "failed", retryable: true })), true);
  const final = dto({ status: "failed", retryable: false, attemptCount: 3 });
  assert.equal(nmodel.isFinalFailure(final), true); assert.equal(nmodel.canResend(final), false); assert.equal(nmodel.canCancel(final), false, "a final failure is already terminal"); assert.equal(nmodel.statusLabel(final), "failed — final"); assert.equal(nmodel.statusTone(final), "error");
  for (const status of ["sent", "sending", "cancelled"]) { assert.equal(nmodel.canResend(dto({ status })), false); assert.equal(nmodel.canCancel(dto({ status })), false); }
});
test("queue links stay on the notifications slot and error codes are humanized", () => {
  assert.equal(nmodel.notificationsHref({ status: "failed" }), "/admin?module=notifications&status=failed");
  assert.equal(nmodel.errorLabel("NOTIFICATION_MERGED"), "Included in the confirmation email"); assert.equal(nmodel.errorLabel(null), null);
  for (const code of ["NOTIFICATION_FORBIDDEN", "NOTIFICATION_NOT_RETRYABLE", "NOTIFICATION_RATE_LIMITED", "NOTIFICATION_PROVIDER_UNAVAILABLE"]) assert.notEqual(nmodel.notificationMessage(code), nmodel.notificationMessage("UNKNOWN"));
});
test("queue adapters delegate to existing notification actions with only id + version", async () => {
  const calls = [], cache = [];
  const actions = loader({ "next/cache": { revalidatePath: p => cache.push(p) }, "@/lib/notifications/notification-actions": {
    dispatchManagedNotification: async i => { calls.push(["dispatch", i]); return { ok: true, data: { code: "NOTIFICATION_SENT", notification: { status: "sent" } } }; },
    cancelManagedNotification: async i => { calls.push(["cancel", i]); return { ok: false, code: "NOTIFICATION_FORBIDDEN" }; } } })("features/notifications-cms/api/actions.ts");
  assert.deepEqual(await actions.resendNotification({ id: "n", expectedVersion: 2, recipient: "x@example.test" }), { ok: true, code: "NOTIFICATION_SENT", status: "sent" });
  assert.deepEqual(await actions.cancelNotification({ id: "n", expectedVersion: 2, role: "super_admin" }), { ok: false, code: "NOTIFICATION_FORBIDDEN" });
  assert.deepEqual(calls, [["dispatch", { id: "n", expectedVersion: 2 }], ["cancel", { id: "n", expectedVersion: 2 }]]);
});
test("participant adapters require server-side validation and pass no client authority", async () => {
  const calls = [];
  const actions = loader({ "next/cache": { revalidatePath: () => {} }, "@/lib/registrations/registration-actions": {
    cancelEventParticipant: async i => { calls.push(i); return { ok: false, code: "INSUFFICIENT_PERMISSION" }; },
    exportEventParticipantsCsv: async i => { calls.push(i); return { ok: false, code: "INSUFFICIENT_PERMISSION" }; } } })("features/events-cms/api/participant-actions.ts");
  assert.equal((await actions.cancelParticipant({ eventId: "e", registrationId: "r", expectedVersion: "v", reason: "Because" })).code, "INSUFFICIENT_PERMISSION");
  assert.equal((await actions.exportParticipants({ eventId: "e", status: "" })).code, "INSUFFICIENT_PERMISSION");
  assert.deepEqual(calls[1], { eventId: "e" });
  assert.match(readFileSync("features/events-cms/api/participant-actions.ts", "utf8"), /cancelEventParticipant/, "uses the reason-required staff path");
});
test("participant presentation rules", () => {
  assert.equal(pmodel.participantsHref({ eventId: "e" }), "/admin?module=participants&eventId=e");
  assert.ok(pmodel.reasonError("abc")); assert.ok(pmodel.reasonError("x".repeat(241))); assert.ok(pmodel.reasonError("<b>bold</b>")); assert.equal(pmodel.reasonError("Duplicate entry"), "");
  assert.deepEqual([...pmodel.STAFF_CANCELLABLE], ["pending", "confirmed", "waitlisted"]);
  assert.equal(pmodel.statusTone("confirmed"), "success"); assert.equal(pmodel.statusTone("cancelled"), "error");
});
test("workspaces validate their own query before any service call and never expose recipients", () => {
  const p = readFileSync("features/events-cms/ParticipantsWorkspace.tsx", "utf8"), n = readFileSync("features/notifications-cms/NotificationsWorkspace.tsx", "utf8");
  assert.match(p, /REGISTRATION_VALIDATION_ERROR/); assert.match(n, /NOTIFICATION_INVALID_TEMPLATE/);
  assert.doesNotMatch(n.replace(/\/\*[\s\S]*?\*\//g, ""), /recipient|payload|idempotency/); assert.doesNotMatch(p + n, /localStorage|dangerouslySetInnerHTML/);
});
