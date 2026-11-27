import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loader } from "./frontend-loader.mjs";
const model = loader()("features/media/model.ts");
test("raw admin query is validated before reaching the media service", () => {
  assert.deepEqual(model.libraryQuery({ module: "media" }), { q: "", mime: "", status: "active", visibility: "", cursor: "" });
  const q = model.libraryQuery({ q: ["a", "b"], mime: "image/svg+xml", status: "deleted", visibility: "secret", cursor: "../../x" });
  assert.deepEqual(q, { q: "", mime: "", status: "active", visibility: "", cursor: "" });
  assert.equal(model.libraryQuery({ q: "<script>" }).q, "");
  assert.equal(model.libraryQuery({ q: "x".repeat(500) }).q.length, 120);
  assert.deepEqual(model.serviceFilters(model.libraryQuery({ q: " crew ", mime: "image/png", status: "archived" })), { limit: 24, status: "archived", q: "crew", mime: "image/png" });
});
test("links stay on the protected admin route", () => { assert.equal(model.mediaHref({ q: "crew", status: "active" }), "/admin?module=media&q=crew"); assert.ok(!model.mediaHref({ cursor: "abc" }).includes("http")); });
test("client pre-flight rejects bad MIME, empty and oversized files", () => {
  assert.match(model.fileProblem({ type: "image/svg+xml", size: 10 }), /JPEG, PNG and WebP/);
  assert.match(model.fileProblem({ type: "text/html", size: 10 }), /JPEG/);
  assert.match(model.fileProblem({ type: "image/png", size: 0 }), /empty/);
  assert.match(model.fileProblem({ type: "image/png", size: 11 * 1024 * 1024 }), /larger/);
  assert.equal(model.fileProblem({ type: "image/webp", size: 1000 }), null);
});
test("alt text is mandatory and plain text", () => { assert.ok(model.altProblem("  ")); assert.ok(model.altProblem("<b>")); assert.ok(model.altProblem("x".repeat(513))); assert.equal(model.altProblem("Runners at dawn"), null); });
test("filenames are reduced to a safe basename", () => { assert.equal(model.safeFilename(["C:", "fake", "path", "a<b>.png"].join(String.fromCharCode(92))), "a-b-.png"); assert.equal(model.safeFilename("../../x..png"), "x.png"); });
test("used-where links point at the owning CMS workspace", () => { assert.equal(model.usageHref({ kind: "story", role: "cover", entityId: "1", label: "x", status: null }), "/admin?module=stories&view=edit&id=1"); assert.equal(model.usageHref({ kind: "site_content", role: "slot", entityId: "1", label: "home.hero", status: null }), "/admin?module=content"); assert.equal(model.usageLabel({ kind: "event", role: "cover", entityId: "1", label: "x", status: null }), "Event · cover"); });
for (const code of ["MEDIA_UNSUPPORTED_TYPE", "MEDIA_TOO_LARGE", "MEDIA_INVALID_CONTENT", "MEDIA_ALT_REQUIRED", "MEDIA_IN_USE", "MEDIA_RATE_LIMITED", "MEDIA_UPLOAD_EXPIRED", "MEDIA_FORBIDDEN", "MEDIA_STORAGE_UNAVAILABLE"]) test(`stable media feedback: ${code}`, () => assert.doesNotMatch(model.mediaMessage(code), /couldn't complete/));
test("upload never sends bytes through a server action", () => { const actions = readFileSync("features/media/api/library-actions.ts", "utf8"); assert.doesNotMatch(actions, /uploadMedia\(|bytes/); const ui = readFileSync("features/media/components/MediaLibrary.tsx", "utf8"); assert.match(ui, /fetch\(ticket\.uploadUrl/); assert.match(ui, /finalizeLibraryUpload/); });
test("slot export receives raw admin query", () => { const src = readFileSync("features/media/MediaLibraryWorkspace.tsx", "utf8"); assert.match(src, /export async function MediaLibraryWorkspace\(\{ query \}: \{ query: Record<string, string \| string\[\] \| undefined> \}\)/); });
