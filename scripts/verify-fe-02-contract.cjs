const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const ts = require("../node_modules/typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      URL,
      require: (name) =>
        load(
          path.relative(
            path.resolve(__dirname, ".."),
            path.resolve(path.dirname(file), name + ".ts"),
          ),
        ),
    },
    { filename: file },
  );
  cache.set(file, module.exports);
  return module.exports;
}
const { safeReturnPath } = load("lib/auth/return-path.ts");
for (const value of [
  "https://example.com",
  "//example.com",
  "/\\example.com",
  "/%2f%2fexample.com",
  "/login",
  "/foo/../login",
  "/%6cogin",
  "/api/auth",
  "/join?returnTo=/login",
  "/dashboard\n",
  "/%0aevil",
  "/%zz",
  undefined,
])
  assert.equal(safeReturnPath(value), "/dashboard");
assert.equal(
  safeReturnPath("/dashboard/settings?tab=privacy"),
  "/dashboard/settings?tab=privacy",
);
assert.equal(safeReturnPath("/admin"), "/admin");
const { decodeAuthResult } = load("lib/auth/contract.ts");
for (const raw of [
  null,
  {},
  "success",
  { state: "signed_in" },
  { state: "password_reset" },
  { state: "error", code: "RAW_EXCEPTION", message: "secret" },
])
  assert.equal(decodeAuthResult(raw, "register").code, "UNKNOWN_ERROR");
assert.equal(
  decodeAuthResult(
    { state: "error", code: "INVALID_EMAIL_OR_PASSWORD" },
    "login",
  ).code,
  "INVALID_CREDENTIALS",
);
assert.equal(
  decodeAuthResult({ state: "error", code: "TOKEN_EXPIRED" }, "reset").code,
  "RESET_EXPIRED",
);
assert.equal(
  decodeAuthResult({ state: "resend_sent", retryAfterSeconds: -1 }, "resend")
    .retryAfterSeconds,
  undefined,
);
assert.equal(
  decodeAuthResult({ state: "resend_sent", retryAfterSeconds: 42 }, "resend")
    .retryAfterSeconds,
  42,
);
assert.equal(decodeAuthResult({ state: "signed_in" }, "verify").state, "error");
const { validateAuth } = load("lib/auth/validation.ts");
const policy = {
  minimumPasswordLength: 8,
  maximumPasswordLength: 128,
  maximumNameLength: 80,
};
assert.equal(Object.keys(validateAuth("register", {}, policy)).length, 5);
assert.equal(
  Object.keys(
    validateAuth(
      "register",
      {
        fullName: "Runner",
        email: "runner@example.com",
        password: "example-password",
        confirmPassword: "example-password",
        consent: true,
      },
      policy,
    ),
  ).length,
  0,
);
assert.ok(
  validateAuth(
    "register",
    {
      fullName: "x".repeat(81),
      email: "x".repeat(255) + "@example.com",
      password: "short",
      confirmPassword: "other",
    },
    policy,
  ).fullName,
);
const { authMessages, normalizeAuthCode } = load("lib/auth/auth-errors.ts");
for (const code of Object.keys(authMessages))
  assert.equal(normalizeAuthCode(code), code);
console.log(
  "FE-02 contract tests passed: return paths, malformed responses, code mappings, timing and validation.",
);
