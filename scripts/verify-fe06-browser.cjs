const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const base = process.env.FE06_URL || "http://localhost:3126";
const out = path.join(process.cwd(), "docs/fe-06-evidence");
fs.mkdirSync(out, { recursive: true });
const report = {
  base,
  assertions: 0,
  cases: [],
  errors: [],
  hydrationWarnings: [],
};
function check(value, label) {
  assert.ok(value, label);
  report.assertions++;
}
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
        report.hydrationWarnings.push({ url: page.url(), message: m.text() });
    });
    async function open(scenario = "success", role = "member") {
      await page.goto(
        `${base}/design-system?surface=dashboard&scenario=${scenario}&role=${role}`,
        { waitUntil: "networkidle" },
      );
      await page.waitForFunction(() => {
        const el = document.querySelector(".uss-member-menu");
        return el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
      });
    }
    async function layout(label) {
      check(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${label} horizontal overflow`,
      );
      check(
        (await page.locator("main").count()) === 1,
        `${label} single main landmark`,
      );
      check(
        (await page.locator("h1").count()) === 1,
        `${label} one page heading`,
      );
      report.cases.push(label);
    }
    for (const [width, height] of [
      [320, 640],
      [360, 640],
      [375, 667],
      [390, 844],
      [430, 932],
      [768, 800],
      [1024, 768],
      [1366, 768],
      [1920, 1080],
      [320, 320],
      [1366, 400],
    ]) {
      await page.setViewportSize({ width, height });
      for (const scenario of ["success", "long"]) {
        await open(scenario);
        await layout(`${scenario} ${width}x${height}`);
      }
    }
    await page.setViewportSize({ width: 375, height: 667 });
    for (const [scenario, text] of [
      ["pending", "VERIFY YOUR EMAIL"],
      ["suspended", "suspended"],
      ["deactivated", "no longer active"],
      ["unauthenticated", "SIGN IN TO CONTINUE"],
      ["denied", "ACCESS RESTRICTED"],
      ["unavailable", "temporarily unavailable"],
      ["server", "temporarily unavailable"],
      ["network", "couldn't connect"],
    ]) {
      await open(scenario);
      check(
        (await page.locator("main").innerText())
          .toLowerCase()
          .includes(text.toLowerCase()),
        scenario + " feedback",
      );
      check(
        (await page
          .getByRole("link", { name: "View Member Card \u2197", exact: true })
          .count()) === 0,
        scenario + " no protected identity action",
      );
      check(
        (await page.locator(".uss-dashboard-person").count()) === 0,
        scenario + " private content removed",
      );
      await layout(scenario);
    }
    await open("loading");
    check(
      (await page.locator(".uss-page-loading").getAttribute("aria-busy")) ===
        "true",
      "loading is announced",
    );
    check(
      (await page.locator(".uss-dashboard-person").count()) === 0,
      "loading has no private identity",
    );
    report.cases.push("loading");
    await open("complete");
    check(
      (await page.getByRole("progressbar").getAttribute("value")) === "100",
      "server completion 100",
    );
    report.cases.push("complete");
    await open("avatar-error");
    await page.getByLabel("Member initials").waitFor();
    check(
      (await page.getByLabel("Member initials").innerText()) === "PR",
      "failed avatar initials",
    );
    report.cases.push("avatar fallback");
    for (const role of ["member", "admin", "super_admin"]) {
      await open("success", role);
      await page.getByRole("button", { name: "Menu", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog.waitFor();
      if (role !== "member")
        await dialog
          .getByRole("link", { name: "USS CMS ↗", exact: true })
          .waitFor();
      check(
        (await dialog
          .getByRole("link", { name: "Overview" })
          .getAttribute("aria-current")) === "page",
        role + " active overview",
      );
      check(
        (await dialog
          .getByRole("link", { name: "USS CMS \u2197", exact: true })
          .count()) === (role === "member" ? 0 : 1),
        role + " central CMS presentation",
      );
      check(
        (await dialog.getByRole("link", { name: "Member Card" }).count()) === 1,
        role + " card navigation",
      );
      await page.keyboard.press("Escape");
      check(
        await page
          .getByRole("button", { name: "Menu", exact: true })
          .evaluate((el) => el === document.activeElement),
        role + " modal focus restored",
      );
      check(
        await page.evaluate(
          () => getComputedStyle(document.body).overflow !== "hidden",
        ),
        role + " document scroll restored",
      );
      report.cases.push(role + " mobile navigation");
    }
    await open("success");
    check(
      (await page
        .getByRole("link", { name: "View Member Card \u2197", exact: true })
        .getAttribute("href")) === "/dashboard/member-card",
      "entry reuses FE04 route",
    );
    check(
      (await page.locator(".uss-card-code-frame").count()) === 0,
      "overview does not duplicate barcode",
    );
    check(
      (await page.locator("main").innerText()).includes(
        "Registered event information is not available yet.",
      ),
      "no invented registrations",
    );
    check(
      !(await page.locator("main").innerText()).includes("0 registrations"),
      "unavailable not fabricated empty",
    );
    await page
      .getByRole("link", { name: "View Member Card \u2197", exact: true })
      .click();
    await page.waitForURL("**/dashboard/member-card");
    check(
      (await page.locator("main").count()) === 1,
      "real member card controlled route",
    );
    report.cases.push("card entry");
    for (const scenario of ["refresh-network", "refresh-suspended"]) {
      await open(scenario);
      const button = page.getByRole("button", {
        name: "Refresh dashboard",
        exact: true,
      });
      await button.evaluate((el) => {
        el.click();
        el.click();
      });
      await page
        .getByText("Loading your USS dashboard\u2026", { exact: true })
        .waitFor();
      check(
        (await page.locator(".uss-dashboard-person").count()) === 0,
        scenario + " loading removes private content",
      );
      await page.getByRole("heading", { level: 1 }).waitFor();
      check(
        (await page.getByLabel("Development request count").innerText()) ===
          "Requests: 1",
        scenario + " duplicate lock",
      );
      check(
        (await page.locator(".uss-dashboard-person").count()) === 0,
        scenario + " failed refresh removes private content",
      );
      check(
        (await page.locator("main").innerText())
          .toLowerCase()
          .includes(
            scenario === "refresh-network" ? "couldn't connect" : "suspended",
          ),
        scenario + " controlled feedback",
      );
      report.cases.push(scenario);
    }
    await page.setViewportSize({ width: 683, height: 384 });
    await open("long");
    await page.evaluate(() => (document.documentElement.style.zoom = "2"));
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "200 percent zoom overflow",
    );
    check(
      await page
        .getByRole("link", { name: "Account settings \u2197", exact: true })
        .isVisible(),
      "200 percent actions reachable",
    );
    report.cases.push("200% zoom");
    await page.evaluate(() => (document.documentElement.style.zoom = ""));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open("loading");
    check(
      await page
        .locator(".uss-skeleton")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName === "none"),
      "reduced motion skeleton",
    );
    report.cases.push("reduced motion");
    await open("success");
    await page.keyboard.press("Tab");
    check(
      await page
        .getByRole("link", { name: "Skip to content" })
        .evaluate((el) => el === document.activeElement),
      "keyboard skip first",
    );
    await page.keyboard.press("Enter");
    check(
      await page
        .locator("main")
        .evaluate((el) => el === document.activeElement),
      "skip focuses main",
    );
    report.cases.push("keyboard");
    await page.goto(base + "/dashboard", { waitUntil: "networkidle" });
    check(
      (await page.locator(".uss-dashboard-person").count()) === 0,
      "unconfigured local environment never supplies fake identity",
    );
    check(
      !(await page.locator("main").innerText()).includes("Preview Runner"),
      "no reference fixture leakage",
    );
    report.cases.push("real dashboard degraded boundary");
    check(report.errors.length === 0, "no browser exceptions");
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, "browser.json"),
      JSON.stringify(report, null, 2),
    );
  }
  console.log(
    JSON.stringify({
      cases: report.cases.length,
      assertions: report.assertions,
      errors: report.errors.length,
      hydrationWarnings: report.hydrationWarnings.length,
    }),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
