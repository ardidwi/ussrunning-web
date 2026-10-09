const path = require("node:path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  try {
    await page.goto("http://127.0.0.1:3000/login", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => document.querySelector(".login-visual-image")?.naturalWidth > 0,
    );
    await page.screenshot({
      path: "docs/fe-02-evidence/login-with-media-1440.png",
    });
    await page.goto("http://127.0.0.1:3000/join", {
      waitUntil: "domcontentloaded",
    });
    await page.setViewportSize({ width: 360, height: 640 });
    await page.screenshot({
      path: "docs/fe-02-evidence/join-full-360.png",
      fullPage: true,
    });
    await page.goto(
      "http://127.0.0.1:3000/design-system?surface=auth&flow=register&scenario=code",
      { waitUntil: "domcontentloaded" },
    );
    await page.locator("input[name=fullName]").fill("Preview Runner");
    await page.locator("input[name=email]").fill("runner@example.com");
    await page.locator("input[name=password]").fill("example-password");
    await page.locator("input[name=confirmPassword]").fill("example-password");
    await page.getByRole("checkbox").check();
    await page.locator(".uss-auth-form button[type=submit]").click();
    await page.getByRole("heading", { name: "VERIFY YOUR EMAIL." }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Resend verification", exact: true })
        .count(),
      1,
    );
    await page.locator("input[name=code]").fill("123456");
    await page.locator(".uss-auth-form button[type=submit]").click();
    await page.getByRole("heading", { name: "EMAIL VERIFIED." }).waitFor();
    assert.equal(
      await page.getByRole("heading", { name: "VERIFY YOUR EMAIL." }).count(),
      0,
    );
    await page.screenshot({
      path: "docs/fe-02-evidence/verified-code-360.png",
    });
    console.log(
      "Real media screenshot, mobile registration and code registration/verification passed.",
    );
  } finally {
    await browser.close();
  }
})();
