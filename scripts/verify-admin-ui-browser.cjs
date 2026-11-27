// Admin UI lane browser QA: renders /design-system/admin-ui fixtures (development only, synthetic data)
// at 320/375/768/1440px, checks horizontal overflow, key interactions and console errors.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const playwright = process.env.ADMIN_QA_PLAYWRIGHT ||
  path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { chromium } = require(playwright);
const base = process.env.ADMIN_QA_URL || "http://localhost:3101";
const executablePath = process.env.ADMIN_QA_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const evidence = process.env.ADMIN_QA_EVIDENCE || fs.mkdtempSync(path.join(os.tmpdir(), "uss-admin-ui-browser-"));
const widths = [320, 375, 768, 1440];
const surfaces = ["overview", "overview-admin", "members", "members-restricted", "members-empty", "detail", "detail-self",
  "detail-restricted", "roles", "moderation", "moderation-empty", "scanner", "slot"];
const failures = [];
const cases = [];

async function open(browser, surface, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
  page.on("pageerror", error => failures.push(`${surface} @ ${width}: ${error.message}`));
  page.on("console", entry => { if (entry.type() === "error") failures.push(`${surface} @ ${width}: ${entry.text()}`); });
  const response = await page.goto(`${base}/design-system/admin-ui?surface=${surface}`, { waitUntil: "networkidle", timeout: 120_000 });
  assert.equal(response.status(), 200, surface);
  return page;
}
async function noOverflow(page, label) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}px`);
}
async function checkTargets(page, label) {
  // Primary actions must be comfortably tappable on phones (>= 40px tall).
  const small = await page.evaluate(() => [...document.querySelectorAll("#cms-content button:not([disabled]), #cms-content a.uss-button")]
    .filter(el => el.getClientRects().length && el.getBoundingClientRect().height < 40).map(el => el.textContent.trim()).slice(0, 5));
  assert.deepEqual(small, [], `${label}: small touch targets`);
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    for (const width of widths) {
      for (const surface of surfaces) {
        const label = `${surface}@${width}`;
        const page = await open(browser, surface, width);
        await page.locator("#cms-content h1").first().waitFor();
        await noOverflow(page, label);
        if (width < 500) await checkTargets(page, label);
        if (surface === "members" && width < 768) {
          const display = await page.locator(".uss-admin-table tr").first().evaluate(el => getComputedStyle(el).display);
          assert.equal(display, "grid", "member rows become cards on small screens");
        }
        if (surface === "members" && width >= 768) {
          assert.equal(await page.locator(".uss-admin-table thead").isVisible(), true, "table header visible on desktop");
        }
        if (surface === "members-restricted") {
          const text = await page.locator("#cms-content").innerText();
          assert.ok(!/runner@example\.test/.test(text) && /•••@/.test(text), "restricted view shows masked email only");
        }
        if (surface === "detail") {
          const dialog = page.getByRole("dialog");
          await page.getByRole("button", { name: "Reactivate account" }).click();
          await dialog.getByRole("button", { name: "Reactivate account" }).click();
          await dialog.getByText("Write a reason of at least 5 characters", { exact: false }).waitFor();
          await page.screenshot({ path: path.join(evidence, `${label}-reason-required.png`), fullPage: false });
          await dialog.getByRole("button", { name: "Cancel" }).click();
          await page.getByRole("button", { name: "Deactivate account" }).click();
          await dialog.getByLabel("Reason (required)").fill("Member asked to close the account.");
          await dialog.getByRole("button", { name: "Deactivate account" }).click();
          await dialog.getByText("This account changed after you opened it", { exact: false }).waitFor();
          await dialog.getByRole("button", { name: "Reload latest" }).waitFor();
          await page.screenshot({ path: path.join(evidence, `${label}-conflict.png`), fullPage: false });
          await dialog.getByRole("button", { name: "Cancel" }).click();
          await page.getByRole("button", { name: "Reactivate account" }).click();
          await dialog.getByLabel("Reason (required)").fill("Suspension review completed.");
          await dialog.getByRole("button", { name: "Reactivate account" }).click();
          await page.getByText("saved. The audit history records your reason.", { exact: false }).waitFor();
          assert.equal(await page.getByRole("button", { name: "Grant Admin" }).isDisabled(), true, "grant disabled for suspended account");
        }
        if (surface === "detail-self") {
          await page.getByText("You can't change your own roles", { exact: false }).waitFor();
          assert.equal(await page.getByRole("button", { name: /Revoke/ }).count(), 0);
        }
        if (surface === "detail-restricted") {
          await page.getByText("Read-only view.", { exact: false }).waitFor();
          assert.equal(await page.getByRole("button", { name: /Suspend|Grant|Revoke/ }).count(), 0);
        }
        if (surface === "moderation") {
          const before = await page.locator(".uss-admin-photo-card").count();
          await page.getByRole("button", { name: "Approve" }).first().click();
          await page.getByText("approved.", { exact: false }).waitFor();
          assert.equal(await page.locator(".uss-admin-photo-card").count(), before - 1);
          await page.getByRole("button", { name: "Reject…" }).first().click();
          await page.getByRole("button", { name: "Reject photo" }).click();
          await page.getByText("Write a reason of at least 5 characters", { exact: false }).first().waitFor();
          await page.getByRole("button", { name: "Face is not clearly visible." }).click();
          await page.getByRole("button", { name: "Reject photo" }).click();
          await page.getByText("The member replaced this photo", { exact: false }).waitFor();
          await page.getByRole("button", { name: "Reload queue" }).waitFor();
        }
        if (surface === "scanner") {
          await page.getByRole("textbox", { name: "Member ID" }).fill("uss120");
          await page.getByRole("button", { name: "Look up Member ID" }).click();
          await page.getByText("USS-000120").waitFor();
          await page.getByRole("button", { name: "Scan another member" }).click();
          await page.getByRole("textbox", { name: "Member ID" }).fill("USS-12A");
          await page.getByRole("button", { name: "Look up Member ID" }).click();
          await page.getByText("Enter a Member ID like USS-000123.").waitFor();
        }
        if (surface === "slot") await page.getByText("Module not yet connected.").waitFor();
        await noOverflow(page, label + " after interaction");
        if ([320, 375, 768, 1440].includes(width)) await page.screenshot({ path: path.join(evidence, `${label}.png`), fullPage: true });
        cases.push(label);
        await page.close();
      }
      // Mobile navigation exposes the new modules.
      if (width < 768) {
        const page = await open(browser, "overview", width);
        await page.getByRole("button", { name: "Menu" }).click();
        for (const name of ["Members", "Photo review", "Roles", "Event check-in", "Participants", "Notifications", "Data requests"])
          await page.getByRole("dialog").getByRole("link", { name: new RegExp(name) }).waitFor();
        cases.push(`mobile-nav@${width}`);
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ evidence, cases: cases.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
