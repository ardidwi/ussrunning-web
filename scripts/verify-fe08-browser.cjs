const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const { PNG } = require("pngjs");
const jsQR = require(
  path.join(process.env.TEMP, "uss-fe08-qr-decoder/jsQR.js"),
);
const base = process.env.FE08_URL || "http://localhost:3148";
const output = path.join(process.cwd(), "docs/fe-08-evidence");
const screenshots = path.join(
  process.env.USERPROFILE,
  ".codex/visualizations/2026/10/08/01a11a53-72aa-70c1-9a8a-993df76092eb/fe08",
);
const report = {
  cases: [],
  assertions: 0,
  decoded: 0,
  errors: [],
  hydration: [],
};
function check(v, label) {
  assert.ok(v, label);
  report.assertions++;
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) =>
      report.errors.push({
        url: page.url(),
        message: e.message,
        stack: e.stack,
      }),
    );
    page.on("console", (m) => {
      if (/hydrat|didn't match|server rendered HTML/i.test(m.text()))
        report.hydration.push(m.text());
    });
    async function open(s) {
      await page.goto(`${base}/design-system?surface=pass&scenario=${s}`, {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(
        () =>
          document.querySelector("main") &&
          Object.keys(document.querySelector("main")).some((k) =>
            k.startsWith("__reactProps"),
          ),
      );
    }
    const states = [
      "active",
      "none",
      "waitlisted",
      "cancelled",
      "revoked",
      "expired",
      "ineligible",
      "unavailable",
      "server",
      "network",
      "unauthenticated",
      "pending",
      "suspended",
      "deactivated",
      "denied",
      "loading",
      "long",
    ];
    for (const [width, height, zoom] of [
      [320, 650, 1],
      [375, 700, 1],
      [768, 800, 1],
      [1366, 768, 1],
      [320, 300, 1],
      [768, 600, 2],
    ]) {
      await page.setViewportSize({ width, height });
      for (const state of states) {
        await open(state);
        await page.evaluate(
          (z) => (document.body.style.zoom = String(z)),
          zoom,
        );
        const active = ["active", "long"].includes(state);
        if (active) await page.locator(".uss-qr-symbol").waitFor();
        check(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${state}/${width}/${zoom}: no overflow`,
        );
        check(
          (await page.locator(".uss-qr-symbol").count()) === (active ? 1 : 0),
          `${state}: only eligible pass has QR`,
        );
        check(
          !(await page.locator("main").innerText()).includes("USS-EVENT:1:"),
          "no token primary text",
        );
        if (active) {
          const q = await page.locator(".uss-branded-qr").boundingBox();
          check(q.width <= width, "QR fits viewport");
          check(q.width >= 160, "QR remains readable on narrow/zoom screens");
        }
        report.cases.push(`${state} ${width}x${height} zoom${zoom}`);
      }
    }
    // Independent decoder reads actual rendered screenshots, including the centered branding patch.
    for (const width of [320, 375, 1024]) {
      await page.setViewportSize({ width, height: 750 });
      for (const scenario of [
        "active",
        "custom",
        "plain",
        "oversized",
        "logo-error",
      ]) {
        await open(scenario);
        await page.locator(".uss-qr-symbol").waitFor();
        if (scenario !== "plain")
          await page.locator(".uss-qr-logo img").waitFor();
        await page.waitForFunction(() =>
          Array.from(document.querySelectorAll(".uss-branded-qr img")).every(
            (i) => i.complete,
          ),
        );
        // Next's development-only floating indicator overlaps element screenshots; it is absent in production.
        // Hide only that tooling portal, never product content or QR modules.
        await page.addStyleTag({
          content: "nextjs-portal { display: none !important; }",
        });
        const png = PNG.sync.read(
          await page.locator(".uss-branded-qr").screenshot(),
        );
        const decoded = jsQR(
          new Uint8ClampedArray(png.data),
          png.width,
          png.height,
        );
        check(
          decoded?.data ===
            "USS-EVENT:1:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFw",
          `exact backend fixture payload decoded ${scenario}/${width}`,
        );
        report.decoded++;
        if (scenario === "active")
          check(
            (await page.locator(".uss-qr-logo img").getAttribute("src")) ===
              "/uss-logo.png",
            "USS logo default",
          );
        if (scenario === "custom")
          check(
            (await page.locator(".uss-qr-logo img").getAttribute("src")) ===
              "/design-system/qr-fixture",
            "event override",
          );
        if (scenario === "plain")
          check(
            (await page.locator(".uss-qr-logo").count()) === 0,
            "plain fallback",
          );
        if (scenario === "logo-error")
          check(
            (await page.locator(".uss-qr-logo img").getAttribute("src")) ===
              "/uss-logo.png",
            "failed override uses USS",
          );
        if (scenario === "oversized")
          check(
            (await page.locator(".uss-qr-logo").boundingBox()).width /
              (await page.locator(".uss-branded-qr").boundingBox()).width <=
              0.12,
            "oversize clamped",
          );
        report.cases.push(`decode ${scenario} ${width}`);
        if (width === 375 && ["active", "custom", "plain"].includes(scenario))
          await page.screenshot({
            path: path.join(screenshots, scenario + ".png"),
            fullPage: true,
          });
      }
    }
    await page.setViewportSize({ width: 375, height: 600 });
    await open("none");
    await page
      .getByRole("button", { name: "Request Event Pass", exact: true })
      .dblclick();
    check(
      (await page.locator(".uss-qr-symbol").count()) === 0,
      "pending issuance hides QR",
    );
    await page.locator(".uss-qr-symbol").waitFor();
    check(
      (await page.locator("main").innerText()).includes("Requests: 1"),
      "duplicate issuance prevented",
    );
    report.cases.push("issuance duplicate prevention");
    for (const scenario of [
      "refresh-revoked",
      "refresh-denied",
      "refresh-network",
    ]) {
      await open(scenario);
      await page.locator(".uss-qr-symbol").waitFor();
      await page
        .getByRole("button", { name: "Refresh pass status", exact: true })
        .click();
      check(
        (await page.locator(".uss-qr-symbol").count()) === 0,
        "refresh removes private QR",
      );
      await page.waitForTimeout(800);
      check(
        (await page.locator(".uss-qr-symbol").count()) === 0,
        "denied/revoked/network never retains QR",
      );
      report.cases.push(scenario);
    }
    await open("expiry");
    await page.locator(".uss-qr-symbol").waitFor();
    await page
      .locator(".uss-qr-symbol")
      .waitFor({ state: "hidden", timeout: 8000 });
    await page
      .getByText("This Event Pass has expired and cannot be used at check-in.")
      .waitFor();
    check(
      (await page.locator("main").innerText()).includes("has expired"),
      "backend expiry recheck hides QR while open",
    );
    report.cases.push("expiry while open");
    check((await page.locator("main").innerText()).includes("Requests: 1"),"expiry is confirmed by a backend adapter read");
    await page.route("**/uss-logo.png", (route) => route.abort());
    await open("logo-error");
    await page.locator(".uss-qr-symbol").waitFor();
    await page.locator(".uss-qr-logo").waitFor({ state: "hidden" });
    await page.addStyleTag({
      content: "nextjs-portal { display:none !important; }",
    });
    const fallback = PNG.sync.read(
      await page.locator(".uss-branded-qr").screenshot(),
    );
    check(
      jsQR(
        new Uint8ClampedArray(fallback.data),
        fallback.width,
        fallback.height,
      )?.data === "USS-EVENT:1:abcdefghijklmnopqrstuvwxyz0123456789ABCDEFw",
      "failed event and USS logos produce decodable plain QR",
    );
    report.decoded++;
    report.cases.push("all logo images fail safely");
    await page.unroute("**/uss-logo.png");
    await open("entry");
    check(
      (await page.getByRole("link", { name: "View Event Pass" }).count()) === 0,
      "availability never invented",
    );
    await page
      .getByRole("button", { name: "Check Event Pass", exact: true })
      .dblclick();
    await page.getByRole("link", { name: "View Event Pass" }).waitFor();
    const href = await page
      .getByRole("link", { name: "View Event Pass" })
      .getAttribute("href");
    check(href.startsWith("/dashboard/registrations/"), "canonical pass entry");
    check(!href.includes("USS-EVENT"), "token never in URL");
    check(
      (await page.locator("main").innerText()).includes("Requests: 1"),
      "entry duplicate prevented",
    );
    report.cases.push("backend availability entry");
    for (const surface of ["dashboard", "history"]) {
      await open(surface);
      check(
        (await page.getByRole("link", { name: "View Event Pass" }).count()) ===
          0,
        "registration pass availability not inferred",
      );
      await page
        .getByRole("button", { name: "Check Event Pass", exact: true })
        .click();
      await page.getByRole("link", { name: "View Event Pass" }).waitFor();
      check(
        (await page
          .getByRole("link", { name: "View Event Pass" })
          .getAttribute("href")) === href,
        "dashboard/history use shared pass entry",
      );
      report.cases.push(surface + " integration");
    }
    await open("active");
    await page.locator(".uss-qr-symbol").waitFor();
    await page.keyboard.press("Tab");
    check(
      await page.evaluate(() =>
        ["A", "BUTTON"].includes(document.activeElement.tagName),
      ),
      "keyboard focus",
    );
    await page
      .getByRole("button", { name: "Refresh pass status", exact: true })
      .focus();
    check(
      await page.evaluate(() =>
        document.activeElement.matches(":focus-visible"),
      ),
      "visible keyboard focus",
    );
    await page.keyboard.press("Enter");
    await page.locator(".uss-qr-symbol").waitFor();
    check(
      (await page.locator("main").innerText()).includes("Requests: 1"),
      "keyboard refresh",
    );
    check(
      await page
        .getByRole("button", { name: "Refresh pass status", exact: true })
        .evaluate((e) => e === document.activeElement),
      "focus restored after request",
    );
    report.cases.push("keyboard");
    await page.emulateMedia({ reducedMotion: "reduce" });
    check(
      (await page
        .locator(".uss-qr-symbol")
        .evaluate((e) => getComputedStyle(e).animationName)) === "none",
      "no motion over QR",
    );
    report.cases.push("reduced motion");
    check(report.errors.length === 0, "zero runtime exceptions");
    check(report.hydration.length === 0, "zero hydration warnings");
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
    fs.writeFileSync(
      path.join(output, "browser.json"),
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
