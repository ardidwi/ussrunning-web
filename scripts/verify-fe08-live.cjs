const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const base = process.env.FE08_URL || "http://localhost:3148";
const report = { base, cases: [], errors: [], hydration: [] };
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) =>
      report.errors.push({ url: page.url(), message: e.message }),
    );
    page.on("console", (m) => {
      if (/hydrat|didn't match|server rendered HTML/i.test(m.text()))
        report.hydration.push({ url: page.url(), message: m.text() });
    });
    const pass =
      "/dashboard/registrations/22222222-2222-4222-8222-222222222222?eventId=11111111-1111-4111-8111-111111111111";
    for (const [width, height, zoom] of [
      [320, 650, 1],
      [375, 700, 1],
      [768, 800, 1],
      [1366, 768, 1],
      [768, 600, 2],
    ]) {
      await page.setViewportSize({ width, height });
      for (const route of [
        "/",
        "/about",
        "/runs",
        "/membership",
        "/stories",
        "/partners",
        "/login",
        "/join",
        "/dashboard",
        "/dashboard/events",
        "/dashboard/member-card",
        pass,
      ]) {
        const response = await page.goto(base + route, {
          waitUntil: "networkidle",
        });
        assert.equal(response.status(), 200);
        await page.evaluate(
          (z) => (document.body.style.zoom = String(z)),
          zoom,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        assert.ok(
          !(await page.locator("body").innerText()).includes(
            "Preview Community Run",
          ),
        );
        if (route === pass) {
          assert.equal(await page.locator(".uss-qr-symbol").count(), 0);
          assert.ok(
            !(await page.locator("body").innerText()).includes("USS-EVENT:1:"),
          );
          if (width >= 768 && zoom === 1)
            assert.equal(
              await page
                .getByRole("navigation", {
                  name: "Member navigation",
                  exact: true,
                })
                .getByRole("link", { name: "Events" })
                .getAttribute("aria-current"),
              "page",
            );
          if (width === 320) {
            await page
              .getByRole("button", { name: "Menu", exact: true })
              .click();
            await page.getByRole("dialog").waitFor();
            assert.equal(
              await page
                .getByRole("navigation", { name: "Mobile member navigation" })
                .getByRole("link", { name: "Events" })
                .getAttribute("aria-current"),
              "page",
            );
            await page.keyboard.press("Escape");
          }
        }
        report.cases.push({
          route,
          width,
          height,
          zoom,
          status: response.status(),
          overflow: false,
        });
      }
    }
    if (process.env.FE08_PRODUCTION === "1")
      for (const route of [
        "/design-system?surface=pass",
        "/design-system/qr-fixture",
      ]) {
        const r = route.includes("qr-fixture")
          ? await page.request.get(base + route)
          : await page.goto(base + route, { waitUntil: "networkidle" });
        assert.equal(r.status(), 404);
        report.cases.push({ route, status: 404 });
      }
    assert.equal(report.errors.length, 0);
    assert.equal(report.hydration.length, 0);
    console.log(
      JSON.stringify({
        cases: report.cases.length,
        runtime: report.errors.length,
        hydration: report.hydration.length,
      }),
    );
  } finally {
    const output =
      process.env.FE08_LIVE_REPORT || "docs/fe-08-evidence/live-local.json";
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
