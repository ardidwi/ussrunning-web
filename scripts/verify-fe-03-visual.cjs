const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
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
  const context = await browser.newContext({
    viewport: { width: 320, height: 420 },
    reducedMotion: "reduce",
  });
  await context.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort(),
  );
  const folder = path.resolve("docs/fe-03-evidence");
  let p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(
    "http://127.0.0.1:3000/design-system?surface=member&flow=profile&scenario=active",
    { waitUntil: "networkidle" },
  );
  await p.waitForFunction(() => {
    const el = document.querySelector("input");
    return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
  });
  await p.getByLabel("City", { exact: true }).fill("Fictional city");
  await p.getByRole("button", { name: "Menu", exact: true }).click();
  await p
    .locator("dialog[open]")
    .getByRole("link", { name: /Overview/ })
    .click();
  const dialogs = p.locator("dialog[open]");
  assert.equal(await dialogs.count(), 2);
  const discard = dialogs.filter({ hasText: "Discard your changes?" });
  await discard.getByRole("button", { name: "Keep editing" }).click();
  assert.equal(await p.locator("dialog[open]").count(), 1);
  await p.keyboard.press("Escape");
  assert.equal(
    await p.getByLabel("City", { exact: true }).inputValue(),
    "Fictional city",
  );
  await p.getByRole("link", { name: "Cancel", exact: true }).click();
  const modal = p.locator("dialog[open]");
  await modal.waitFor();
  const bounds = await modal.boundingBox();
  assert.ok(
    bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= 320 &&
      bounds.y + bounds.height <= 420,
  );
  await p.screenshot({ path: path.join(folder, "discard-short-phone.png") });
  await p.keyboard.press("Escape");
  // Stress the actual shared reserved feedback region without changing business rules.
  const result = await p
    .locator(".uss-field")
    .first()
    .evaluate((field) => {
      const hint = field.querySelector(".uss-field-hint"),
        error = field.querySelector(".uss-field-error");
      hint.textContent =
        "Long helper text for wrapping and keyboard readability. ".repeat(12);
      const before = field.getBoundingClientRect().height;
      error.textContent = "Long controlled error guidance. ".repeat(25);
      return {
        before,
        after: field.getBoundingClientRect().height,
        errorHeight: error.clientHeight,
        errorScroll: error.scrollHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
  assert.equal(result.before, result.after);
  assert.ok(result.errorScroll > result.errorHeight);
  assert.equal(result.overflow, false);
  await p.close();
  for (const view of ["overview", "profile"]) {
    p = await context.newPage();
    await p.setViewportSize({ width: 1440, height: 900 });
    await p.goto(
      `http://127.0.0.1:3000/design-system?surface=member&flow=${view}&scenario=active`,
      { waitUntil: "networkidle" },
    );
    await p.waitForFunction(() => {
      const el = document.querySelector(".uss-member-menu");
      return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    });
    await p.screenshot({
      path: path.join(folder, `${view}-active-1440.png`),
      fullPage: true,
    });
    await p.close();
  }
  assert.equal(errors.length, 0);
  await browser.close();
  fs.writeFileSync(
    path.join(folder, "visual-audit.json"),
    JSON.stringify(
      {
        passed: true,
        checks: [
          "Short discard modal bounds",
          "Nested mobile navigation/discard recovery",
          "Long helper and reserved long error",
          "Reduced motion",
          "Active overview/profile screenshots",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.info("FE-03 visual/extended interaction checks passed.");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
