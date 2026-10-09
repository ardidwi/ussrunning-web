const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const base = process.env.FE03_URL || "http://127.0.0.1:3000",
  folder = path.resolve("docs/fe-03-evidence");
fs.mkdirSync(folder, { recursive: true });
const report = { cases: [], errors: [] };
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    return url.hostname === "127.0.0.1" || url.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
  async function open(
    view,
    scenario = "active",
    viewport = { width: 390, height: 844 },
  ) {
    const p = await context.newPage({ viewport });
    await p.setViewportSize(viewport);
    await p.goto(
      `${base}/design-system?surface=member&flow=${view}&scenario=${scenario}`,
      { waitUntil: "networkidle", timeout: 90000 },
    );
    await p.waitForFunction(() => {
      const el = document.querySelector(".uss-member-menu");
      return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
    });
    return p;
  }
  async function check(name, fn) {
    try {
      await fn();
      report.cases.push({ name, passed: true });
    } catch (e) {
      report.errors.push({ name, error: e.message });
    }
  }
  const mode = process.argv[2] || "all";
  if (mode !== "flows")
    for (const view of ["overview", "profile"])
      for (const [w, h] of [
        [320, 568],
        [360, 640],
        [390, 844],
        [430, 932],
        [768, 1024],
        [1366, 768],
        [1440, 900],
        [1920, 1080],
        [1366, 500],
        [390, 420],
        [720, 450],
      ])
        await check(`${view} ${w}x${h}`, async () => {
          const p = await open(view, "long", { width: w, height: h });
          assert.ok(
            await p.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            "horizontal overflow",
          );
          if (view === "profile") {
            const save = p.getByRole("button", {
              name: "Save changes",
              exact: true,
            });
            await save.scrollIntoViewIfNeeded();
            assert.ok(await save.isVisible());
            for (const input of await p.locator("input").all()) {
              const id = await input.getAttribute("id");
              assert.ok(await p.locator(`label[for="${id}"]`).count());
              const ids = (await input.getAttribute("aria-describedby")).split(
                " ",
              );
              for (const id of ids)
                assert.ok(await p.locator(`[id="${id}"]`).count());
            }
          }
          if (w < 768) {
            await p.getByRole("button", { name: "Menu", exact: true }).click();
            const dialog = p.locator("dialog[open]");
            await dialog.waitFor();
            assert.equal(await dialog.getByRole("link").count(), 6);
            assert.ok(
              await dialog.getByRole("link", { name: /Settings/ }).isVisible(),
            );
            await p.keyboard.press("Escape");
            assert.equal(await p.locator("dialog[open]").count(), 0);
            assert.equal(
              await p.evaluate(() => document.activeElement.textContent.trim()),
              "Menu",
            );
          }
          if ([320, 1440].includes(w)) {
            await p.evaluate(() => scrollTo(0, 0));
            await p.screenshot({
              path: path.join(folder, `${view}-${w}.png`),
              fullPage: true,
            });
          }
          await p.close();
        });
  if (mode !== "flows")
    for (const view of ["overview", "profile"])
      await check(`${view} 200% CSS zoom`, async () => {
        const p = await open(view, "long", { width: 1440, height: 900 });
        await p.evaluate(() => (document.documentElement.style.zoom = "2"));
        assert.ok(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await p.screenshot({
          path: path.join(folder, `${view}-zoom-200.png`),
          fullPage: true,
        });
        await p.close();
      });
  if (mode !== "layout") {
    for (const [scenario, text] of [
      ["pending", "VERIFY YOUR EMAIL."],
      ["suspended", "ACCOUNT SUSPENDED."],
      ["deactivated", "ACCOUNT DEACTIVATED."],
      ["expired", "Your session has expired."],
      ["unavailable", "Your profile is temporarily unavailable."],
      ["failure", "We couldn't load your profile."],
      ["loading", "Loading MY USS…"],
    ])
      await check(scenario, async () => {
        const p = await open("overview", scenario);
        assert.ok(
          await p.getByText(text, { exact: false }).first().isVisible(),
        );
        assert.equal(await p.locator("input").count(), 0);
        assert.equal(await p.getByText("USS-PREVIEW").count(), 0);
        if (scenario === "pending")
          assert.equal(
            await p
              .getByRole("link", { name: "Verify or resend email ↗" })
              .getAttribute("href"),
            "/login?flow=verify",
          );
        await p.close();
      });
    await check(
      "minimal validation, field focus, stable feedback and optional values",
      async () => {
        const p = await open("profile");
        await p.getByLabel("Full name", { exact: false }).fill("");
        const city = p.getByLabel("City", { exact: true }),
          before = await city.evaluate(
            (el) => el.getBoundingClientRect().y + scrollY,
          );
        await p
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        assert.equal(
          await p.locator(":focus").getAttribute("name"),
          "fullName",
        );
        assert.equal(
          await city.evaluate((el) => el.getBoundingClientRect().y + scrollY),
          before,
        );
        await p
          .getByLabel("Full name", { exact: false })
          .fill("Preview Runner");
        await p.getByLabel("Phone", { exact: true }).fill("abc");
        await p
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        assert.equal(
          await p
            .getByLabel("Phone", { exact: true })
            .getAttribute("aria-invalid"),
          "true",
        );
        await p.getByLabel("Phone", { exact: true }).fill("");
        await p
          .getByLabel("Emergency contact name", { exact: true })
          .fill("Fictional Contact");
        await p
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        assert.equal(
          await p
            .getByLabel("Emergency contact phone", { exact: true })
            .getAttribute("aria-invalid"),
          "true",
        );
        assert.equal(
          await p
            .getByRole("status")
            .filter({ hasText: "Profile updated." })
            .count(),
          0,
        );
        assert.ok(await p.getByText("Requests: 0").isVisible());
        await p.close();
      },
    );
    for (const scenario of [
      "active",
      "save-failure",
      "stale",
      "malformed",
      "server-validation",
      "save-expired",
    ])
      await check(`save ${scenario}`, async () => {
        const p = await open("profile", scenario);
        await p.getByLabel("City", { exact: true }).fill("Fictional City");
        const button = p.getByRole("button", {
          name: "Save changes",
          exact: true,
        });
        await button.scrollIntoViewIfNeeded();
        const box = await button.boundingBox();
        const loading = await button.evaluate(async (el) => {
          el.click();
          el.click();
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            busy: el.getAttribute("aria-busy"),
            width: el.getBoundingClientRect().width,
          };
        });
        assert.equal(loading.busy, "true");
        assert.equal(loading.width, box.width);
        await p.waitForTimeout(1100);
        assert.ok(await p.getByText("Requests: 1").isVisible());
        if (scenario === "active") {
          assert.ok(await p.getByText("70%", { exact: true }).isVisible());
          assert.ok(
            await p
              .getByText("Profile updated.", { exact: true })
              .first()
              .isVisible(),
          );
          assert.equal(await button.isDisabled(), true);
          await p.getByRole("button", { name: "Dismiss notification" }).click();
        } else if (scenario === "save-expired") {
          assert.ok(
            await p.getByRole("link", { name: "Sign in again ↗" }).isVisible(),
          );
          assert.equal(await p.locator("input").count(), 0);
        } else {
          assert.equal(
            await p.getByLabel("City", { exact: true }).inputValue(),
            "Fictional City",
          );
          assert.equal(await button.isDisabled(), false);
          if (scenario === "server-validation") {
            assert.ok(
              await p.getByText("Please check city and try again.").isVisible(),
            );
            assert.equal(
              await p.getByText("Raw server message must not appear").count(),
              0,
            );
          }
        }
        await p.close();
      });
    await check(
      "unsaved navigation dialog keyboard, keep and discard",
      async () => {
        const p = await open("profile", "complete");
        await p.getByLabel("City", { exact: true }).fill("Edited City");
        await p.getByRole("link", { name: "Cancel", exact: true }).click();
        const dialog = p.locator("dialog[open]");
        await dialog.waitFor();
        assert.equal(
          await p.evaluate(() => document.activeElement.textContent.trim()),
          "Keep editing",
        );
        await p.keyboard.press("Shift+Tab");
        assert.equal(
          await p.evaluate(() => document.activeElement.textContent.trim()),
          "Discard changes",
        );
        await p.keyboard.press("Escape");
        assert.equal(
          await p.getByLabel("City", { exact: true }).inputValue(),
          "Edited City",
        );
        await p.getByRole("link", { name: "Cancel", exact: true }).click();
        await p
          .locator("dialog[open]")
          .getByRole("button", { name: "Discard changes" })
          .click();
        await p.waitForURL("**/dashboard");
        // FE-06 now consumes the canonical BE-04 read: missing auth configuration
        // is unavailable, while a configured anonymous session is unauthenticated.
        assert.equal(await p.locator(".uss-dashboard-person").count(), 0);
        assert.ok(
          await p
            .getByRole("heading", {
              level: 1,
              name: /SIGN IN TO CONTINUE\.|PLEASE TRY AGAIN\./,
            })
            .isVisible(),
        );
        await p.close();
      },
    );
    await check(
      "actual route fails closed with session or service feedback",
      async () => {
        const p = await context.newPage();
        await p.goto(base + "/dashboard/profile", { waitUntil: "networkidle" });
        const signIn = p.getByRole("link", { name: "Sign in again ↗" });
        if (await signIn.count()) {
          assert.equal(
            await signIn.getAttribute("href"),
            "/login?reason=session-expired&returnTo=%2Fdashboard%2Fprofile",
          );
        } else {
          // AUTH-CUTOVER correctly distinguishes missing service configuration
          // from an expired session. Both must remove protected profile fields.
          assert.ok(
            await p
              .getByRole("alert")
              .filter({
                hasText:
                  /We couldn't load your profile\.|Your profile is temporarily unavailable\./,
              })
              .isVisible(),
          );
          assert.ok(
            await p
              .getByRole("button", { name: "Try again", exact: true })
              .isVisible(),
          );
        }
        assert.equal(await p.locator("input").count(), 0);
        await p.close();
      },
    );
    await check("public and auth regression", async () => {
      for (const route of [
        "/",
        "/about",
        "/runs",
        "/membership",
        "/stories",
        "/partners",
        "/login",
        "/join",
      ]) {
        const p = await context.newPage();
        const response = await p.goto(base + route, {
          waitUntil: "domcontentloaded",
          timeout: 90000,
        });
        assert.equal(response.status(), 200);
        if (route === "/") assert.ok(await p.locator("canvas").count());
        else if (!["/login", "/join"].includes(route))
          assert.ok(await p.locator("header").count());
        await p.close();
      }
    });
  }
  await browser.close();
  fs.writeFileSync(
    path.join(folder, `${mode}-audit.json`),
    JSON.stringify(report, null, 2),
  );
  console.info(
    JSON.stringify(
      { cases: report.cases.length, errors: report.errors },
      null,
      2,
    ),
  );
  if (report.errors.length) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
