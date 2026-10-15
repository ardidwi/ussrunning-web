/* Homepage-only rendered checks. Uses the existing external Playwright runtime. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(
  process.env.USERPROFILE,
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
));

(async () => {
  const output = path.resolve(process.env.HERO_EVIDENCE_DIR || "docs/home-hero-evidence");
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const base = process.env.FE_BASE_URL || "http://localhost:3100";
  const report = { cases: [], assertions: 0, runtime: [], hydration: [] };
  page.on("pageerror", error => report.runtime.push(error.message));
  page.on("console", message => {
    if (/hydration|hydrated|didn't match/i.test(message.text())) report.hydration.push(message.text());
  });
  const ok = (value, message) => { assert.ok(value, message); report.assertions++; };
  const noOverflow = async () => ok(await page.evaluate(
    () => document.documentElement.scrollWidth <= innerWidth,
  ), "No horizontal page overflow");
  async function home() {
    const response = await page.goto(base, { waitUntil: "networkidle" });
    ok(response.status() === 200, "Homepage HTTP 200");
    await page.waitForFunction(() => document.querySelector(".uss-motion-scrubber.is-on"));
    await page.waitForTimeout(400);
  }
  async function chapter(index) {
    await page.evaluate(index => {
      const el = document.querySelectorAll(".uss-motion-chapter")[index];
      const top = el.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + el.clientHeight / 2 - innerHeight / 2, behavior: "instant" });
    }, index);
    await page.waitForTimeout(450);
  }
  try {
    for (const [width, height] of [[320,568],[375,812],[430,932],[768,1024],[1024,768],[1440,900],[1920,1080],[1366,500]]) {
      await page.setViewportSize({ width, height });
      await home();
      await noOverflow();
      ok(await page.locator(".uss-public-brand").isVisible(), "Visible shared logo");
      ok(await page.locator(".uss-hero-orbit-core img").first().evaluate(img => img.complete && img.naturalWidth > 0), "USS core asset loaded");
      const ring = await page.locator(".uss-hero-orbit:visible").first().boundingBox();
      ok(ring.x >= 0 && ring.x + ring.width <= width, "Orbit fits viewport");
      for (let index = 0; index < 4; index++) {
        await chapter(index);
        await noOverflow();
        const copy = page.locator(".uss-motion-copy").nth(index);
        if (width <= 768 && [0,2].includes(index)) {
          const art = await page.locator(".uss-motion-chapter").nth(index).locator(".uss-hero-mobile-art").boundingBox();
          const text = await copy.boundingBox();
          ok(art.y + art.height <= text.y, "Mobile artwork has its own space above copy");
          if (index === 2) {
            const image = await page.locator(".uss-hero-mobile-art>img").boundingBox();
            ok(image.height <= art.height + 1, "Monas image fits its reserved grid track");
          }
        }
        ok(await copy.evaluate(el => Array.from(el.children).every(child => child.scrollWidth <= child.clientWidth + 1)), "Text wraps within copy column");
        const action = copy.locator("a");
        // Native scrolling respects the hero's fixed-header/progress safe areas.
        await action.evaluate(el => el.scrollIntoView({ block: "nearest", behavior: "instant" }));
        const box = await action.boundingBox();
        ok(box.height >= 44, "CTA touch target");
        ok(box.y >= 0 && box.y + box.height <= height - 64, `CTA reachable above progress UI: ${width}, chapter ${index + 1}, ${JSON.stringify(box)}`);
      }
      ok(await page.locator(".uss-motion-story h1").count() === 1, "Single introduction H1");
      if (width <= 768) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForTimeout(250);
        await page.getByRole("button", { name: "MENU +", exact: true }).click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        ok(await page.getByRole("dialog").isVisible(), "Mobile navigation opens");
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
        ok(!(await page.getByRole("dialog").isVisible()), "Escape closes navigation");
      } else {
        ok(await page.getByRole("navigation", { name: "Main navigation", exact: true }).isVisible(), "Desktop navigation visible");
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(400);
      if ([320,1440].includes(width)) {
        await page.screenshot({ path: path.join(output, `opening-${width}.png`), caret: "initial" });
        await chapter(2);
        await page.screenshot({ path: path.join(output, `monas-${width}.png`), caret: "initial" });
      }
      report.cases.push({ name: "responsive chapters/navigation", width, height, result: "PASS" });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await home();
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await page.waitForTimeout(400);
    await noOverflow();
    for (let index = 0; index < 4; index++) {
      await page.locator(".uss-motion-copy").nth(index).locator("a").scrollIntoViewIfNeeded();
      await noOverflow();
    }
    report.cases.push({ name: "200% CSS zoom/reflow", result: "PASS" });
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await home();
    ok(await page.locator(".uss-hero-orbit-path").first().evaluate(el => getComputedStyle(el).animationName === "none"), "Reduced motion stops CSS orbit");
    await chapter(2);
    // A calm canvas must not continue changing between frames after assets settle.
    await page.waitForTimeout(700);
    const calm = await page.locator("canvas.uss-motion-canvas").evaluate(el => el.toDataURL());
    await page.waitForTimeout(350);
    ok(calm === await page.locator("canvas.uss-motion-canvas").evaluate(el => el.toDataURL()), "Reduced motion stops continuous canvas updates");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(200);
    ok(calm !== await page.locator("canvas.uss-motion-canvas").evaluate(el => el.toDataURL()), "Motion resumes after preference changes");
    report.cases.push({ name: "Live reduced-motion preference", result: "PASS" });

    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await page.locator(".uss-motion-copy a").first().focus();
    ok(await page.locator(".uss-motion-copy a").first().evaluate(el => el === document.activeElement && getComputedStyle(el).outlineStyle !== "none"), "Keyboard CTA has visible focus");
    await page.locator(".uss-motion-scrubber a").focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    ok(await page.locator(".uss-motion-stage").evaluate(el => getComputedStyle(el).visibility === "hidden"), "Skip exits hero visual stage");
    ok(await page.locator(".uss-motion-scrubber").evaluate(el => getComputedStyle(el).visibility === "hidden"), "Progress no longer overlays content");
    report.cases.push({ name: "Keyboard/skip handoff", result: "PASS" });

    for (const route of ["/about", "/login"]) {
      const response = await page.goto(base + route, { waitUntil: "networkidle" });
      ok(response.status() === 200, route + " HTTP 200");
      ok(await page.locator(".uss-hero-orbit,.uss-motion-stage").count() === 0, "No hero effects outside homepage");
      await noOverflow();
      report.cases.push({ name: route + " scoped regression", result: "PASS" });
    }
    ok(report.runtime.length === 0, "Zero runtime exceptions");
    ok(report.hydration.length === 0, "Zero hydration warnings");
    report.result = "PASS";
  } catch (error) {
    report.result = "FAIL";
    report.error = String(error);
    report.failureContext = await page.evaluate(() => ({
      scrollY,
      dialogOpen: document.querySelector("dialog")?.open,
      menuExpanded: document.querySelector(".uss-public-menu-trigger")?.getAttribute("aria-expanded"),
    }));
    await page.screenshot({ path: path.join(output, "failure.png"), caret: "initial" });
    throw error;
  } finally {
    await fs.writeFile(path.join(output, "browser-report.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
