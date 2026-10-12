import test from "node:test";
import assert from "node:assert/strict";
import { loader } from "./frontend-loader.mjs";
const model = loader()("features/check-in/model.ts");
const token = "USS-EVENT:1:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFw";
const eventId = "11111111-1111-4111-8111-111111111111";
for (const value of [
  "USS-11111111-1111-4111-8111-111111111111",
  "",
  token + " ",
  " " + token,
  "https://example.com/" + token,
  "USS-EVENT:2:" + "A".repeat(43),
])
  test("reject non-pass input: " + value.slice(0, 20), () =>
    assert.equal(model.passShape(value), false),
  );
test("exact issued pass shape is accepted without transformation", () =>
  assert.equal(model.passShape(token), true));
test("duplicate frames stay locked until explicit acknowledgement", () => {
  const latch = model.scanLatch();
  assert.equal(latch.take(), true);
  for (let i = 0; i < 100; i++) assert.equal(latch.take(), false);
  latch.release();
  assert.equal(latch.take(), true);
});
for (const code of [
  "CHECK_IN_SUCCESS",
  "ALREADY_CHECKED_IN",
  "PASS_INVALID",
  "PASS_REVOKED",
  "PASS_EXPIRED",
  "WRONG_EVENT",
  "REGISTRATION_CANCELLED",
  "REGISTRATION_NOT_CONFIRMED",
  "ACCOUNT_INELIGIBLE",
  "CHECK_IN_NOT_OPEN",
  "CHECK_IN_CLOSED",
  "CHECK_IN_DISABLED",
  "CHECK_IN_WINDOW_UNCONFIGURED",
  "CHECK_IN_RATE_LIMITED",
  "CHECK_IN_NOT_CONFIGURED",
  "FORBIDDEN",
  "CONFLICT",
  "SERVER_ERROR",
  "NETWORK_ERROR",
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_DEACTIVATED",
])
  test("stable copy for " + code, () =>
    assert.match(model.scanMessages[code], /[A-Za-z]/),
  );
test("role/session failures block further scans", () => {
  for (const c of [
    "FORBIDDEN",
    "UNAUTHENTICATED",
    "EMAIL_NOT_VERIFIED",
    "ACCOUNT_SUSPENDED",
    "ACCOUNT_DEACTIVATED",
  ])
    assert.equal(model.blockedCode(c), true);
  assert.equal(model.blockedCode("WRONG_EVENT"), false);
});
test("cooldown uses only backend timing and bounds malformed numbers", () => {
  assert.equal(
    model.retrySeconds({
      ok: false,
      code: "CHECK_IN_RATE_LIMITED",
      retryAfterSeconds: 2.2,
    }),
    3,
  );
  assert.equal(
    model.retrySeconds({
      ok: false,
      code: "PASS_INVALID",
      retryAfterSeconds: 99,
    }),
    0,
  );
  assert.equal(
    model.retrySeconds({
      ok: false,
      code: "CHECK_IN_RATE_LIMITED",
      retryAfterSeconds: Infinity,
    }),
    0,
  );
  assert.equal(
    model.retrySeconds({
      ok: false,
      code: "CHECK_IN_RATE_LIMITED",
      retryAfterSeconds: 9999,
    }),
    3600,
  );
});
const success = {
  ok: true,
  code: "CHECK_IN_SUCCESS",
  data: {
    event: { id: eventId, title: "Run", timezone: "Asia/Jakarta" },
    member: { displayName: "Runner", memberId: "USS-123" },
    registration: { id: "r", status: "confirmed" },
    checkIn: {
      id: "c",
      passId: "p",
      checkedInAt: "2035-01-01T00:00:00Z",
      status: "checked_in",
    },
  },
};
test("wrong-event success fails closed", () =>
  assert.deepEqual(model.scopedResult(success, "other"), {
    ok: false,
    code: "SERVER_ERROR",
  }));
