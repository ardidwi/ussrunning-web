import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { loader } from "./frontend-loader.mjs";
import { loadMigrations, migrate } from "../scripts/database/migrations.mjs";
import { bootstrapSuperAdmin } from "../scripts/admin/bootstrap.mjs";

const pg = new PGlite({ extensions: { citext, pgcrypto } });
const query = async (text, params = []) => (await pg.query(text, params)).rows;
const transaction = statements => pg.transaction(async db => {
  const results = [];
  for (const { text, params } of statements) results.push((await db.query(text, params)).rows);
  return results;
});
const adapter = { query, transaction };
const sql = { query: (text, params = []) => ({ text, params }), transaction };
let current = null;
const load = loader({
  sharp: { default: sharp },
  "@/lib/db": { query, getSql: () => sql },
  "./account-provisioning": { getCurrentAccount: async () => current },
});
const { createMemberIdentityService, identityResult, normalizeAvatar, reviewMemberAvatar } = load("lib/member/identity-service.ts");
const { MemoryStorage } = load("lib/media/storage/memory-provider.ts");
const { getOwnMemberProfile } = load("lib/member/profile-actions.ts");
const { getOwnMemberCardPresentation } = load("lib/member/member-card-actions.ts");
const { registerCurrentAccountForEvent } = load("lib/registrations/registration-actions.ts");
const { getCurrentEventPass } = load("lib/passes/pass-actions.ts");
const { readAsset } = load("lib/media/media-repository.ts");
const storage = new MemoryStorage();
const delivery = [];
storage.deliveryUrl = async (key, visibility) => {
  delivery.push([key, visibility]);
  return "https://private-storage.example.test/temporary-photo?signed=synthetic";
};
const identity = createMemberIdentityService(storage);
const migrations = await loadMigrations(new URL("../database/migrations/", import.meta.url));

function actAs(account) {
  current = account ? { id: account.id, status: account.status, emailVerifiedAt: account.email_verified_at } : null;
}

async function fixture(role = "member", status = "active") {
  const [account] = await query(`INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at)
    VALUES($1,$2,$3,CASE WHEN $3='active' THEN now() END) RETURNING *`, [randomUUID(), `${randomUUID()}@fixture.invalid`, status]);
  await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2", [account.id, role]);
  await query(`INSERT INTO uss.member_profiles(account_id,full_name,phone,emergency_contact_name,emergency_contact_phone)
    VALUES($1,'Synthetic Runner','+12025550100','Synthetic Contact','+12025550101')`, [account.id]);
  return account;
}

