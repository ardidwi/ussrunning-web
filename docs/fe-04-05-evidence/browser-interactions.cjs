const fs = require("fs"),
  path = require("path");
const { chromium } = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
(async () => {
  const b = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  let results = [];
  const check = (name, ok) => {
    results.push({ name, passed: !!ok });
    if (!ok) throw Error(name);
  };
  const page = () =>
    b.newPage({ viewport: { width: 320, height: 480 }, acceptDownloads: true });
  let p = await page();
  await p.goto("http://localhost:3000/design-system?surface=card", {
    waitUntil: "networkidle",
  });
  const button = p.getByRole("button", { name: "Download barcode SVG" });
  await button.waitFor();
  const event = p.waitForEvent("download");
  await button.click();
  const download = await event;
  const stream = await download.createReadStream();
  let svg = "";
  for await (const c of stream) svg += c;
  const displayed = await p
    .locator('img[alt^="Permanent USS"]')
    .getAttribute("src");
  check(
    "download identical rendered SVG",
    decodeURIComponent(displayed.split(",")[1]) === svg,
  );
  check(
    "SVG file name",
    download.suggestedFilename() === "USS-PREVIEW-uss-barcode.svg",
  );
  const detector = await p.evaluate(() => typeof BarcodeDetector);
  results.push({
    name: "native independent decoder",
    available: detector !== "undefined",
  });
  await p.close();
  p = await page();
  await p.goto(
    "http://localhost:3000/design-system?surface=card&scenario=network",
    { waitUntil: "networkidle" },
  );
  await p.getByRole("button", { name: "Refresh account status" }).click();
  await p.getByText("We couldn't connect.", { exact: true }).waitFor();
  check(
    "network recovery feedback",
    await p.getByRole("button", { name: "Try again", exact: true }).isVisible(),
  );
  await p.close();
  p = await page();
  await p.goto(
    "http://localhost:3000/design-system?surface=card&scenario=avatar",
    { waitUntil: "networkidle" },
  );
  await p.getByText("PR", { exact: true }).waitFor();
  check(
    "failed avatar initials",
    await p.getByText("PR", { exact: true }).isVisible(),
  );
  await p.close();
  p = await page();
  await p.goto(
    "http://localhost:3000/design-system?surface=cms&role=super_admin&module=activity&scenario=revoked",
    { waitUntil: "networkidle" },
  );
  check(
    "server denial beats UI grant",
    (await p.getByText("ACCESS RESTRICTED.", { exact: true }).isVisible()) &&
      (await p.getByText("story.published", { exact: true }).count()) === 0,
  );
  await p.close();
  p = await page();
  await p.goto(
    "http://localhost:3000/design-system?surface=cms&role=admin&module=activity&scenario=pagination",
    { waitUntil: "networkidle" },
  );
  const href = await p
    .getByRole("link", { name: "Next page" })
    .getAttribute("href");
  const u = new URL(href, "http://localhost");
  check(
    "next page exact backend window",
    u.searchParams.get("from") === "2026-09-09T00:00:00.123456Z" &&
      u.searchParams.get("until") === "2026-10-09T00:00:00.123456Z" &&
      u.searchParams.get("limit") === "25",
  );
  await p.close();
  await b.close();
  fs.writeFileSync(
    "docs/fe-04-05-evidence/browser-interactions.json",
    JSON.stringify(
      { passed: results.filter((r) => r.passed).length, results },
      null,
      2,
    ),
  );
  process.stdout.write(JSON.stringify(results));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
