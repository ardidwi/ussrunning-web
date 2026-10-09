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
  let page = await browser.newPage();
  await page.route("https://**/*", (route) =>
    route.request().resourceType() === "image"
      ? route.abort()
      : route.continue(),
  );
  const dir = path.join(process.cwd(), "docs/fe-02-evidence");
  await fs.mkdir(dir, { recursive: true });
  const report = {
    responsive: [],
    flows: [],
    accessibility: [],
    regression: [],
    errors: [],
  };
  const base = "http://127.0.0.1:3000";
  const go = async (flow, scenario = "success") => {
    await page.close();
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route("https://**/*", (route) =>
      route.request().resourceType() === "image"
        ? route.abort()
        : route.continue(),
    );
    await page.goto(
      base +
        "/design-system?surface=auth&flow=" +
        flow +
        "&scenario=" +
        scenario,
      { waitUntil: "domcontentloaded" },
    );
    await page.locator(".uss-auth-flow").waitFor();
    await page.waitForFunction(() => {
      const el = document.querySelector(".uss-auth-flow input");
      return (
        el && Object.keys(el).some((key) => key.startsWith("__reactProps"))
      );
    });
  };
  async function fill(flow) {
    if (["login", "register", "forgot"].includes(flow))
      await page
        .getByRole("textbox", { name: "Email address", exact: true })
        .fill("runner@example.com");
    if (flow === "register") {
      await page
        .getByRole("textbox", { name: "Full name", exact: true })
        .fill("Preview Runner");
      await page.getByRole("checkbox").check();
    }
    if (["login", "register", "reset"].includes(flow)) {
      await page.locator("input[name=password]").fill("example-password");
      if (flow !== "login")
        await page
          .locator("input[name=confirmPassword]")
          .fill("example-password");
    }
  }
  const submit = (flow) =>
    page.locator(".uss-auth-form button[type=submit]").click();
  try {
    if (process.env.FE02_ONLY !== "flows") {
      for (const [width, height] of [
        [320, 568],
        [360, 640],
        [390, 844],
        [430, 932],
        [768, 1024],
        [1440, 900],
        [1366, 768],
        [1366, 500],
        [390, 420],
        [720, 450],
      ]) {
        await page.setViewportSize({ width, height });
        for (const route of [
          "/login",
          "/join",
          "/login?flow=forgot",
          "/login?flow=reset&token=development-reference-only",
          "/login?flow=verify",
        ]) {
          await page.goto(base + route, { waitUntil: "domcontentloaded" });
          await page.locator(".uss-auth-flow").waitFor();
          await page.waitForFunction(() => {
            const el = document.querySelector(".uss-auth-flow input");
            return (
              el &&
              Object.keys(el).some((key) => key.startsWith("__reactProps"))
            );
          });
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          assert.ok(
            await page.locator(".uss-control").evaluateAll((es) =>
              es.every((e) => {
                const r = e.getBoundingClientRect();
                return r.left >= 0 && r.right <= innerWidth + 1;
              }),
            ),
          );
          const button = page
            .locator(".uss-auth-flow button[type=submit]")
            .last();
          await button.scrollIntoViewIfNeeded();
          assert.ok(await button.isVisible());
          assert.ok(
            await button.evaluate((el) => {
              const r = el.getBoundingClientRect();
              return r.bottom <= innerHeight + 1 && r.top >= 0;
            }),
          );
          assert.ok(
            await page
              .locator(".uss-auth-flow input")
              .evaluateAll((es) =>
                es.every(
                  (e) =>
                    e.labels?.length &&
                    e.id &&
                    e.getAttribute("aria-describedby"),
                ),
              ),
          );
          if (width === 320 || width === 1440)
            await page.screenshot({
              path: path.join(
                dir,
                (route.includes("flow=")
                  ? route.split("flow=")[1].split("&")[0]
                  : route.slice(1)) +
                  "-" +
                  width +
                  ".png",
              ),
            });
          report.responsive.push({
            route,
            width,
            height,
            overflow: false,
            submitReachable: true,
          });
        }
      }
    }
    if (process.env.FE02_ONLY !== "responsive") {
      await page.setViewportSize({ width: 390, height: 844 });
      await go("login");
      await submit("login");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      assert.equal(
        await page.locator("input[name=email]").getAttribute("aria-invalid"),
        "true",
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.name),
        "email",
      );
      await page.locator("input[name=email]").fill("invalid-email");
      await page.locator("input[name=password]").fill("example-password");
      await submit("login");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      report.flows.push(
        "Login empty and invalid email: first error focused, no request",
      );
      for (const scenario of [
        "INVALID_CREDENTIALS",
        "EMAIL_NOT_VERIFIED",
        "ACCOUNT_SUSPENDED",
        "ACCOUNT_DEACTIVATED",
        "ACCOUNT_NOT_PROVISIONED",
        "network",
        "UNKNOWN_ERROR",
        "malformed",
        "UNAUTHENTICATED",
      ]) {
        await go("login", scenario);
        await fill("login");
        await submit("login");
        await page.waitForTimeout(650);
        assert.ok(await page.locator(".uss-auth-flow").textContent());
        if (scenario === "EMAIL_NOT_VERIFIED")
          await page
            .getByRole("heading", { name: "VERIFY YOUR EMAIL." })
            .waitFor();
        else {
          assert.ok(await page.locator(".uss-auth-flow [role=alert]").count());
          assert.equal(
            await page.locator("input[name=password]").inputValue(),
            "example-password",
          );
        }
        report.flows.push("Login " + scenario);
      }
      await go("login");
      await fill("login");
      const before = await page
        .locator(".uss-auth-form button[type=submit]")
        .boundingBox();
      await page
        .getByRole("button", { name: "Show password", exact: true })
        .click();
      assert.equal(
        await page.locator("input[name=password]").getAttribute("type"),
        "text",
      );
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      await page
        .getByRole("button", { name: "Hide password", exact: true })
        .click();
      await submit("login");
      assert.ok(
        await page.locator(".uss-auth-form button[type=submit]").isDisabled(),
      );
      await page.locator(".uss-auth-form").evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      const during = await page
        .locator(".uss-auth-form button[type=submit]")
        .boundingBox();
      assert.equal(before.width, during.width);
      assert.equal(before.height, during.height);
      await page.waitForTimeout(650);
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 1",
      );
      assert.equal(
        await page.locator("[data-testid=auth-destination]").textContent(),
        "Sign-in destination: /dashboard",
      );
      report.flows.push(
        "Login success, password visibility and duplicate submit prevention",
      );
      await go("register");
      await submit("register");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      await fill("register");
      await page
        .locator("input[name=confirmPassword]")
        .fill("different-password");
      await submit("register");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      await page
        .locator("input[name=confirmPassword]")
        .fill("example-password");
      await page.getByRole("checkbox").uncheck();
      await submit("register");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      await page.getByRole("checkbox").check();
      await submit("register");
      await page.getByRole("heading", { name: "VERIFY YOUR EMAIL." }).waitFor();
      assert.ok(
        (await page.locator(".uss-auth-flow").textContent()).includes(
          "r•••@example.com",
        ),
      );
      report.flows.push(
        "Register empty/mismatch/consent and verification-required success",
      );
      await go("register", "ACCOUNT_CONFLICT");
      await fill("register");
      await submit("register");
      await page
        .getByText("This email is already registered.", { exact: false })
        .waitFor();
      assert.equal(
        await page.locator("input[name=email]").inputValue(),
        "runner@example.com",
      );
      report.flows.push("Register duplicate email preserved");
      await go("register");
      await page.locator("input[name=fullName]").fill("Name ".repeat(40));
      await page
        .locator("input[name=email]")
        .fill("x".repeat(260) + "@example.com");
      await submit("register");
      assert.equal(
        await page.locator("[data-testid=auth-calls]").textContent(),
        "Requests: 0",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      report.flows.push("Long name/email validation and layout");
      for (const scenario of [
        "success",
        "VERIFICATION_EXPIRED",
        "VERIFICATION_INVALID",
        "already",
        "UNKNOWN_ERROR",
        "network",
      ]) {
        await go("verify", scenario);
        await submit("verify");
        await page.waitForTimeout(650);
        assert.ok(
          await page
            .locator(".uss-auth-flow [role=status],.uss-auth-flow [role=alert]")
            .count(),
        );
        report.flows.push("Verification " + scenario);
      }
      await go("verify", "code");
      await page.locator("input[name=email]").fill("runner@example.com");
      await page.locator("input[name=code]").fill("123456");
      await submit("verify");
      await page.getByRole("heading", { name: "EMAIL VERIFIED." }).waitFor();
      report.flows.push("Code verification uses same flow");
      for (const scenario of ["success", "cooldown", "rate", "UNKNOWN_ERROR"]) {
        await go("verify", scenario);
        await page
          .locator("input[name=resendEmail]")
          .fill("runner@example.com");
        await page
          .getByRole("button", { name: "Resend verification", exact: true })
          .click();
        await page.waitForTimeout(650);
        if (scenario !== "UNKNOWN_ERROR") {
          assert.ok(
            await page
              .getByRole("button", { name: "Resend verification", exact: true })
              .isDisabled(),
          );
          await page.waitForTimeout(3200);
          assert.ok(
            await page
              .getByRole("button", { name: "Resend verification", exact: true })
              .isEnabled(),
          );
        }
        if (scenario === "success") {
          await page
            .getByRole("button", { name: "Dismiss notification" })
            .click();
        }
        report.flows.push("Resend " + scenario);
      }
      for (const scenario of ["success", "network"]) {
        await go("forgot", scenario);
        await submit("forgot");
        assert.equal(
          await page.locator("[data-testid=auth-calls]").textContent(),
          "Requests: 0",
        );
        await page.locator("input[name=email]").fill("not-an-email");
        await submit("forgot");
        assert.equal(
          await page.locator("[data-testid=auth-calls]").textContent(),
          "Requests: 0",
        );
        await fill("forgot");
        await submit("forgot");
        await page.waitForTimeout(650);
        if (scenario === "success")
          await page
            .getByText(
              "If an account exists for this email, password reset instructions have been sent.",
              { exact: true },
            )
            .waitFor();
        report.flows.push("Forgot " + scenario);
      }
      for (const scenario of [
        "success",
        "RESET_INVALID",
        "RESET_EXPIRED",
        "UNKNOWN_ERROR",
      ]) {
        await go("reset", scenario);
        await fill("reset");
        await page
          .locator("input[name=confirmPassword]")
          .fill("mismatch-password");
        await submit("reset");
        assert.equal(
          await page.locator("[data-testid=auth-calls]").textContent(),
          "Requests: 0",
        );
        await page
          .locator("input[name=confirmPassword]")
          .fill("example-password");
        await submit("reset");
        await page.waitForTimeout(650);
        if (scenario === "success")
          await page
            .getByRole("heading", { name: "PASSWORD UPDATED." })
            .waitFor();
        else
          assert.ok(await page.locator(".uss-auth-flow [role=alert]").count());
        report.flows.push("Reset " + scenario);
      }
      await page.goto(base + "/login?flow=reset", {
        waitUntil: "domcontentloaded",
      });
      await page
        .getByText(
          "This password reset link isn't valid. Request a new link.",
          {
            exact: true,
          },
        )
        .waitFor();
      report.flows.push("Reset missing token");
      await page.goto(
        base + "/login?reason=session-expired&returnTo=https://example.com",
        { waitUntil: "domcontentloaded" },
      );
      await page
        .getByText("Your session has expired.", { exact: true })
        .waitFor();
      assert.ok(
        (
          await page
            .getByRole("link", { name: "Forgot your password? ↗" })
            .getAttribute("href")
        ).includes("%2Fdashboard"),
      );
      report.flows.push("Session expired and unsafe return fallback");
      await go("login");
      await page.locator("input[name=email]").focus();
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.name),
        "password",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "Show password",
      );
      await page.keyboard.press("Enter");
      assert.equal(
        await page.locator("input[name=password]").getAttribute("type"),
        "text",
      );
      report.accessibility.push(
        "Labels/descriptions/autocomplete, first-error focus, keyboard password toggle and live feedback",
      );
      for (const route of ["/join", "/login?flow=forgot"]) {
        await page.close();
        page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.route("https://**/*", (route) =>
          route.request().resourceType() === "image"
            ? route.abort()
            : route.continue(),
        );
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => {
          const el = document.querySelector(".uss-auth-flow input");
          return (
            el && Object.keys(el).some((key) => key.startsWith("__reactProps"))
          );
        });
        if (route === "/join") {
          await page.locator("input[name=fullName]").fill("Preview Runner");
          await page.locator("input[name=email]").fill("runner@example.com");
          await page.locator("input[name=password]").fill("example-password");
          await page
            .locator("input[name=confirmPassword]")
            .fill("example-password");
          await page.getByRole("checkbox").check();
        } else
          await page.locator("input[name=email]").fill("runner@example.com");
        await page.locator(".uss-auth-form button[type=submit]").click();
        await page
          .getByText("This account service is temporarily unavailable.", {
            exact: false,
          })
          .waitFor();
        report.flows.push("Production adapter unavailable: " + route);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      for (const route of ["/login", "/join", "/login?flow=forgot"]) {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        await page.evaluate(
          () => (document.documentElement.style.zoom = "200%"),
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        report.responsive.push({
          route,
          zoom: "200% CSS zoom",
          overflow: false,
        });
      }
      for (const route of [
        "/",
        "/about",
        "/runs",
        "/membership",
        "/stories",
        "/partners",
      ]) {
        await page.goto(base + route, { waitUntil: "domcontentloaded" });
        assert.ok(await page.locator(".uss-public-header").count());
        if (route === "/") assert.ok(await page.locator("canvas").count());
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        report.regression.push(route);
      }
    }
  } catch (error) {
    report.errors.push(error.stack);
    report.failureView = await page
      .locator(".uss-auth-flow")
      .innerText()
      .catch(() => "Unavailable");
    process.exitCode = 1;
  } finally {
    await fs.writeFile(
      path.join(dir, (process.env.FE02_ONLY ?? "browser") + "-audit.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          responsive: report.responsive.length,
          flows: report.flows,
          accessibility: report.accessibility,
          regression: report.regression,
          errors: report.errors,
        },
        null,
        2,
      ),
    );
    await browser.close();
  }
})();