async function fixtureImage() {
  return await sharp({ create: { width: 720, height: 640, channels: 3, background: "#123456" } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
}

async function payload(bytes, mime = "image/jpeg", version) {
  const result = await getOwnMemberProfile();
  assert.equal(result.ok, true);
  const form = new FormData();
  form.set("version", version ?? result.data.profile.version);
  form.set("photo", new File([bytes], "camera.jpg", { type: mime }));
  return form;
}

const avatarRecord = async id => (await query(`SELECT p.avatar_status,p.avatar_rejection_reason,m.*
  FROM uss.member_profiles p LEFT JOIN uss.media_assets m ON m.id=p.avatar_media_id WHERE p.account_id=$1`, [id]))[0];

before(async () => {
  await migrate(adapter, migrations.filter(item => item.version < "020"));
});
after(() => pg.close());

test("020 backfills old accounts and keeps their audit/concurrency and opaque identifiers", async () => {
  const legacy = await fixture();
  await migrate(adapter, migrations);
  const [row] = await query("SELECT *,uss.format_member_number(member_number) formatted FROM uss.accounts WHERE id=$1", [legacy.id]);
  assert.match(row.formatted, /^USS-\d{6,}$/);
  for (const key of ["id", "member_id", "barcode_value", "version", "email"]) assert.equal(row[key], legacy[key]);
  assert.equal(Date.parse(row.updated_at), Date.parse(legacy.updated_at));
  const newer = await fixture();
  assert.notEqual(row.member_number, newer.member_number);
  await assert.rejects(query("UPDATE uss.accounts SET member_number=member_number+100 WHERE id=$1", [legacy.id]), { code: "23514" });
  assert.equal((await query("SELECT uss.format_member_number(1234567) AS formatted"))[0].formatted, "USS-1234567");
});

test("bootstrap checks lifecycle, permits a single concurrent winner and is idempotent", async () => {
  assert.equal(await bootstrapSuperAdmin(query, "missing@fixture.invalid"), "ROLE_TARGET_NOT_FOUND");
  assert.equal(await bootstrapSuperAdmin(query, (await fixture("member", "pending_verification")).email), "ROLE_TARGET_INELIGIBLE");
  const a = await fixture(), b = await fixture();
  const result = await Promise.all([bootstrapSuperAdmin(query, a.email.toUpperCase()), bootstrapSuperAdmin(query, b.email)]);
  assert.deepEqual([...result].sort(), ["OK", "ROLE_BOOTSTRAP_CLOSED"]);
  const winner = result[0] === "OK" ? a : b;
  assert.equal(await bootstrapSuperAdmin(query, winner.email), "ALREADY_BOOTSTRAPPED");
  assert.equal((await query("SELECT count(*)::int total FROM uss.audit_logs WHERE action='role.bootstrap'"))[0].total, 1);
  await pg.exec("CREATE ROLE bootstrap_runtime_test NOLOGIN");
  await pg.exec(readFileSync("database/runtime-grants.sql", "utf8").replaceAll(':"app_role"', '"bootstrap_runtime_test"'));
  await pg.exec("SET ROLE bootstrap_runtime_test");
  try {
    await assert.rejects(bootstrapSuperAdmin(query, winner.email), { code: "42501" });
    await query("INSERT INTO uss.accounts(auth_provider_user_id,email) VALUES($1,$2)", [randomUUID(), "runtime@fixture.invalid"]);
  } finally {
    await pg.exec("RESET ROLE");
  }
});

test("upload decodes, normalizes, strips metadata, writes privately and cannot be reused through CMS", async () => {
  const member = await fixture();
  actAs(member);
  const bytes = await fixtureImage();
  const request = await payload(bytes);
  const result = await identityResult(() => identity.uploadOwnAvatar(request));
  assert.equal(result.ok, true, JSON.stringify(result));
  const row = await avatarRecord(member.id);
  assert.equal(row.purpose, "member_avatar");
  assert.equal(row.avatar_status, "approved");
  assert.equal(row.public_url, null);
  assert.equal(row.visibility, "private");
  assert.deepEqual(delivery.at(-1), [row.storage_key, "private"]);
  const actual = await sharp(storage.readForTest(row.storage_key)).metadata();
  assert.equal(actual.format, "webp");
  assert.equal(actual.width, 512);
  assert.equal(actual.height, 512);
  assert.equal(actual.exif, undefined);
  assert.equal(actual.xmp, undefined);
  assert.equal((await getOwnMemberCardPresentation()).ok, true);
  assert.equal((await readAsset(row.id, (await fixture("admin")).id)).data, null);
  assert.equal((await readAsset(row.id)).data, null);
  assert.equal((await identityResult(() => identity.uploadOwnAvatar(request))).code, "AVATAR_CONFLICT");
  const audit = await query("SELECT action FROM uss.audit_logs WHERE entity_id=$1 AND action LIKE 'member.avatar.%'", [member.id]);
  assert.deepEqual(audit.map(item => item.action).sort(), ["member.avatar.requested", "member.avatar.uploaded"]);
});

test("invalid, misleading, oversized and undersized images do not pass normalization", async () => {
  const valid = await fixtureImage();
  const tiny = await sharp({ create: { width: 20, height: 20, channels: 3, background: "white" } }).jpeg().toBuffer();
  for (const [bytes, mime] of [[valid, "image/png"], [valid, "image/svg+xml"], [tiny, "image/jpeg"],
    [new Uint8Array(900_001), "image/jpeg"], [new Uint8Array([255, 216, 255]), "image/jpeg"]]) {
    await assert.rejects(normalizeAvatar(new File([bytes], "photo", { type: mime })), { code: "AVATAR_INVALID" });
  }
});

test("failed storage leaves profile unchanged and invalid uploads consume a bounded quota", async () => {
  const member = await fixture();
  actAs(member);
  const unavailable = createMemberIdentityService({ ...storage, put: async () => { throw Error("storage failure"); } });
  const valid = await payload(await fixtureImage());
  assert.equal((await identityResult(() => unavailable.uploadOwnAvatar(valid))).code, "AVATAR_UNAVAILABLE");
  const invalid = await payload(new Uint8Array([1, 2, 3]));
  for (let i = 0; i < 5; i++) assert.equal((await identityResult(() => identity.uploadOwnAvatar(invalid))).code, "AVATAR_INVALID");
  assert.equal((await identityResult(() => identity.uploadOwnAvatar(valid))).code, "IDENTITY_RATE_LIMITED");
  assert.equal((await avatarRecord(member.id)).id, null);
  assert.equal((await getOwnMemberCardPresentation()).code, "PROFILE_INCOMPLETE");
});

test("staff moderation requires a reason, protects stale replacements and disables member entry points", async () => {
  const member = await fixture(), staff = await fixture("admin");
  actAs(member);
  const image = await fixtureImage();
  const upload = async () => {
    const photo = await payload(image);
    assert.equal((await identityResult(() => identity.uploadOwnAvatar(photo))).ok, true);
    return (await avatarRecord(member.id)).id;
  };
  const previous = await upload(), avatarId = await upload();
  const reject = { accountId: member.id, avatarId, decision: "rejected", reason: "Use a well-lit photo." };
  assert.equal((await identityResult(() => reviewMemberAvatar(reject))).code, "INSUFFICIENT_PERMISSION");
  actAs(staff);
  assert.equal((await identityResult(() => reviewMemberAvatar({ ...reject, reason: " " }))).code, "PHOTO_REVIEW_INVALID");
  assert.equal((await identityResult(() => reviewMemberAvatar({ ...reject, avatarId: previous }))).code, "AVATAR_CONFLICT");
  assert.equal((await identityResult(() => reviewMemberAvatar(reject))).ok, true);
  assert.equal((await avatarRecord(member.id)).avatar_rejection_reason, reject.reason);
  const [event] = await query("INSERT INTO uss.events(slug,title,starts_at) VALUES($1,'Synthetic Event',now()) RETURNING id", [randomUUID()]);
  const [registration] = await query("INSERT INTO uss.event_registrations(event_id,account_id) VALUES($1,$2) RETURNING id", [event.id, member.id]);
  actAs(member);
  assert.equal((await getOwnMemberCardPresentation()).code, "PROFILE_INCOMPLETE");
  assert.equal((await registerCurrentAccountForEvent({ eventId: event.id })).code, "PROFILE_INCOMPLETE");
  assert.equal((await getCurrentEventPass({ eventId: event.id, registrationId: registration.id })).code, "PROFILE_INCOMPLETE");
  actAs(staff);
  assert.equal((await identityResult(() => reviewMemberAvatar({ accountId: member.id, avatarId, decision: "approved" }))).ok, true);
  actAs(member);
  assert.equal((await getOwnMemberCardPresentation()).ok, true);
  assert.equal((await avatarRecord(member.id)).avatar_rejection_reason, null);
});

test("scanner authorizes staff, isolates DTO, and audits hits and misses without barcode values", async () => {
  const member = await fixture(), staff = await fixture("admin");
  actAs(member);
  const form = await payload(await fixtureImage());
  assert.equal((await identityResult(() => identity.uploadOwnAvatar(form))).ok, true);
  assert.equal((await identityResult(() => identity.lookupMember(member.barcode_value))).code, "INSUFFICIENT_PERMISSION");
  actAs(staff);
  const scan = value => identityResult(() => identity.lookupMember(value));
  const result = await scan(member.barcode_value);
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.data).sort(), ["memberId", "name", "photo", "status"]);
  assert.match(result.data.photo, /^https:\/\/private-storage\.example\.test\//);
  assert.equal((await scan(result.data.memberId)).code, "BARCODE_INVALID");
  assert.equal((await scan(`USS-${randomUUID().toUpperCase()}`)).code, "MEMBER_NOT_FOUND");
  for (let i = 0; i < 27; i++) await scan("invalid");
  assert.equal((await scan(member.barcode_value)).code, "IDENTITY_RATE_LIMITED");
  const audits = await query("SELECT change_summary FROM uss.audit_logs WHERE actor_account_id=$1", [staff.id]);
  assert.equal(audits.length, 30);
  assert.ok(audits.every(row => Object.keys(row.change_summary).join() === "outcome"));
  assert.ok(!JSON.stringify(audits).includes(member.barcode_value));
});

test("bootstrap refuses a new grant once any verified active super_admin exists", async () => {
  const existing = await fixture("super_admin"), candidate = await fixture();
  assert.ok(existing.id);
  const before = (await query("SELECT count(*)::int total FROM uss.audit_logs WHERE action='role.bootstrap'"))[0].total;
  assert.equal(await bootstrapSuperAdmin(query, candidate.email), "ROLE_BOOTSTRAP_CLOSED");
  assert.equal((await query(`SELECT count(*)::int total FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
    WHERE ar.account_id=$1 AND r.code='super_admin'`, [candidate.id]))[0].total, 0);
  assert.equal((await query("SELECT count(*)::int total FROM uss.audit_logs WHERE action='role.bootstrap'"))[0].total, before);
});

test("normalization strips EXIF and XMP GPS location data from camera photos", async () => {
  const gps = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
    '<rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="6,10.0S" exif:GPSLongitude="106,49.0E"/>' +
    "</rdf:RDF></x:xmpmeta>";
  const bytes = await sharp({ create: { width: 800, height: 900, channels: 3, background: "#345678" } })
    .withExif({ IFD0: { Make: "SyntheticPhone", Model: "GPS Fixture" }, IFD3: { GPSLatitudeRef: "S", GPSLongitudeRef: "E" } })
    .withXmp(gps).jpeg().toBuffer();
  const input = await sharp(bytes).metadata();
  assert.ok(input.exif?.length, "fixture must carry EXIF");
  assert.ok(input.xmp?.toString().includes("GPSLatitude"), "fixture must carry XMP GPS");
  const output = await normalizeAvatar(new File([bytes], "camera.jpg", { type: "image/jpeg" }));
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.exif, undefined);
  assert.equal(meta.xmp, undefined);
  const raw = Buffer.from(output).toString("latin1");
  for (const marker of ["GPS", "SyntheticPhone", "Exif", "xmpmeta"]) assert.ok(!raw.includes(marker), marker);
});

test("downloadable card data carries no email, phone or emergency contact", async () => {
  const member = await fixture();
  actAs(member);
  const photo = await payload(await fixtureImage());
  assert.equal((await identityResult(() => identity.uploadOwnAvatar(photo))).ok, true);
  const card = await getOwnMemberCardPresentation();
  assert.equal(card.ok, true);
  assert.deepEqual(Object.keys(card.data).sort(), ["avatar", "barcode", "displayName", "memberId", "status"]);
  assert.match(card.data.memberId, /^USS-\d{6,}$/);
  const serialized = JSON.stringify(card);
  for (const secret of [member.email, "+12025550100", "+12025550101", "Synthetic Contact"]) assert.ok(!serialized.includes(secret), secret);
  const source = readFileSync("features/member-card/utils/download-card.ts", "utf8");
  const fields = new Set([...source.matchAll(/(?<![-\w])card\.(\w+)/g)].map(match => match[1]));
  assert.deepEqual([...fields].sort(), ["avatar", "barcode", "displayName", "memberId"]);
  assert.ok(!/email|phone|emergency/i.test(source));
});
