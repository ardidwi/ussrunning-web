const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  ts = require("../node_modules/typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
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
      require: (name) =>
        load(
          name.startsWith("@/")
            ? name.slice(2) + ".ts"
            : path.relative(
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
const { decodeMemberResult, profileFields } = load("lib/member/contract.ts"),
  { validateProfile } = load("lib/member/validation.ts");
const values = {
  fullName: "Preview Runner",
  phone: "",
  city: "",
  instagram: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};
const policy = {
  required: ["fullName"],
  maxLengths: Object.fromEntries(profileFields.map((f) => [f, 120])),
  minimumPhoneDigits: 8,
  maximumPhoneDigits: 15,
};
const profile = {
  values,
  policy,
  memberId: "USS-PREVIEW",
  revision: "v1",
  completion: { percentage: 40, missingFields: ["phone", "city"] },
};
assert.equal(decodeMemberResult({ state: "ready", profile }).state, "ready");
assert.equal(Object.keys(validateProfile(values, policy)).length, 0);
assert.ok(validateProfile({ ...values, fullName: "   " }, policy).fullName);
for (const phone of ["abc", "123", "+1234567890123456", "123+456789"])
  assert.ok(validateProfile({ ...values, phone }, policy).phone);
assert.equal(
  validateProfile({ ...values, phone: "+62 (812) 3456-7890" }, policy).phone,
  undefined,
);
assert.ok(validateProfile({ ...values, city: "x".repeat(121) }, policy).city);
assert.ok(
  validateProfile({ ...values, emergencyContactName: "Contact" }, policy)
    .emergencyContactPhone,
);
assert.ok(
  validateProfile({ ...values, emergencyContactPhone: "+628123456789" }, policy)
    .emergencyContactName,
);
for (const raw of [
  null,
  {},
  "ready",
  { state: "ready", profile: {} },
  {
    state: "ready",
    profile: { ...profile, completion: { percentage: NaN, missingFields: [] } },
  },
  {
    state: "ready",
    profile: { ...profile, completion: { percentage: 101, missingFields: [] } },
  },
  {
    state: "ready",
    profile: {
      ...profile,
      completion: { percentage: 30, missingFields: ["role"] },
    },
  },
  {
    state: "ready",
    profile: { ...profile, policy: { ...policy, minimumPhoneDigits: 20 } },
  },
])
  assert.equal(decodeMemberResult(raw).code, "UNKNOWN_ERROR");
const safe = decodeMemberResult({
  state: "ready",
  profile: {
    ...profile,
    role: "super_admin",
    barcodeValue: "do-not-expose",
    values: { ...values, email: "private@example.com" },
  },
});
assert.equal(safe.profile.role, undefined);
assert.equal(safe.profile.barcodeValue, undefined);
assert.equal(safe.profile.values.email, undefined);
assert.equal(
  decodeMemberResult({
    state: "error",
    code: "RAW_EXCEPTION",
    message: "secret",
  }).code,
  "UNKNOWN_ERROR",
);
assert.equal(
  decodeMemberResult({
    state: "error",
    code: "VALIDATION_ERROR",
    fields: { city: "private traceback" },
  }).fields.city,
  "Please check city and try again.",
);
for (const code of [
  "UNAUTHENTICATED",
  "EMAIL_NOT_VERIFIED",
  "ACCOUNT_SUSPENDED",
  "ACCOUNT_DEACTIVATED",
  "PROFILE_CONFLICT",
  "PROFILE_UNAVAILABLE",
])
  assert.equal(
    decodeMemberResult({ state: "error", code, profile }).profile,
    undefined,
  );
console.info(
  "FE-03 contract validation passed: optional/partial profiles, phone bounds, text lengths, emergency consistency, DTO whitelist, malformed results and restricted states.",
);
