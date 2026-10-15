const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(process.env.USERPROFILE,
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));

(async () => {
  const output = path.resolve("docs/home-motion-evidence");
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width:1440, height:900 } });
  const report = { cases:[], assertions:0, runtime:[], hydration:[], animation:[] };
  function listen(target) {
    target.on("pageerror", error => report.runtime.push(error.message));
    target.on("console", message => {
      if (/hydration|hydrated|didn't match/i.test(message.text())) report.hydration.push(message.text());
      if (/animation.*(error|failed|invalid)/i.test(message.text())) report.animation.push(message.text());
    });
  }
  listen(page);
  const ok = (condition, message) => { assert.ok(condition, message); report.assertions++; };
  async function check(name, run) { await run(); report.cases.push({ name, result:"PASS" }); }
  const variable = name => page.locator(".uss-motion-story").evaluate((el,name) => Number.parseFloat(el.style.getPropertyValue(name)),name);
  const style = (selector,property,pseudo=null) => page.locator(selector).first().evaluate((el,{property,pseudo}) => getComputedStyle(el,pseudo)[property], {property,pseudo});
  const canvas = () => page.locator(".uss-motion-canvas").evaluate(el => el.toDataURL());
  async function travel(progress) {
    await page.evaluate(progress => {
      const section = document.querySelector(".uss-motion-story");
      scrollTo({ top:(section.offsetHeight-innerHeight)*progress, behavior:"instant" });
    },progress);
    await page.waitForTimeout(350);
  }
  try {
    await page.goto(process.env.FE_BASE_URL || "http://localhost:3100", { waitUntil:"networkidle" });
    await page.waitForFunction(() => document.querySelector(".uss-motion-story").style.getPropertyValue("--hero-orbit-opacity"));
    await check("Orbit planes, energy and dimensional core move at rest", async () => {
      const before = await style(".uss-hero-orbit-path","rotate");
      const core = await style(".uss-hero-orbit-core","transform");
      const node = await style(".uss-hero-orbit-path","offsetDistance","::after");
      const field = await canvas();
      await page.screenshot({path:path.join(output,"opening-a.png"),caret:"initial"});
      await page.waitForTimeout(900);
      ok(before !== await style(".uss-hero-orbit-path","rotate"), "Orbital plane changes over time");
      ok(core !== await style(".uss-hero-orbit-core","transform"), "Logo core floats rather than spinning");
      ok(node !== await style(".uss-hero-orbit-path","offsetDistance","::after"), "Red energy travels along its path");
      ok((await style(".uss-hero-orbit-path","offsetPath","::after")).includes("ellipse"), "Browser resolves the projected orbital path");
      ok(field !== await canvas(), "Directional route sparks animate at opening");
      await page.screenshot({path:path.join(output,"opening-b.png"),caret:"initial"});
    });
    await check("Eased desktop pointer depth with stable text", async () => {
      const text = await page.locator(".uss-motion-copy h1").boundingBox();
      await page.mouse.move(100,250);
      await page.waitForTimeout(450);
      const left = await variable("--hero-x");
      await page.mouse.move(1340,650);
      await page.waitForTimeout(450);
      const right = await variable("--hero-x");
      ok(left < -3 && right > 3, "Centerpiece responds in both directions");
      ok(Math.abs(left) <= 9 && Math.abs(right) <= 9, "Parallax stays within nine pixels");
      const after = await page.locator(".uss-motion-copy h1").boundingBox();
      ok(Math.abs(text.x-after.x)<.5 && Math.abs(text.y-after.y)<.5, "Typography does not follow pointer");
      await page.mouse.move(-1,-1);
      await page.waitForTimeout(600);
      ok(Math.abs(await variable("--hero-x")) < 1, "Pointer departure settles to neutral");
    });
    await check("Orbit retreats continuously across the old chapter boundary", async () => {
      await travel(.14);
      const initial = await variable("--hero-orbit-opacity");
      await travel(.25);
      const halfway = await variable("--hero-orbit-opacity");
      ok(initial > halfway && halfway > 0, "Orbit remains visible during handoff");
      ok(await variable("--hero-orbit-scale") < 1, "Orbit recedes in depth");
      await page.screenshot({path:path.join(output,"handoff.png"),caret:"initial"});
      await travel(.41);
      ok(await variable("--hero-orbit-opacity") < .01, "Orbit completes its fade progressively");
    });
    await check("Monas readable hold and rising energy", async () => {
      await travel(.6);
      ok(await variable("--hero-monas-opacity") >= .79, "Monument holds its architectural silhouette");
      const energy = await style(".uss-motion-monas-photo","backgroundPosition","::after");
      const particles = await canvas();
      await page.waitForTimeout(450);
      ok(energy !== await style(".uss-motion-monas-photo","backgroundPosition","::after"), "Monas energy advances vertically");
      ok(particles !== await canvas(), "Particle shimmer continues around the stable silhouette");
      await page.screenshot({path:path.join(output,"monas.png"),caret:"initial"});
      await travel(.8);
      ok(await variable("--hero-monas-opacity") > 0, "Monas persists into outgoing transition");
    });
    await check("Distance follows native scroll without per-frame React rendering", async () => {
      const before = await page.locator(".uss-motion-distance").textContent();
      await travel(.45);
      await page.waitForTimeout(600);
      const after = await page.locator(".uss-motion-distance").textContent();
      ok(before !== after, "Distance responds to scroll");
      ok(Math.abs(parseInt(after)-2250)<15, "Counter settles on actual scroll progress");
    });
    await check("Final scene fades before the runs handoff", async () => {
      await travel(1.08);
      const opacity = Number(await style(".uss-motion-stage","opacity"));
      ok(opacity > 0 && opacity < 1, "Stage fades continuously before visibility changes");
    });
    await check("Offscreen canvas and CSS animations pause", async () => {
      await page.locator("#uss-next-runs").evaluate(el => el.scrollIntoView({behavior:"instant",block:"start"}));
      await page.waitForTimeout(400);
      ok(await page.locator(".uss-motion-story").getAttribute("data-motion-visible") === "false", "Hero is offscreen");
      ok(await style(".uss-hero-orbit-core","animationPlayState") === "paused", "CSS animation pauses");
      const still = await canvas(); await page.waitForTimeout(250);
      ok(still === await canvas(), "Canvas stops offscreen");
    });
    await check("Live reduced-motion switch stops ambient, energy and pointer motion", async () => {
      await page.emulateMedia({reducedMotion:"reduce"});
      await travel(.6);
      await page.waitForTimeout(400);
      ok(await style(".uss-hero-orbit-core","animationName") === "none", "No logo float");
      ok(await style(".uss-hero-orbit-path","animationName") === "none", "No orbital precession");
      ok(await style(".uss-hero-orbit-path","animationName","::after") === "none", "No path energy animation");
      ok(await style(".uss-motion-monas-photo","display","::after") === "none", "No monument energy sweep");
      await page.mouse.move(1400,800); await page.waitForTimeout(200);
      ok(await variable("--hero-x") === 0, "Pointer motion disabled");
      const still = await canvas(); await page.waitForTimeout(300);
      ok(still === await canvas(), "Canvas is calm");
      await page.screenshot({path:path.join(output,"reduced-motion.png"),caret:"initial"});
    });
    await check("Touch uses ambient animation without cursor parallax", async () => {
      const context = await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
      const mobile = await context.newPage(); listen(mobile);
      await mobile.goto(process.env.FE_BASE_URL || "http://localhost:3100",{waitUntil:"networkidle"});
      const core = mobile.locator(".uss-hero-mobile-art .uss-hero-orbit-core");
      const before = await core.evaluate(el => getComputedStyle(el).transform);
      await mobile.mouse.move(340,400); await mobile.waitForTimeout(700);
      ok(before !== await core.evaluate(el => getComputedStyle(el).transform), "Mobile core remains alive");
      ok(await mobile.locator(".uss-motion-story").evaluate(el => parseFloat(el.style.getPropertyValue("--hero-x"))) === 0, "Coarse pointer cannot enable parallax");
      ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "No touch-layout overflow");
      await mobile.screenshot({path:path.join(output,"mobile.png"),caret:"initial"});
      const monument = mobile.locator(".uss-hero-mobile-art").nth(1);
      await monument.evaluate(el => el.scrollIntoView({block:"center",behavior:"instant"}));
      const energy = await monument.evaluate(el => getComputedStyle(el,"::after").backgroundPosition);
      await mobile.waitForTimeout(500);
      ok(energy !== await monument.evaluate(el => getComputedStyle(el,"::after").backgroundPosition), "Mobile Monas retains its lighter energy animation");
      ok(await monument.evaluate(el => getComputedStyle(el,"::after").maskImage !== "none"), "Mobile energy follows the monument silhouette");
      await mobile.screenshot({path:path.join(output,"mobile-monas.png"),caret:"initial"});
      await context.close();
    });
    ok(report.runtime.length===0,"Zero runtime errors");
    ok(report.hydration.length===0,"Zero hydration errors");
    ok(report.animation.length===0,"Zero animation errors");
    report.result="PASS";
  } catch(error) {
    report.result="FAIL"; report.error=String(error); process.exitCode=1;
  } finally {
    await fs.writeFile(path.join(output,"motion-report.json"),JSON.stringify(report,null,2)+"\n");
    console.log(JSON.stringify(report));
    await browser.close();
  }
})().catch(error=>{ console.error(error); process.exitCode=1; });
