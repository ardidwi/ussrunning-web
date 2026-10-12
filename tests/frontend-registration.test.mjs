import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
function harness(response) {
  const calls = [],
    invalidated = [];
  const actions = loader({
    "next/cache": { revalidatePath: (...args) => invalidated.push(args) },
    "@/lib/registrations/registration-actions": Object.fromEntries(
      [
        "registerCurrentAccountForEvent",
        "cancelCurrentRegistration",
        "getCurrentRegistrationHistory",
      ].map((name) => [
        name,
        async (value) => {
          calls.push({ name, value });
          return response;
        },
      ]),
    ),
  })("features/event-registration/api/actions.ts");
  return { actions, calls, invalidated };
}
test("registration uses backend event identifier only, never member identity", async () => {
  const h = harness({ ok: true, data: { status: "confirmed" } });
  await h.actions.registerForEvent("server-event");
  assert.deepEqual(h.calls[0], {
    name: "registerCurrentAccountForEvent",
    value: { eventId: "server-event" },
  });
  assert.equal(h.invalidated.length, 3);
});
for (const status of ["confirmed", "waitlisted"])
  test(`preserves authoritative ${status} response`, async () => {
    const response = {
        ok: true,
        data: { id: "permanent-registration", status },
      },
      h = harness(response);
    assert.equal(await h.actions.registerForEvent("event"), response);
  });
test("cancellation strips untrusted account claims and forwards exact optimistic version", async () => {
  const h = harness({ ok: true, data: { status: "cancelled" } });
  await h.actions.requestCancellation({
    eventId: "e",
    registrationId: "r",
    expectedVersion: "server-version",
    accountId: "attacker",
  });
  assert.deepEqual(h.calls[0].value, {
    eventId: "e",
    registrationId: "r",
    expectedVersion: "server-version",
  });
});
for (const code of [
  "REGISTRATION_CONFLICT",
  "REGISTRATION_CLOSED",
  "EVENT_CAPACITY_FULL",
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_DEACTIVATED",
  "INSUFFICIENT_PERMISSION",
  "REGISTRATION_NOT_CANCELLABLE",
])
  test(`${code} is retained without inventing success`, async () => {
    const response = { ok: false, code },
      h = harness(response);
    assert.equal(await h.actions.registerForEvent("event"), response);
    assert.equal(h.invalidated.length, 0);
  });
test("history keeps bounded 20-row cursor and event scope", async () => {
  const h = harness({ ok: true, data: { items: [], nextCursor: null } });
  await h.actions.readHistory("opaque", "event");
  assert.deepEqual(h.calls[0].value, {
    limit: 20,
    cursor: "opaque",
    eventId: "event",
  });
});
test("empty owner history stays empty and does not activate fixture fallback", async () => {
  const h = harness({ ok: true, data: { items: [], nextCursor: null } });
  assert.equal((await h.actions.readHistory()).data.items.length, 0);
  assert.deepEqual(h.calls[0].value, { limit: 20 });
});
test("event calendar day uses the event timezone, not browser timezone", () => {
  const model = loader()("features/event-registration/model.ts");
  assert.match(
    model.eventDate("2027-01-15T23:00:00Z", "Asia/Jakarta"),
    /16 Jan 2027/,
  );
  assert.equal(model.eventDate("broken", "broken"), "Date unavailable");
});
