const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || path.join(
    os.homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);

const base = process.env.FE_BASE_URL || "http://127.0.0.1:3000";
const viewports = [
  { width: 1280, height: 551 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

async function checkInPanel(panel, target, label, { scroll = false } = {}) {
  const targetHandle = await target.elementHandle();
  try {
    const bounds = await panel.evaluate((element, { target, scroll }) => {
      if (!element.contains(target)) throw new Error("Target is outside its scroll panel");

      const panelTop = element.getBoundingClientRect().top + element.clientTop;
      const panelBottom = panelTop + element.clientHeight;
      const before = target.getBoundingClientRect();
      if (scroll && before.bottom > panelBottom) {
        element.scrollTop += before.bottom - panelBottom + 1;
      }

      const { top, bottom, height } = target.getBoundingClientRect();
      return { top, bottom, height, panelTop, panelBottom, scrollTop: element.scrollTop };
    }, { target: targetHandle, scroll });

    if (!scroll) assert.equal(bounds.scrollTop, 0, `${label} at panel scrollTop 0`);
    assert.ok(
      bounds.height > 0 &&
        bounds.top >= Math.max(0, bounds.panelTop) - 1 &&
        bounds.bottom <= Math.min(bounds.panelBottom, panel.page().viewportSize().height) + 1,
      `${label} is clipped (${JSON.stringify(bounds)})`,
    );
  } finally {
    await targetHandle.dispose();
  }
}

async function verifyRoute(page, route) {
  const response = await page.goto(base + route, { waitUntil: "load" });
  assert.equal(response.status(), 200);
  await page.evaluate(() => document.fonts.ready);

  const isJoin = route === "/join";
  const form = page.locator(isJoin ? ".join-form-panel-v4" : ".login-panel-v3");
  const intro = page.locator(isJoin ? ".join-intro-v4" : ".login-visual-v3");
  for (const panel of [form, intro]) {
    assert.equal(await panel.evaluate((element) => {
      element.scrollTop = 0;
      return getComputedStyle(element).overflowY;
    }), "auto", "Desktop auth panel owns vertical scrolling");
  }

  await checkInPanel(form, form.locator(isJoin ? ".join-form-head-v4" : ".login-panel-head-v3"), "Form header");
  if (isJoin) await checkInPanel(form, form.getByLabel(/Full name/), "Full name");
  await checkInPanel(form, form.getByLabel(/Email address/), "Email address");

  const lastField = form.locator(isJoin ? 'input[name="consent"]' : 'input[name="password"]');
  await checkInPanel(form, lastField, "Last field", { scroll: true });
  await checkInPanel(form, form.locator('button[type="submit"]'), "Submit button", { scroll: true });

  await checkInPanel(intro, intro.getByRole("link", { name: "Back to USS Running" }), "Intro home link");
  await checkInPanel(intro, intro.getByRole("heading", { level: 1 }), "Intro heading");
  const introEnd = isJoin
    ? intro.locator(".join-intro-meta")
    : intro.locator(".login-visual-copy > p, .login-next-run > a").last();
  await checkInPanel(intro, introEnd, "Last intro content", { scroll: true });
  assert.equal(await page.evaluate(() => window.scrollY), 0, "Desktop document did not scroll");
}

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ reducedMotion: "reduce" });
  const failures = [];
  page.on("pageerror", (error) => failures.push(`${page.url()} runtime: ${error.message}`));
  page.on("console", (message) => {
    if (/hydration|hydrated|did not match/i.test(message.text())) {
      failures.push(`${page.url()} console: ${message.text()}`);
    }
  });

  try {
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const route of ["/join", "/login"]) {
        const label = `${route} ${viewport.width}x${viewport.height}`;
        try {
          await verifyRoute(page, route);
          console.log(`PASS ${label}`);
        } catch (error) {
          failures.push(`${label}: ${error.message}`);
        }
      }
    }
    assert.deepEqual(failures, []);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