test("same-event successful and already-recorded results are preserved", () => {
  assert.deepEqual(model.scopedResult(success, eventId), success);
  const r = { ...success, code: "ALREADY_CHECKED_IN" };
  assert.deepEqual(model.scopedResult(r, eventId), r);
});
test("server failures are not inferred as success", () => {
  for (const code of ["WRONG_EVENT", "CONFLICT", "PASS_REVOKED"]) {
    const r = { ok: false, code };
    assert.deepEqual(model.scopedResult(r, eventId), r);
  }
});
test("manual adapter delegates exactly eventId and untouched value", async () => {
  let received;
  const api = loader({
    "@/lib/checkin/check-in-actions": {
      scanEventPass: async (input) => ((received = input), success),
    },
    "@/lib/events/event-actions": {},
  })("features/check-in/api/actions.ts");
  assert.deepEqual(await api.submitCheckIn(eventId, token), success);
  assert.deepEqual(received, { eventId, value: token });
});
test("trusted managed context is projected without unrelated fields", async () => {
  const api = loader({
    "@/lib/checkin/check-in-actions": {},
    "@/lib/events/event-actions": {
      getManagedEventDetail: async (id) => ({
        ok: true,
        data: {
          id,
          title: "Run",
          startsAt: "date",
          endsAt: null,
          timezone: "Asia/Jakarta",
          status: "published",
          version: "private",
          description: { paragraphs: ["private"] },
        },
      }),
    },
  })("features/check-in/api/actions.ts");
  assert.deepEqual(
    Object.keys((await api.readScannerContext(eventId)).data).sort(),
    ["id", "title", "startsAt", "endsAt", "timezone", "status"].sort(),
  );
});
test("backend authorization denial passes through context adapter", async () => {
  const denied = { ok: false, code: "INSUFFICIENT_PERMISSION" };
  const api = loader({
    "@/lib/checkin/check-in-actions": {},
    "@/lib/events/event-actions": { getManagedEventDetail: async () => denied },
  })("features/check-in/api/actions.ts");
  assert.deepEqual(await api.readScannerContext(eventId), denied);
});
test("event list is bounded and opaque cursor preserved", async () => {
  let received;
  const api = loader({
    "@/lib/checkin/check-in-actions": {},
    "@/lib/events/event-actions": {
      getManagedEventList: async (input) => (
        (received = input),
        { ok: true, data: { items: [], nextCursor: "next" } }
      ),
    },
  })("features/check-in/api/actions.ts");
  assert.equal((await api.readScannerEvents("opaque")).data.nextCursor, "next");
  assert.deepEqual(received, { limit: 20, cursor: "opaque" });
});
test("camera permission denial remains distinct from unavailable", () => {
  assert.equal(
    model.cameraFailure(new DOMException("denied", "NotAllowedError")),
    "denied",
  );
  assert.equal(
    model.cameraFailure(new DOMException("missing", "NotFoundError")),
    "unavailable",
  );
});
async function cameraFixture(run) {
  const originalNavigator = Object.getOwnPropertyDescriptor(
      globalThis,
      "navigator",
    ),
    originalWorker = globalThis.Worker;
  let stopped = 0,
    terminated = 0,
    decoded = 0;
  class Worker {
    terminate() {
      terminated++;
    }
  }
  globalThis.Worker = Worker;
  const stream = { getTracks: () => [{ stop: () => stopped++ }] };
  Object.defineProperty(globalThis, "navigator", {
    value: {
      mediaDevices: {
        getUserMedia: async (constraints) => {
          assert.equal(constraints.video.facingMode.ideal, "environment");
          return stream;
        },
      },
    },
    configurable: true,
  });
  const video = { srcObject: null, pause() {}, async play() {} };
  const decoder = {
    createQrEngine: async () => new Worker(),
    scanImage: async () => {
      decoded++;
      return { data: token };
    },
    NO_QR_CODE_FOUND: "No QR code found",
  };
  const { openCamera } = loader({ "qr-scanner": { default: decoder } })(
    "features/check-in/camera.ts",
  );
  try {
    await run({
      openCamera,
      video,
      stats: () => ({ stopped, terminated, decoded }),
      decoder,
    });
  } finally {
    if (originalNavigator)
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
    globalThis.Worker = originalWorker;
  }
}
test("camera cleanup releases tracks, preview and worker", () =>
  cameraFixture(async ({ openCamera, video, stats }) => {
    const c = new AbortController();
    await openCamera(
      video,
      c.signal,
      () => {},
      () => {},
    );
    c.abort();
    assert.equal(video.srcObject, null);
    assert.equal(stats().stopped, 1);
    assert.equal(stats().terminated, 1);
  }));
test("decoded payload is untouched and abort prevents additional frames", () =>
  cameraFixture(async ({ openCamera, video, stats }) => {
    const c = new AbortController();
    let value;
    await openCamera(
      video,
      c.signal,
      (v) => {
        value = v;
        c.abort();
      },
      () => {},
    );
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(value, token);
    assert.equal(stats().decoded, 1);
  }));
test("late camera permission resolution cannot retain a stream after unmount", () =>
  cameraFixture(async ({ openCamera, video, stats }) => {
    const c = new AbortController();
    c.abort();
    await openCamera(
      video,
      c.signal,
      () => assert.fail("decoded after abort"),
      () => {},
    );
    assert.equal(stats().stopped, 1);
    assert.equal(video.srcObject, null);
  }));
