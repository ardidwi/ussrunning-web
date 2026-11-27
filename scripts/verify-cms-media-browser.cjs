// CMS media lane browser QA against development fixtures (no backend writes, no storage).
// Usage: MEDIA_QA_URL=http://localhost:3103 node scripts/verify-cms-media-browser.cjs
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(path.join(process.env.USERPROFILE, ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"));
const base = process.env.MEDIA_QA_URL || "http://localhost:3103";
const shots = process.env.MEDIA_QA_SHOTS || "";
const report = { cases: [], assertions: 0, runtimeErrors: [], hydrationWarnings: [] };
function check(value, label) { assert.ok(value, label); report.assertions++; }
async function open(page, surface, scenario = "draft", view = "edit") {
  await page.goto(`${base}/design-system?surface=${surface}&scenario=${scenario}&flow=${view}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Array.from(document.querySelectorAll("button")).some((b) => Object.keys(b).some((k) => k.startsWith("__reactProps"))), null, { timeout: 60000 });
}
const overflow = (page) => page.evaluate(() => { const bad = [...document.querySelectorAll("body *")].filter((n) => n.getBoundingClientRect().right > window.innerWidth + 1 && getComputedStyle(n).position !== "fixed").slice(0, 6).map((n) => `${n.tagName}.${String(n.className).slice(0, 40)}`); return { ok: document.documentElement.scrollWidth <= window.innerWidth + 1, bad }; });
async function caseOf(label, fn) { await fn(); report.cases.push(label); }
(async () => {
  const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", (e) => report.runtimeErrors.push(e.message));
    page.on("console", (m) => { if (/hydrat|didn't match|server rendered HTML/i.test(m.text())) report.hydrationWarnings.push(m.text()); });
    const widths = [320, 375, 768, 1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 500 ? 740 : 900 });
      for (const [surface, view, heading] of [["stories", "edit", "EDIT STORY."], ["stories", "create", "NEW STORY."], ["stories", "preview", null], ["stories", "taxonomy", "CATEGORIES & TAGS."], ["media", "library", "MEDIA LIBRARY."]]) {
        await caseOf(`${surface}/${view} at ${width}px`, async () => {
          await open(page, surface, "draft", view);
          const o = await overflow(page); check(o.ok, `no horizontal overflow ${surface}/${view} ${width}: ${o.bad.join(",")}`);
          if (heading) check(await page.getByRole("heading", { name: heading }).first().isVisible(), `${heading} visible at ${width}`);
          else check(await page.getByText("PREVIEW · PRIVATE WORKSPACE").isVisible(), "preview label");
          if (shots) await page.screenshot({ path: path.join(shots, `${surface}-${view}-${width}.png`), fullPage: true });
        });
      }
    }
    await page.setViewportSize({ width: 768, height: 1024 });
    await caseOf("tablet editor: add, reorder and remove blocks; unsaved indicator; preview renders blocks", async () => {
      await open(page, "stories");
      const before = await page.locator(".uss-block-card").count();
      await page.getByRole("button", { name: "+ Quote" }).click();
      check(await page.locator(".uss-block-card").count() === before + 1, "quote block added");
      check(await page.getByText("● Unsaved changes").isVisible(), "unsaved indicator");
      await page.getByRole("button", { name: `Move block ${before + 1} up` }).click();
      check((await page.locator(".uss-block-card").nth(before - 1).getAttribute("aria-label")).includes("Quote"), "moved up");
      await page.getByRole("button", { name: `Remove block ${before}` }).click();
      check(await page.locator(".uss-block-card").count() === before, "removed");
      await page.getByRole("button", { name: "Preview draft ↗" }).click();
      check(await page.locator(".uss-story-preview blockquote").count() >= 1, "quote rendered in preview");
      check(await page.locator(".uss-story-preview iframe[src^='https://www.youtube-nocookie.com/embed/']").count() === 1, "youtube embed from allowlist");
      check(await page.locator(".uss-story-preview script").count() === 0, "no script in preview");
    });
    await caseOf("disallowed embed and missing alt are flagged before saving", async () => {
      await open(page, "stories");
      await page.getByRole("button", { name: "+ Embed" }).click();
      const embeds = page.getByLabel(/^Embed link/); await embeds.last().fill("https://evil.example/watch?v=1");
      check(await page.getByText("Not an allowed link.").isVisible(), "inline embed feedback");
      await page.getByRole("button", { name: "Save changes" }).click();
      check(await page.getByText("Review the highlighted fields before saving.").isVisible(), "save blocked");
      await page.getByRole("button", { name: /^Remove block/ }).last().click();
      await page.getByRole("button", { name: "+ Image" }).click();
      await page.getByRole("button", { name: "Save changes" }).click();
      check(await page.getByText("Choose an image from the media library.").first().isVisible(), "image needs library media");
    });
    await caseOf("image block picker fills alt text from the library", async () => {
      await open(page, "stories");
      await page.getByRole("button", { name: "+ Image" }).click();
      await page.getByRole("button", { name: "Choose image" }).last().click();
      const dialog = page.getByRole("dialog", { name: "Choose block image" }); check(await dialog.isVisible(), "picker open");
      check(await dialog.getByRole("searchbox").or(dialog.getByLabel(/Search media/)).first().isVisible(), "picker search");
      await dialog.getByRole("button", { name: /Fictional USS editorial image/ }).click();
      const alts = page.getByLabel(/^Alt text for image block/); check((await alts.last().inputValue()) === "Fictional USS editorial image", "alt prefilled");
    });
    await caseOf("unsaved changes navigation guard", async () => {
      await open(page, "stories"); await page.getByLabel(/^Title/).fill("Unsaved title");
      await page.getByRole("link", { name: "All Stories ↗" }).click();
      await page.getByRole("dialog", { name: "Discard your changes?" }).waitFor({ timeout: 10000 }); report.assertions++;
      await page.getByRole("button", { name: "Keep editing" }).click();
      check((await page.getByLabel(/^Title/).inputValue()) === "Unsaved title", "kept");
    });
    await caseOf("tags and byline selectors", async () => {
      await open(page, "stories"); check(await page.getByLabel("Night run").isChecked(), "tag preselected");
      await page.getByLabel("Race week").check(); check(await page.getByText("● Unsaved changes").isVisible(), "dirty after tag");
      check(await page.getByLabel("Byline").locator("option").count() === 2, "byline options");
    });
    await caseOf("publish and schedule flow", async () => {
      await open(page, "stories"); await page.getByRole("button", { name: "Publish now" }).click();
      await page.getByRole("dialog", { name: "Publish this Story now?" }).getByRole("button", { name: "Publish", exact: true }).click();
      await page.getByText("Story published.").waitFor(); check(await page.getByLabel(/^Title/).isDisabled(), "published read-only");
      await open(page, "stories"); await page.getByRole("button", { name: "Schedule" }).click();
      const dlg = page.getByRole("dialog", { name: "Schedule this Story?" }); await dlg.getByLabel(/Publication time/).fill("2030-01-02T07:30");
      check(await dlg.getByText(/2030-01-02T07:30:00\+07:00/).isVisible(), "explicit WIB timestamp");
      await dlg.getByRole("button", { name: "Confirm schedule" }).click(); await page.getByText(/Story scheduled for/).waitFor();
    });
    await caseOf("taxonomy: in-use delete disabled, create category", async () => {
      await open(page, "stories", "draft", "taxonomy");
      check(await page.getByRole("button", { name: "Delete category Crew" }).isDisabled(), "in-use delete disabled");
      await page.getByRole("button", { name: "New category" }).click(); await page.getByRole("button", { name: "Create category" }).click();
      check(await page.getByText("Add a category name.").isVisible(), "name required");
      await page.getByRole("form", { name: "New category" }).getByLabel(/^Name/).fill("Race recaps"); await page.getByRole("button", { name: "Create category" }).click();
      await page.getByText(/Category “Race recaps” created/).waitFor(); check(await page.getByText("/race-recaps").isVisible(), "slug derived");
      await page.getByRole("button", { name: "Delete category Race week" }).click(); await page.getByRole("dialog", { name: "Delete this category?" }).getByRole("button", { name: "Delete category" }).click();
      await page.getByText("“Race week” deleted.").waitFor();
      await open(page, "stories", "in-use", "taxonomy"); await page.getByRole("button", { name: "Delete category Race week" }).click(); await page.getByRole("dialog", { name: "Delete this category?" }).getByRole("button", { name: "Delete category" }).click();
      check(await page.getByText(/still used by at least one Story/).isVisible(), "server in-use message");
    });
    await caseOf("media library: queue requires alt, bad MIME rejected, upload succeeds, detail shows usage", async () => {
      await open(page, "media", "default", "library");
      await page.locator("input[type=file]").setInputFiles([{ name: "crew.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a", "hex") }, { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }]);
      check(await page.getByText("Only JPEG, PNG and WebP images can be uploaded.").isVisible(), "svg rejected client side");
      await page.getByRole("button", { name: "Upload 1 image" }).click();
      check(await page.getByText("Alt text is required. Describe what the image shows.").isVisible(), "alt required");
      await page.getByLabel("Alt text for crew.png").fill("Crew at the start line");
      await page.getByRole("button", { name: "Upload 1 image" }).click(); await page.getByText("1 image uploaded.").waitFor();
      check(await page.getByRole("button", { name: /Open details for Freshly uploaded fictional image/ }).isVisible(), "new tile in grid");
      await page.getByRole("button", { name: /Open details for Fictional crew photo 1 / }).click();
      const d = page.getByRole("dialog", { name: "Media details" }); await d.getByText("18 runners. One city.").waitFor();
      check(await d.getByRole("button", { name: "Archive" }).isDisabled(), "archive blocked while used");
      await d.getByLabel(/^Alt text/).fill(""); check(await d.getByRole("button", { name: "Save details" }).isDisabled(), "cannot clear alt");
      await d.getByRole("button", { name: "Close" }).click();
      await open(page, "media", "upload-fail", "library");
      await page.locator("input[type=file]").setInputFiles([{ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("<html>") }]);
      await page.getByLabel("Alt text for fake.png").fill("Fake"); await page.getByRole("button", { name: "Upload 1 image" }).click();
      await page.getByText(/not a valid image of the stated type/).waitFor({ timeout: 10000 }); report.assertions++;
      await open(page, "media", "empty", "library"); check(await page.getByText("No media yet.").isVisible(), "empty state");
      await open(page, "media", "error", "library"); check(await page.getByText("The media library is temporarily unavailable.").isVisible(), "error state");
    });
    check(report.runtimeErrors.length === 0, "zero runtime errors: " + JSON.stringify(report.runtimeErrors));
    check(report.hydrationWarnings.length === 0, "zero hydration warnings: " + JSON.stringify(report.hydrationWarnings));
    console.log(`CMS media browser: ${report.cases.length} cases / ${report.assertions} assertions PASS`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message.slice(0, 2000)); console.log(`passed cases before failure: ${report.cases.length}`); process.exitCode = 1; });
