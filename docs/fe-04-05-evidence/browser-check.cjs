const fs = require("fs"),
  path = require("path");
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
  const results = [];
  const check = (name, ok) => {
    results.push({ name, passed: !!ok });
    if (!ok) throw Error(name);
  };
  for (const width of [320, 375, 768, 1024, 1366]) {
    for (const surface of ["card", "cms"]) {
      const p = await browser.newPage({
        viewport: { width, height: width === 1366 ? 768 : 600 },
      });
      await p.goto(
        "http://localhost:3000/design-system?surface=" +
          surface +
          (surface === "card"
            ? "&scenario=long"
            : "&role=super_admin&module=revisions"),
        { waitUntil: "networkidle" },
      );
      check(
        surface + " overflow " + width,
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (surface === "card") {
        await p.getByRole("button", { name: "Download barcode SVG" }).waitFor();
        check(
          "barcode fits " + width,
          await p
            .locator('img[alt^="Permanent USS"]')
            .evaluate((el) => el.getBoundingClientRect().right <= innerWidth),
        );
      }
      if (width === 320)
        await p.screenshot({
          path: "docs/fe-04-05-evidence/" + surface + "-320.png",
          fullPage: true,
        });
      await p.close();
    }
  }
  for (const role of ["member", "admin", "super_admin"]) {
    const p = await browser.newPage();
    await p.goto(
      "http://localhost:3000/design-system?surface=cms&role=" + role,
      { waitUntil: "networkidle" },
    );
    const links = await p
      .locator('nav[aria-label="CMS navigation"] a')
      .allTextContents();
    check(
      "permission navigation " + role,
      role === "member"
        ? links.length === 0
        : role === "admin"
          ? links.some((x) => x.includes("Stories")) &&
            !links.some((x) => x.includes("Settings"))
          : links.some((x) => x.includes("Settings")),
    );
    await p.close();
  }
  for (const scenario of [
    "anonymous",
    "pending",
    "suspended",
    "deactivated",
    "server",
    "empty",
    "invalid",
    "forbidden",
  ]) {
    const p = await browser.newPage({ viewport: { width: 320, height: 480 } });
    await p.goto(
      "http://localhost:3000/design-system?surface=card&scenario=" + scenario,
      { waitUntil: "networkidle" },
    );
    check(
      "controlled card " + scenario,
      (await p
        .locator("main")
        .innerText()
        .then((t) => t.length > 50)) &&
        (await p.locator('img[alt^="Permanent USS"]').count()) === 0,
    );
    await p.close();
  }
  const p = await browser.newPage({ viewport: { width: 375, height: 500 } });
  await p.goto(
    "http://localhost:3000/design-system?surface=cms&role=admin&module=activity&scenario=pagination",
    { waitUntil: "networkidle" },
  );
  check(
    "safe actor",
    !(await p.locator("main").innerText()).includes("11111111"),
  );
  await p.getByRole("button", { name: "Menu", exact: true }).click();
  check("mobile dialog", await p.getByRole("dialog").isVisible());
  await p.keyboard.press("Escape");
  check("escape dismissal", (await p.getByRole("dialog").count()) === 0);
  await p.evaluate(() => (document.documentElement.style.zoom = "2"));
  check(
    "zoom overflow",
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.close();
  await browser.close();
  fs.writeFileSync(
    "docs/fe-04-05-evidence/browser.json",
    JSON.stringify({ passed: results.length, results }, null, 2),
  );
  process.stdout.write(JSON.stringify({ passed: results.length }));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
