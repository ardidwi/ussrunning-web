const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const playwright = require(
  path.join(
    process.env.USERPROFILE,
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
  ),
);
const suite = process.argv[2];
const output = path.join(process.cwd(), "docs/fe-07-evidence/regressions");
fs.mkdirSync(output, { recursive: true });
const warnings = [];
const live = [];
const cleanup = setInterval(() => {
  if (process.exitCode) {
    clearInterval(cleanup);
    Promise.allSettled(live.map((browser) => browser.close()));
  }
}, 250);
cleanup.unref();
const watched = new WeakSet();
function watch(page) {
  if (watched.has(page)) return;
  watched.add(page);
  page.on("console", (m) => {
    if (/hydrat|didn't match|server rendered HTML/i.test(m.text()))
      warnings.push({ url: page.url(), type: m.type(), text: m.text() });
  });
  page.on("pageerror", (e) =>
    warnings.push({ url: page.url(), type: "pageerror", text: e.message }),
  );
}
const launch = playwright.chromium.launch.bind(playwright.chromium);
playwright.chromium.launch = async (...args) => {
  const browser = await launch(...args);
  live.push(browser);
  const nc = browser.newContext.bind(browser);
  browser.newContext = async (...a) => {
    const c = await nc(...a);
    c.on("page", watch);
    return c;
  };
  const np = browser.newPage.bind(browser);
  browser.newPage = async (...a) => {
    const p = await np(...a);
    watch(p);
    return p;
  };
  return browser;
};
process.on("exit", () =>
  fs.writeFileSync(
    path.join(output, suite + "-console.json"),
    JSON.stringify(warnings, null, 2),
  ),
);
process.env.FE_BASE_URL = "http://localhost:3137";
process.env.FE03_URL = "http://localhost:3137";
const filename = path.join(
  process.cwd(),
  suite.startsWith("card-") ? "docs/fe-04-05-evidence" : "scripts",
  (suite === "card-layout"
    ? "browser-check"
    : suite === "card-interactions"
      ? "browser-interactions"
      : suite) + ".cjs",
);
fs.mkdirSync(path.join(output, "card"), { recursive: true });
let source = fs
  .readFileSync(filename, "utf8")
  .replaceAll("http://127.0.0.1:3000", "http://localhost:3137")
  .replaceAll("http://localhost:3000", "http://localhost:3137")
  .replaceAll("127.0.0.1", "localhost")
  .replaceAll("docs/fe-04-05-evidence", "docs/fe-07-evidence/regressions/card")
  .replaceAll("docs/fe-01-evidence", "docs/fe-07-evidence/regressions/fe01")
  .replaceAll("docs/fe-02-evidence", "docs/fe-07-evidence/regressions/fe02")
  .replaceAll("docs/fe-03-evidence", "docs/fe-07-evidence/regressions/fe03");
// Existing public-shell audit clicks directly after DOMContentLoaded. Wait for
// hydration/effect completion without weakening any navigation/focus assertion.
if (suite === "verify-public-shell") {
  source = source
    .replace(
      "const page = await browser.newPage();",
      `const page = await browser.newPage();
 const goto=page.goto.bind(page);
 page.goto=async(...args)=>{const response=await goto(...args);await page.waitForFunction(()=>{const trigger=document.querySelector('.uss-public-menu-trigger');return !trigger || Object.keys(trigger).some(key=>key.startsWith('__reactProps'));});return response;};`,
    )
    .replaceAll(
      'assert.ok(await page.getByRole("dialog").isVisible());',
      'await page.getByRole("dialog").waitFor(); assert.ok(await page.getByRole("dialog").isVisible());',
    )
    .replaceAll(
      'await page.keyboard.press("Escape");',
      'await page.keyboard.press("Escape"); await page.getByRole("dialog").waitFor({state:"hidden"});',
    );
}
source = source.replaceAll("docs/fe-06-evidence", "docs/fe-07-evidence/regressions/fe06");
const runner = new Module(filename, module);
runner.filename = filename;
runner.paths = Module._nodeModulePaths(path.dirname(filename));
runner._compile(source, filename);
