/* Uses the desktop bundled Playwright, or PLAYWRIGHT_MODULE for other environments.
   Start npm run dev before running. No server mutations or real authentication. */
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
const modulePath =
  process.env.PLAYWRIGHT_MODULE ||
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  );
const { chromium } = require(modulePath);
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  const base = process.env.FE_BASE_URL || "http://127.0.0.1:3000";
  const report = {
    responsive: [],
    interactions: [],
    regressions: [],
    errors: [],
  };
  const output = path.join(process.cwd(), "docs/fe-01-evidence");
  await fs.mkdir(output, { recursive: true });
  try {
    for (const [width, height] of [
      [320, 568],
      [360, 640],
      [390, 844],
      [430, 932],
      [768, 1024],
      [1440, 900],
      [1366, 600],
      [390, 420],
      [720, 450],
    ]) {
      await page.setViewportSize({ width, height });
      for (const route of ["/design-system", "/join", "/login"]) {
        const response = await page.goto(base + route);
        await page.locator("main").waitFor();
        assert.equal(response.status(), 200, route);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        );
        assert.equal(
          overflow,
          false,
          route + " horizontal overflow at " + width,
        );
        const controls = await page
          .locator(".uss-control")
          .evaluateAll((elements) =>
            elements.every((el) => {
              const rect = el.getBoundingClientRect();
              return (
                rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth
              );
            }),
          );
        assert.ok(controls, route + " controls fit " + width);
        report.responsive.push({
          route,
          width,
          height,
          horizontalOverflow: false,
          controlsFit: true,
        });
        if ([320, 1440, 1366].includes(width))
          await page.screenshot({
            path: path.join(output, route.slice(1) + "-" + width + ".png"),
            fullPage: route !== "/design-system",
          });
      }
    }
    await page.setViewportSize({ width: 390, height: 420 });
    await page.goto(base + "/design-system");
    const before = await page
      .getByRole("button", { name: "Save changes", exact: true })
      .boundingBox();
    await page.getByRole("button", { name: "Toggle validation" }).click();
    const after = await page
      .getByRole("button", { name: "Save changes", exact: true })
      .boundingBox();
    assert.equal(
      before.y,
      after.y,
      "Error presentation preserves downstream field position",
    );
    assert.ok((await page.locator('[aria-invalid="true"]').count()) > 0);
    const describedBy = await page
      .locator(".uss-control")
      .first()
      .getAttribute("aria-describedby");
    for (const id of describedBy.split(" "))
      assert.equal(await page.locator('[id="' + id + '"]').count(), 1);
    const longError = page
      .locator(".uss-field-error")
      .filter({ hasText: "This intentionally long" });
    assert.ok(
      await longError.evaluate((el) => el.scrollHeight > el.clientHeight),
    );
    await page.getByRole("button", { name: "Show password" }).click();
    assert.equal(
      await page.locator('input[name="password"]').getAttribute("type"),
      "text",
    );
    await page.getByRole("button", { name: "Hide password" }).click();
    assert.equal(
      await page.locator('input[name="password"]').getAttribute("type"),
      "password",
    );
    report.interactions.push(
      "Stable long errors and describedBy; password show/hide",
    );
    const save = page.getByRole("button", {
      name: "Save changes",
      exact: true,
    });
    const idle = await save.boundingBox();
    await page.getByRole("button", { name: "Toggle loading" }).click();
    const busy = page.locator('button[aria-busy="true"]');
    assert.equal(await busy.isDisabled(), true);
    const busyRect = await busy.boundingBox();
    assert.equal(idle.width, busyRect.width);
    assert.equal(idle.height, busyRect.height);
    report.interactions.push(
      "Loading disables submit and preserves dimensions",
    );
    const trigger = page.getByRole("button", { name: "Archive Story dialog" });
    await trigger.click();
    const dialog = page.getByRole("dialog");
    assert.ok(await dialog.isVisible());
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent.trim()),
      "Cancel",
    );
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      assert.ok(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
      );
    }
    await dialog
      .getByRole("button", { name: "Archive Story", exact: true })
      .scrollIntoViewIfNeeded();
    assert.ok(
      await dialog
        .getByRole("button", { name: "Archive Story", exact: true })
        .isVisible(),
    );
    await page.screenshot({ path: path.join(output, "modal-short-phone.png") });
    await page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), false);
    assert.ok(await trigger.evaluate((el) => el === document.activeElement));
    report.interactions.push(
      "Short-screen modal, Cancel focus, Tab trap, Escape and focus restoration",
    );
    await page
      .getByRole("button", { name: "error toast", exact: true })
      .click();
    assert.ok(await page.locator(".uss-toast[role=alert]").isVisible());
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    assert.equal(await page.locator(".uss-toast[role=alert]").count(), 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".uss-skeleton")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    report.interactions.push("Toast dismissal and reduced motion");
    await page.goto(base + "/join");
    const first = page.getByLabel("Full name", { exact: false });
    await first.fill("Very long community member name");
    await page.locator('input[name="password"]').fill("PasswordPreview123");
    await page
      .locator('input[name="confirmPassword"]')
      .fill("MismatchPreview123");
    await page.getByRole("button", { name: "Create account ↗" }).click();
    assert.ok(
      await page.getByText("Passwords do not match.").isVisible(),
    );
    assert.equal(await first.inputValue(), "Very long community member name");
    report.interactions.push(
      "Signup empty submission, mismatch and retained input; no backend call",
    );
    for (const route of [
      "/",
      "/about",
      "/stories",
      "/partners",
      "/membership",
      "/dashboard",
      "/admin",
    ]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      const response = await page.goto(base + route);
      report.regressions.push({
        route,
        status: response.status(),
        destination: new URL(page.url()).pathname,
        documentScroll: await page.evaluate(
          () => getComputedStyle(document.documentElement).overflowY,
        ),
      });
    }
  } catch (error) {
    report.errors.push(error.stack);
    process.exitCode = 1;
  } finally {
    await fs.writeFile(
      path.join(output, "browser-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
