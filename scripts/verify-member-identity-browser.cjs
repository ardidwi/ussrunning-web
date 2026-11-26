const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");

const playwright = process.env.MEMBER_QA_PLAYWRIGHT ||
  path.join(os.homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const { chromium } = require(playwright);
const base = process.env.MEMBER_QA_URL || "http://127.0.0.1:4300";
const executablePath = process.env.MEMBER_QA_CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const evidence = fs.mkdtempSync(path.join(os.tmpdir(), "uss-identity-browser-"));
const barcode = "USS-11111111-1111-4111-8111-111111111111";
const fixtureId = "11111111-1111-4111-8111-111111111111";
const fixture = "/design-system/member-identity";
const failures = [];
const cases = [];

async function open(browser, route, width, options = {}) {
  const page = await browser.newPage({ viewport: { width, height: 860 }, acceptDownloads: true, ...options });
  page.on("pageerror", error => failures.push(`${route} @ ${width}: ${error.message}`));
  page.on("console", entry => {
    if (entry.type() === "error") failures.push(`${route} @ ${width}: ${entry.text()}`);
  });
  await page.route("**/*", route => new URL(route.request().url()).origin === new URL(base).origin
    ? route.continue() : route.abort());
  const response = await page.goto(base + route, { waitUntil: "networkidle", timeout: 90_000 });
  assert.equal(response.status(), 200, route);
  return page;
}

async function withinViewport(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
}

async function record(page, name, screenshot = false) {
  await withinViewport(page);
  if (screenshot) await page.screenshot({ path: path.join(evidence, name + ".png"), fullPage: true });
  cases.push(name);
}

async function fakeCameraFromCard(filename) {
  const size = 420, width = 640, height = 480;
  const raw = await sharp(filename).extract({ left: 105, top: 351, width: 510, height: 510 })
    .resize(size, size, { kernel: "nearest" }).removeAlpha().greyscale().raw().toBuffer();
  assert.equal(raw.length, size * size);
  const frame = Buffer.alloc(width * height, 235);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      frame[(y + 30) * width + x + 110] = Math.round(16 + raw[y * size + x] * 219 / 255);
    }
  }
  const camera = path.join(evidence, "camera.y4m");
  fs.writeFileSync(camera, Buffer.concat([
    Buffer.from("YUV4MPEG2 W640 H480 F30:1 Ip A1:1 C420jpeg\nFRAME\n"),
    frame, Buffer.alloc(width * height / 2, 128),
  ]));
  return camera;
}

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true });
  const portrait = await sharp({ create: { width: 700, height: 900, channels: 3, background: "#a2522b" } }).jpeg().toBuffer();
  let exported;
  try {
    for (const width of [320, 375, 768, 1024, 1440]) {
      for (const [route, content] of [["/join", "permanent USS Member ID"], ["/membership", "Authorized USS staff"], ["/privacy", "limit access to you and authorized USS staff"]]) {
        const page = await open(browser, route, width);
        await page.getByText(content, { exact: false }).first().waitFor();
        await record(page, route.slice(1) + "-" + width, width === 320 || width === 1440);
        await page.close();
      }

      const page = await open(browser, fixture, width, { isMobile: width < 500, hasTouch: width < 500 });
      await page.getByLabel("Choose a profile photo").setInputFiles({ name: "invalid.jpg", mimeType: "image/jpeg", buffer: Buffer.from("invalid") });
      await page.getByText("This photo could not be opened.", { exact: false }).waitFor();
      await page.getByLabel("Choose a profile photo").setInputFiles({ name: "synthetic.jpg", mimeType: "image/jpeg", buffer: portrait });
      await page.getByRole("img", { name: "Square profile photo preview" }).waitFor();
      const zoom = page.getByRole("slider", { name: "Zoom" });
      await zoom.focus();
      await zoom.press("ArrowRight");
      assert.notEqual(await zoom.inputValue(), "1");
      await record(page, "crop-" + width, width === 320 || width === 1440);
      await page.getByRole("button", { name: "Save photo" }).click();
      for (const [label, value] of [["Full name", "Synthetic Runner"], ["Mobile number", "+12025550100"],
        ["Emergency contact name", "Synthetic Contact"], ["Emergency contact number", "+12025550101"]]) {
        await page.getByLabel(label).fill(value);
      }
      await record(page, "details-" + width, width === 320 || width === 1440);
      await page.getByRole("button", { name: "Save details and open card" }).click();
      await page.getByRole("img", { name: "Permanent USS member barcode", exact: false }).waitFor();
      assert.ok(await page.locator(".uss-card-code-frame .uss-qr-logo").isVisible());
      await record(page, "card-" + width, width === 320 || width === 1440);

      if (width === 375) {
        await page.route("**/api/member/avatar?*", route => {
          assert.equal(new URL(route.request().url()).searchParams.get("id"), fixtureId);
          return route.fulfill({ contentType: "image/jpeg", body: portrait });
        });
        const downloadReady = page.waitForEvent("download");
        await page.getByRole("button", { name: "Download Member Card (PNG)" }).click();
        const download = await downloadReady;
        assert.equal(download.suggestedFilename(), "USS-000123-member-card.png");
        exported = path.join(evidence, download.suggestedFilename());
        await download.saveAs(exported);
        const png = await sharp(exported).metadata();
        assert.deepEqual([png.format, png.width, png.height], ["png", 720, 960]);
      }
      await page.close();

      const scanner = await open(browser, fixture + "?surface=scanner", width);
      await scanner.getByRole("textbox", { name: "Member barcode", exact: true }).fill(barcode);
      await scanner.getByRole("button", { name: "Look up member" }).click();
      await scanner.getByRole("heading", { name: "Synthetic Runner" }).waitFor();
      assert.equal(await scanner.getByRole("region", { name: "Scan result" }).evaluate(node => node === document.activeElement), true);
      await record(scanner, "scanner-result-" + width, width === 320 || width === 1440);
      await scanner.getByRole("button", { name: "Scan another member" }).click();
      await scanner.getByRole("textbox", { name: "Member barcode", exact: true }).fill("USS-000123");
      await scanner.getByRole("button", { name: "Look up member" }).click();
      await scanner.getByRole("alert").filter({ hasText: "No member matched" }).waitFor();
      await record(scanner, "scanner-no-match-" + width);
      await scanner.close();
    }

    const request = await browser.newPage();
    const denied = await request.request.get(base + "/api/member/avatar?id=" + fixtureId);
    assert.equal(denied.status(), 404);
    assert.match(denied.headers()["cache-control"], /no-store/);
    // Visitors without a session cookie are routed to sign-in by proxy.ts (UX only);
    // server guards still deny any request that reaches the protected shells.
    const signedOut = async (page, route) => {
      await page.waitForURL(url => url.pathname === "/login" && url.searchParams.get("returnTo") === route);
    };
    const anonymous = await open(browser, "/admin?module=member-scanner", 375);
    await signedOut(anonymous, "/admin?module=member-scanner");
    assert.equal(await anonymous.getByRole("heading", { name: "Scan member." }).count(), 0);
    await record(anonymous, "scanner-denies-visitor");
    await anonymous.close();
    const onboarding = await open(browser, "/dashboard/onboarding", 375);
    await signedOut(onboarding, "/dashboard/onboarding");
    assert.equal(await onboarding.getByLabel("Choose a profile photo").count(), 0);
    await record(onboarding, "onboarding-denies-visitor");
    await onboarding.close();
  } finally {
    await browser.close();
  }

  const camera = await fakeCameraFromCard(exported);
  const withCamera = await chromium.launch({ executablePath, headless: true, args: [
    "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${camera}`,
  ] });
  try {
    const scan = await open(withCamera, fixture + "?surface=scanner", 375, { permissions: ["camera"] });
    await scan.getByRole("button", { name: "Start camera" }).click();
    await scan.getByRole("heading", { name: "Synthetic Runner" }).waitFor({ timeout: 25_000 });
    assert.equal(await scan.locator("video").count(), 0);
    await record(scan, "camera-decoded-exported-png");
  } finally {
    await withCamera.close();
  }
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ evidence, scenarios: cases, runtimeErrors: failures }, null, 2));
})().catch(error => {
  console.error({ evidence, cases, failures });
  console.error(error);
  process.exitCode = 1;
});
