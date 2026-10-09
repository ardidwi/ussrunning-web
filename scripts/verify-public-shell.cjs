const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    path.join(
      process.env.USERPROFILE,
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  const base = process.env.FE_BASE_URL || "http://127.0.0.1:3000";
  const output = path.join(process.cwd(), "docs/fe-01-evidence");
  await fs.mkdir(output, { recursive: true });
  const report = {
    responsive: [],
    navigation: [],
    motion: [],
    zoom: [],
    errors: [],
  };
  const routes = [
    "/",
    "/about",
    "/runs",
    "/membership",
    "/stories",
    "/partners",
    "/login",
    "/join",
  ];
  try {
    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [390, 844],
      [430, 932],
      [768, 1024],
      [1024, 768],
      [1280, 800],
      [1440, 900],
      [1920, 1080],
      [1366, 600],
    ]) {
      await page.setViewportSize({ width, height });
      for (const route of routes) {
        const response = await page.goto(base + route, {
          waitUntil: "domcontentloaded",
        });
        assert.equal(response.status(), 200);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route + " horizontal overflow at " + width,
        );
        assert.equal(
          await page.locator(".scroll-distance,.scroll-distance-float").count(),
          0,
        );
        if (route !== "/") {
          const escaped = await page.locator("main").evaluate((el) =>
            Array.from(el.querySelectorAll("*"))
              .filter((node) => !node.closest("dialog"))
              .map((node) => ({
                tag: node.tagName,
                cls: node.className,
                rect: node.getBoundingClientRect(),
              }))
              .filter(
                (node) =>
                  node.rect.width > 0 && node.rect.right > innerWidth + 1,
              )
              .map((node) => node.cls),
          );
          assert.deepEqual(escaped, [], route + " hidden overflow at " + width);
        }
        if (!["/login", "/join"].includes(route)) {
          const header = page.locator(".uss-public-header");
          const headerRect = await header.boundingBox();
          assert.equal(
            headerRect.height,
            width > 1000 ? 96 : 82,
            "Shared header height",
          );
          const active = page.locator('.uss-public-nav [aria-current="page"]');
          assert.equal(await active.count(), route === "/" ? 0 : 1);
          if (route !== "/")
            assert.equal(await active.getAttribute("href"), route);
          const logo = await page.locator(".uss-public-brand").boundingBox();
          assert.equal(
            logo.width,
            width > 1180 ? 140 : width > 1000 ? 110 : 92,
          );
          assert.equal(
            await page.locator(".uss-motion-canvas").count(),
            route === "/" ? 1 : 0,
          );
          if (width < 1001) {
            await page
              .getByRole("button", { name: "MENU +", exact: true })
              .click();
            assert.ok(await page.getByRole("dialog").isVisible());
            await page.keyboard.press("Escape");
            assert.equal(await page.getByRole("dialog").isVisible(), false);
          }
        }
        report.responsive.push({
          route,
          width,
          height,
          overflow: false,
          legacyMeter: false,
        });
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(
              output,
              (route === "/" ? "home" : route.slice(1)) +
                "-shell-" +
                width +
                ".png",
            ),
            fullPage: route !== "/" && route !== "/join",
          });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + "/", { waitUntil: "domcontentloaded" });
    assert.ok((await page.locator(".uss-motion-scrubber").count()) === 1);
    await page.evaluate(() => scrollTo(0, innerHeight * 1.5));
    await page.waitForFunction(
      () => document.querySelector(".uss-motion-story").dataset.chapter !== "1",
    );
    report.motion.push({
      chapters: true,
      canvas: true,
      progress: true,
      chapter: await page
        .locator(".uss-motion-story")
        .getAttribute("data-chapter"),
    });
    await page.goto(base + "/runs/night-shift", {
      waitUntil: "domcontentloaded",
    });
    assert.equal(
      await page
        .locator('.uss-public-nav [aria-current="page"]')
        .getAttribute("href"),
      "/runs",
    );
    report.navigation.push("Nested run route uses RUNS active");
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(base + "/about", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "MENU +", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "STORIES" })
      .click();
    await page.waitForURL("**/stories");
    assert.equal(await page.getByRole("dialog").isVisible(), false);
    assert.equal(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).overflowY,
      ),
      "auto",
    );
    report.navigation.push(
      "Mobile menu route navigation closes and restores scrolling",
    );
    // CSS zoom exercises enlarged text; 720x450 in the form audit exercises equivalent browser reflow.
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ["/about", "/stories", "/login", "/join"]) {
      await page.goto(base + route, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => (document.documentElement.style.zoom = "2"));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      report.zoom.push({ route, zoom: "200% CSS zoom", overflow: false });
      await page.screenshot({
        path: path.join(output, route.slice(1) + "-zoom-200.png"),
      });
    }
  } catch (error) {
    report.errors.push(error.stack);
    process.exitCode = 1;
  } finally {
    await fs.writeFile(
      path.join(output, "public-shell-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
