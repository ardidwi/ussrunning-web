const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const base = process.env.FE07_URL || "http://localhost:3137";
const output = path.join(process.cwd(), "docs/fe-07-evidence");
const report = { assertions: 0, cases: [], errors: [], hydration: [] };
function check(value, label) {
  assert.ok(value, label);
  report.assertions++;
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (m) => {
      if (/hydrat|didn't match|server rendered HTML/i.test(m.text()))
        report.hydration.push(m.text());
    });
    async function open(view, scenario) {
      await page.goto(
        `${base}/design-system?surface=registration&flow=${view}&scenario=${scenario}`,
        { waitUntil: "networkidle" },
      );
      await page.waitForFunction(
        () =>
          document.querySelector("main") &&
          Object.keys(document.querySelector("main")).some((k) =>
            k.startsWith("__reactProps"),
          ),
      );
    }
    async function layout(label) {
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        label + " no overflow",
      );
      report.cases.push(label);
    }
    for (const width of [320, 375, 768, 1366]) {
      await page.setViewportSize({ width, height: width === 1366 ? 768 : 640 });
      for (const view of ["event", "history", "dashboard"])
        for (const scenario of [
          "success",
          "long",
          "empty",
          "pending",
          "suspended",
          "deactivated",
          "unauthenticated",
          "denied",
          "unavailable",
          "network",
        ]) {
          await open(view, scenario);
          await layout(`${view}/${scenario}/${width}`);
          if (
            [
              "pending",
              "suspended",
              "deactivated",
              "unauthenticated",
              "denied",
              "unavailable",
              "network",
            ].includes(scenario)
          )
            check(
              (await page.locator(".uss-registration-list").count()) === 0,
              "restricted private records absent",
            );
        }
    }
    await page.setViewportSize({ width: 320, height: 400 });
    for (const [scenario, text] of [
      ["success", "Your registration is confirmed."],
      ["waitlisted", "You are on the waitlist."],
      ["full", "This event is full"],
      ["closed", "Registration is closed"],
      ["private", "not accepting registrations"],
      ["unsupported", "Online registration is not available"],
      ["network-submit", "couldn’t confirm the result"],
    ]) {
      await open("event", scenario);
      const button = page.getByRole("button", {
        name: "Register for this run",
        exact: true,
      });
      await button.evaluate((el) => {
        el.click();
        el.click();
      });
      await page.getByText(text, { exact: false }).first().waitFor();
      check(
        (await page.locator("output").textContent()) === "1",
        "duplicate submit locked",
      );
      check(
        (await page.locator(".uss-registration-list li").count()) ===
          (["success", "waitlisted"].includes(scenario) ? 1 : 0),
        "only server-confirmed result shown",
      );
      await layout("registration action " + scenario);
    }
    await open("event", "closed-event");
    check(
      (await page
        .getByRole("button", { name: "Register for this run" })
        .count()) === 0,
      "closed lifecycle no signup action",
    );
    await open("event", "duplicate");
    check(
      (await page.locator(".uss-registration-list li").count()) === 1,
      "existing authoritative registration shown",
    );
    check(
      (await page
        .getByRole("button", { name: "Register for this run" })
        .count()) === 0,
      "duplicate CTA absent",
    );
    report.cases.push("already registered");
    await open("history", "cancelled");
    check(
      (await page
        .getByRole("button", { name: "Request cancellation", exact: true })
        .count()) === 0,
      "already cancelled has no duplicate cancellation control",
    );
    report.cases.push("already cancelled");
    for (const scenario of ["success", "stale", "noncancellable"]) {
      await open("history", scenario);
      await page
        .getByRole("button", { name: "Request cancellation", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      check(
        await page.evaluate(() =>
          document.activeElement.textContent.includes("Keep registration"),
        ),
        "safe cancellation initial focus",
      );
      await dialog
        .getByRole("button", { name: "Request cancellation", exact: true })
        .evaluate((el) => {
          el.click();
          el.click();
        });
      if (scenario === "success")
        await page
          .getByText("Registration cancelled.", { exact: true })
          .waitFor();
      else {
        await dialog.getByRole("alert").waitFor();
        check(
          (await page
            .locator(".uss-registration-list")
            .getByText("Confirmed", { exact: true })
            .count()) === 1,
          "rejected cancellation preserves record",
        );
        await dialog
          .getByRole("button", { name: "Reload registration" })
          .click();
        await page
          .getByRole("button", { name: "Request cancellation", exact: true })
          .waitFor();
      }
      check(
        (await page.locator("output").textContent()) ===
          (scenario === "success" ? "1" : "2"),
        "cancel/reload count",
      );
      await layout("cancel " + scenario);
    }
    await open("history", "pages");
    await page.getByRole("button", { name: "Next page" }).click();
    await page.getByText("Older preview run").waitFor();
    check(
      (await page.getByRole("button", { name: "Next page" }).count()) === 0,
      "bounded last page",
    );
    report.cases.push("pagination");
    await open("history", "success");
    await page
      .getByRole("button", { name: "Request cancellation", exact: true })
      .click();
    await page.keyboard.press("Escape");
    check(
      (await page.locator("dialog[open]").count()) === 0,
      "Escape closes cancellation",
    );
    check(
      await page
        .getByRole("button", { name: "Request cancellation", exact: true })
        .evaluate((el) => el === document.activeElement),
      "focus restored",
    );
    await open("event", "long");
    await page.evaluate(() => (document.documentElement.style.zoom = "2"));
    await page.setViewportSize({ width: 640, height: 800 });
    await layout("200 percent zoom");
    await page.evaluate(() => (document.documentElement.style.zoom = ""));
    for (const route of [
      "/runs",
      "/dashboard/events",
      "/dashboard",
      "/dashboard/member-card",
    ]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      await layout("real route " + route);
      check(
        !(await page.locator("body").textContent()).includes(
          "Preview community run",
        ),
        "no fixture leakage",
      );
    }
    check(report.errors.length === 0, "no page exceptions");
    check(
      report.hydration.length === 0,
      "no hydration warnings in targeted probes",
    );
    if (process.env.FE07_SCREENSHOTS) {
      fs.mkdirSync(process.env.FE07_SCREENSHOTS, { recursive: true });
      for (const view of ["event", "history"]) {
        await page.setViewportSize({ width: 320, height: 640 });
        await open(view, "long");
        await page.screenshot({
          path: path.join(process.env.FE07_SCREENSHOTS, view + "-320.png"),
          fullPage: true,
        });
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(output, "browser.json"),
      JSON.stringify(report, null, 2),
    );
  }
  console.log(
    JSON.stringify({
      cases: report.cases.length,
      assertions: report.assertions,
      errors: report.errors.length,
      hydration: report.hydration.length,
    }),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
