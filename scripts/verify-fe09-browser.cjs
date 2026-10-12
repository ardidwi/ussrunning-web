const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const base = process.env.FE09_URL || "http://localhost:3158",
  token = "USS-EVENT:1:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFw";
const out = path.join(process.cwd(), "docs/fe-09-evidence"),
  images = path.join(
    process.env.USERPROFILE,
    ".codex/visualizations/2026/10/08/01a11a53-72aa-70c1-9a8a-993df76092eb/fe09",
  );
const report = {
  cases: [],
  assertions: 0,
  errors: [],
  hydration: [],
  decoded: 0,
};
function check(v, label) {
  assert.ok(v, label);
  report.assertions++;
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(images, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    function watch(p) {
      p.on("pageerror", (e) => report.errors.push(e.message));
      p.on("console", (m) => {
        if (/hydrat|didn't match|server rendered HTML/i.test(m.text()))
          report.hydration.push(m.text());
      });
    }
    watch(page);
    async function open(s) {
      await page.goto(`${base}/design-system?surface=scanner&scenario=${s}`, {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(() =>
        Array.from(document.querySelectorAll("button")).some((e) =>
          Object.keys(e).some((k) => k.startsWith("__reactProps")),
        ),
      );
    }
    async function scan(value = token) {
      await page.getByLabel("Event Pass value", { exact: true }).fill(value);
      await page.getByRole("button", { name: "Check in", exact: true }).click();
      await page.locator(".uss-scanner-result").waitFor();
      await page.waitForFunction(() =>
        document
          .querySelector(".uss-scanner-result")
          ?.contains(document.activeElement),
      );
    }
    async function overflow() {
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "no horizontal overflow",
      );
    }
    const scenarios = [
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
      "UNAUTHENTICATED",
      "EMAIL_NOT_VERIFIED",
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_DEACTIVATED",
      "network",
      "scope",
      "long",
    ];
    for (const width of [320, 375, 768, 1366]) {
      await page.setViewportSize({ width, height: width === 1366 ? 600 : 740 });
      for (const scenario of scenarios) {
        await open(scenario);
        await overflow();
        await scan();
        await overflow();
        check(
          await page
            .locator(".uss-scanner-result")
            .evaluate((e) => e.contains(document.activeElement)),
          "result focused",
        );
        const body = await page.locator("body").innerText();
        check(
          !body.includes(token) &&
            !body.includes("attendance-private-id") &&
            !body.includes("pass-private-id") &&
            !body.includes("registration-private-id"),
          "private internals absent",
        );
        check(
          (await page.getByTestId("requests").innerText()) === "1",
          "one request",
        );
        if (
          ["CHECK_IN_SUCCESS", "ALREADY_CHECKED_IN", "long"].includes(scenario)
        )
          check(
            body.includes("Preview Runner") ||
              body.includes("Fictional runner"),
            "safe identity visible",
          );
        else
          check(!body.includes("Preview Runner"), "no participant on errors");
        report.cases.push(`${width}/${scenario}`);
      }
    }
    await page.setViewportSize({ width: 320, height: 480 });
    await open("slow");
    await page.getByLabel("Event Pass value", { exact: true }).fill(token);
    await page
      .getByRole("button", { name: "Check in", exact: true })
      .dblclick({ delay: 15 });
    check(
      await page
        .getByRole("button", { name: "Checking pass…", exact: true })
        .isDisabled(),
      "pending disabled",
    );
    await page.locator(".uss-scanner-result").waitFor();
    check(
      (await page.getByTestId("requests").innerText()) === "1",
      "double submit suppressed",
    );
    await page.getByRole("button", { name: "Scan next", exact: true }).click();
    check(
      (await page
        .getByLabel("Event Pass value", { exact: true })
        .inputValue()) === "",
      "token cleared",
    );
    check(
      await page
        .getByLabel("Event Pass value", { exact: true })
        .evaluate((e) => e === document.activeElement),
      "manual focus restored",
    );
    report.cases.push("double submit/focus");
    await open("CHECK_IN_SUCCESS");
    await scan("USS-11111111-1111-4111-8111-111111111111");
    check(
      (await page.getByTestId("requests").innerText()) === "0",
      "member barcode never submitted",
    );
    report.cases.push("member identifier rejection");
    await open("CHECK_IN_RATE_LIMITED");
    await scan();
    check(
      await page.getByRole("button", { name: "Scan next" }).isDisabled(),
      "backend cooldown respected",
    );
    await page
      .getByRole("button", { name: "Scan next" })
      .click({ timeout: 5000 });
    report.cases.push("cooldown");
    for (const code of [
      "UNAUTHENTICATED",
      "EMAIL_NOT_VERIFIED",
      "ACCOUNT_SUSPENDED",
      "ACCOUNT_DEACTIVATED",
      "INSUFFICIENT_PERMISSION",
      "EVENT_UNAVAILABLE",
    ]) {
      await open("access-" + code);
      check(
        (await page.locator("video").count()) === 0,
        "no camera for denied context",
      );
      check(
        (await page.getByLabel("Event Pass value", { exact: true }).count()) ===
          0,
        "no manual mutation for denied context",
      );
      report.cases.push("context/" + code);
    }
    await open("member");
    check(
      (await page.locator('a[href="/dashboard/check-in"]').count()) === 1,
      "only contextual change link; no staff navigation for member",
    );
    report.cases.push("member navigation");
    await page.setViewportSize({ width: 1280, height: 720 });
    await open("long");
    await page.evaluate(() => (document.documentElement.style.zoom = "200%"));
    await scan();
    await overflow();
    await page.screenshot({
      path: path.join(images, "result-zoom.png"),
      fullPage: true,
    });
    report.cases.push("200% zoom");
    await page.setViewportSize({ width: 375, height: 667 });
    await open("CHECK_IN_SUCCESS");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByLabel("Event Pass value", { exact: true }).focus();
    await page.keyboard.type(token);
    await page.keyboard.press("Enter");
    await page.locator(".uss-scanner-result").waitFor();
    await page.keyboard.press("Tab");
    check(
      await page
        .getByRole("button", { name: "Scan next" })
        .evaluate((e) => e === document.activeElement),
      "next action keyboard order",
    );
    await page.screenshot({
      path: path.join(images, "success.png"),
      fullPage: true,
    });
    report.cases.push("keyboard/reduced motion");
    for (const [error, copy] of [
      ["NotAllowedError", "Camera access was denied"],
      ["NotFoundError", "Camera is unavailable"],
    ]) {
      const c = await browser.newContext({
        viewport: { width: 320, height: 568 },
      });
      await c.addInitScript(
        ({ error }) => {
          navigator.mediaDevices.getUserMedia = async () => {
            await new Promise((r) => setTimeout(r, 500));
            throw new DOMException("test", error);
          };
        },
        { error },
      );
      const p = await c.newPage();
      watch(p);
      await p.goto(
        `${base}/design-system?surface=scanner&scenario=CHECK_IN_SUCCESS`,
        { waitUntil: "networkidle" },
      );
      await p.getByRole("button", { name: "Start camera" }).click();
      await p.getByText("Opening camera…", { exact: true }).waitFor();
      check(true, "camera loading visible");
      await p.getByText(copy, { exact: false }).waitFor();
      check(
        await p.getByLabel("Event Pass value", { exact: true }).isEnabled(),
        "manual fallback usable",
      );
      await c.close();
      report.cases.push("camera/" + error);
    }
    // Actual FE-08 rendered QR screenshots are streamed as camera frames through the real worker decoder.
    for (const scenario of ["active", "custom", "plain"]) {
      await page.goto(
        `${base}/design-system?surface=pass&scenario=${scenario}`,
        { waitUntil: "networkidle" },
      );
      await page.locator(".uss-branded-qr img").first().waitFor();
      await page.addStyleTag({
        content: "nextjs-portal{display:none!important}",
      });
      await page.waitForTimeout(300);
      const qr = page.locator(".uss-branded-qr");
      const png = await qr.screenshot();
      const c = await browser.newContext({
        viewport: { width: 375, height: 740 },
      });
      await c.addInitScript(
        ({ data }) => {
          window.cameraTracks = [];
          navigator.mediaDevices.getUserMedia = async () => {
            const img = new Image();
            img.src = data;
            await img.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 640;
            canvas.height = 640;
            const ctx = canvas.getContext("2d");
            const draw = () => {
              ctx.fillStyle = "white";
              ctx.fillRect(0, 0, 640, 640);
              ctx.drawImage(img, 80, 80, 480, 480);
            };
            draw();
            const stream = canvas.captureStream(5);
            const timer = setInterval(draw, 200);
            for (const track of stream.getTracks()) {
              window.cameraTracks.push(track);
              const stop = track.stop.bind(track);
              track.stop = () => {
                clearInterval(timer);
                stop();
              };
            }
            return stream;
          };
        },
        { data: "data:image/png;base64," + png.toString("base64") },
      );
      const p = await c.newPage();
      watch(p);
      await p.goto(`${base}/design-system?surface=scanner&scenario=slow`, {
        waitUntil: "networkidle",
      });
      await p.getByRole("button", { name: "Start camera" }).click();
      await p.locator(".uss-scanner-result").waitFor({ timeout: 30000 });
      check(
        (await p.locator(".uss-scanner-result").innerText()).includes(
          "Checked in",
        ),
        "actual branded frame decoded",
      );
      check(
        (await p.getByTestId("requests").innerText()) === "1",
        "repeated video frames suppressed",
      );
      check(
        await p.evaluate(() =>
          window.cameraTracks.every((t) => t.readyState === "ended"),
        ),
        "tracks stopped at result",
      );
      await p.waitForTimeout(800);
      check(
        (await p.getByTestId("requests").innerText()) === "1",
        "no unacknowledged retry",
      );
      await p.getByRole("button", { name: "Scan next" }).click();
      await p.waitForFunction(
        () =>
          document.querySelector("[data-testid=requests]")?.textContent === "2",
      );
      await p.locator(".uss-scanner-result").waitFor();
      check(
        (await p.getByTestId("requests").innerText()) === "2",
        "explicit acknowledgement resumes camera",
      );
      report.decoded++;
      report.cases.push("decoded/" + scenario);
      await c.close();
    }
    const blank = await browser.newContext();
    await blank.addInitScript(() => {
      window.cameraTracks = [];
      navigator.mediaDevices.getUserMedia = async () => {
        const c = document.createElement("canvas");
        c.width = 640;
        c.height = 640;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 640, 640);
        const s = c.captureStream(5);
        window.cameraTracks = s.getTracks();
        return s;
      };
    });
    const bp = await blank.newPage();
    watch(bp);
    await bp.goto(
      `${base}/design-system?surface=scanner&scenario=CHECK_IN_SUCCESS`,
      { waitUntil: "networkidle" },
    );
    await bp.getByRole("button", { name: "Start camera" }).click();
    await bp.getByRole("button", { name: "Stop camera" }).waitFor();
    check(true, "active scanning state");
    await bp.getByRole("button", { name: "Stop camera" }).click();
    check(
      await bp.evaluate(() =>
        window.cameraTracks.every((t) => t.readyState === "ended"),
      ),
      "explicit camera stop",
    );
    await blank.close();
    report.cases.push("camera active/stop");
    check(report.errors.length === 0, "zero runtime exceptions");
    check(report.hydration.length === 0, "zero hydration warnings");
    fs.writeFileSync(
      path.join(out, "browser.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify({
        cases: report.cases.length,
        assertions: report.assertions,
        decoded: report.decoded,
        runtime: report.errors.length,
        hydration: report.hydration.length,
      }),
    );
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, "browser-last.json"),
      JSON.stringify(report, null, 2),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
