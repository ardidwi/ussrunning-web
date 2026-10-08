const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  const report = { surfaces: [], errors: [] };
  const output = path.join(process.cwd(), "docs/fe-01-evidence");
  try {
    for (const [width, height] of [
      [320, 568],
      [390, 420],
      [768, 1024],
      [1440, 900],
      [1366, 600],
    ]) {
      await page.setViewportSize({ width, height });
      for (const surface of ["admin", "member"]) {
        await page.goto(
          "http://127.0.0.1:3000/design-system?surface=" + surface,
          { waitUntil: "domcontentloaded" },
        );
        if (surface === "admin")
          await page.getByRole("button", { name: "02 Website" }).click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        assert.ok(
          await page.locator(".uss-control").evaluateAll((els) =>
            els.every((el) => {
              const r = el.getBoundingClientRect();
              return r.right <= innerWidth && r.left >= 0;
            }),
          ),
        );
        const save = page.getByRole("button", {
          name: surface === "member" ? "SAVE PROFILE" : "PUBLISH HOME HERO",
          exact: false,
        });
        await save.first().scrollIntoViewIfNeeded();
        assert.ok(await save.first().isVisible());
        await page.screenshot({
          path: path.join(output, surface + "-" + width + ".png"),
          fullPage: false,
        });
        if (surface === "admin") {
          await page.getByRole("button", { name: "03 Runs" }).click();
          assert.ok(await page.getByLabel("CAPACITY").isVisible());
          assert.ok(
            await page
              .locator(".uss-control")
              .evaluateAll((els) =>
                els.every(
                  (el) => el.getBoundingClientRect().right <= innerWidth,
                ),
              ),
          );
        }
        report.surfaces.push({
          surface,
          width,
          height,
          controlsFit: true,
          submitReachable: true,
        });
      }
    }
  } catch (error) {
    report.errors.push(error.stack);
    process.exitCode = 1;
  } finally {
    await fs.writeFile(
      path.join(output, "workspace-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
    await browser.close();
  }
})();
