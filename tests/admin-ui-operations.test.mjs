import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { loader } from "./frontend-loader.mjs";
import { loadMigrations, migrate } from "../scripts/database/migrations.mjs";
import { completeMemberFixture } from "./member-identity-fixtures.mjs";

// Admin UI lane (D2.1–D2.4, D2.8, manual Member ID lookup): authorization, validation and failure paths.
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
const overrides = (db = { query, getSql: () => sql }) => ({
  "@/lib/db": db,
  "./account-provisioning": { getCurrentAccount: async () => current },
});
const load = loader(overrides());
const policy = load("lib/authz/permissions.ts");
const users = load("lib/admin-users/user-service.ts");
const userActions = load("lib/admin-users/user-actions.ts");
const roleActions = load("lib/admin-roles/role-actions.ts");
const { maskEmail } = load("lib/admin-users/email-mask.ts");
const { createAvatarQueueService } = load("lib/admin-users/avatar-queue-service.ts");
const queueActions = load("lib/admin-users/avatar-queue-actions.ts");
const { readAdminOverview } = load("lib/admin-users/admin-overview.ts");
const { createMemberIdentityService, identityResult, reviewMemberAvatar } = load("lib/member/identity-service.ts");
const identityActions = load("lib/member/identity-actions.ts");
const { parseMemberIdInput } = load("lib/member/member-id-contract.ts");
const { MemoryStorage } = load("lib/media/storage/memory-provider.ts");
const storage = new MemoryStorage();
storage.deliveryUrl = async () => "https://private-storage.example.test/avatar?signed=synthetic";
const queue = createAvatarQueueService(storage);
const identity = createMemberIdentityService(storage);
const migrations = await loadMigrations(new URL("../database/migrations/", import.meta.url));
const code = expected => error => error.code === expected;

async function account(role = "member", status = "active", name = "Directory Runner") {
  const [a] = await query(`INSERT INTO uss.accounts(auth_provider_user_id,email,display_name,status,email_verified_at)
    VALUES($1,$2,$3,$4,CASE WHEN $4 IN ('active','suspended') THEN now() END) RETURNING *`,
  [randomUUID(), `${randomUUID()}@runner-mail.test`, name, status]);
  await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2", [a.id, role]);
  return a;
}
const as = a => { current = a ? { id: a.id, status: a.status, email: a.email, emailVerifiedAt: a.email_verified_at } : null; };
const formatted = async a => (await query("SELECT uss.format_member_number(member_number) id FROM uss.accounts WHERE id=$1", [a.id]))[0].id;
let root;
before(async () => {
  await migrate(adapter, migrations);
  root = await account("super_admin", "active", "Root Operator");
});
after(() => pg.close());

test("members.read is granted to admin and super_admin only; users.manage stays super_admin", () => {
  assert.deepEqual(policy.rolesForPermission("members.read"), ["admin", "super_admin"]);
  assert.deepEqual(policy.rolesForPermission("users.manage"), ["super_admin"]);
  assert.equal(policy.hasPermission(["member"], "members.read"), false);
});

test("email mask is fixed width and keeps no full local part or domain", () => {
  assert.equal(maskEmail("runner.name@example.com"), "r•••@e•••.com");
  assert.equal(maskEmail("a@b.co.id"), "a•••@b•••.id");
  assert.equal(maskEmail("broken"), "•••");
  assert.equal(maskEmail("x@localhost"), "x•••@l•••");
});

test("admin directory is restricted: masked email, no contact data, no version, no email search", async () => {
  const target = await account("member", "active", "Restricted Lookup");
  await completeMemberFixture(query, target.id);
  as(await account("admin"));
  const page = await users.listMemberDirectory({ search: "Restricted Lookup" });
  assert.equal(page.view, "restricted");
  const entry = page.items.find(item => item.id === target.id);
  assert.ok(entry);
  assert.deepEqual(Object.keys(entry).sort(), ["createdAt", "displayName", "emailMasked", "emailVerified", "id", "lastLoginAt", "memberId", "profile", "roles", "status", "view"]);
  assert.deepEqual(Object.keys(entry.profile).sort(), ["city", "exists", "fullName"]);
  const json = JSON.stringify(page);
  for (const secret of [target.email, target.email.split("@")[0], "+12025550100", "+12025550101", "Synthetic Contact", target.barcode_value])
    assert.ok(!json.includes(secret), secret);
  assert.deepEqual((await users.listMemberDirectory({ search: target.email })).items, [], "exact email is not an admin lookup oracle");
  const detail = await users.getMemberDirectoryEntry({ id: target.id });
  assert.equal(detail.member.view, "restricted");
  assert.equal(detail.isSelf, false);
  assert.ok(!JSON.stringify(detail).includes(target.email));
  assert.ok(!("version" in detail.member));
});

test("super_admin keeps the full managed view including email and version", async () => {
  const target = await account();
  as(root);
  const page = await users.listMemberDirectory({ search: target.email.toUpperCase() });
  assert.equal(page.view, "full");
  assert.deepEqual(page.items.map(item => [item.id, item.email]), [[target.id, target.email]]);
  const detail = await users.getMemberDirectoryEntry({ id: root.id });
  assert.equal(detail.isSelf, true);
  assert.equal(typeof detail.member.version, "number");
});

test("directory denies member, unauthenticated and restricted accounts", async () => {
  as(await account("member"));
  await assert.rejects(users.listMemberDirectory(), code("USER_FORBIDDEN"));
  assert.equal((await userActions.getMemberDirectoryEntry({ id: root.id })).code, "USER_FORBIDDEN");
  as(null);
  assert.equal((await userActions.listMemberDirectory()).code, "UNAUTHENTICATED");
  as(await account("admin", "suspended"));
  assert.equal((await userActions.listMemberDirectory()).code, "ACCOUNT_SUSPENDED");
});

test("directory validates filters and refuses cross-filter cursors", async () => {
  as(await account("admin"));
  for (const input of [{ search: "ab" }, { status: "banned" }, { limit: 500 }, { accountId: root.id }, { cursor: "%%" }])
    assert.equal((await userActions.listMemberDirectory(input)).code, "USER_SEARCH_INVALID");
  assert.equal((await userActions.getMemberDirectoryEntry({ id: "not-a-uuid" })).code, "USER_SEARCH_INVALID");
  assert.equal((await userActions.getMemberDirectoryEntry({ id: randomUUID() })).code, "USER_NOT_FOUND");
});

test("admin with members.read still cannot change status or roles", async () => {
  const target = await account();
  as(await account("admin"));
  const input = { id: target.id, expectedVersion: 1, reason: "Attempted admin escalation" };
  assert.equal((await userActions.suspendUser(input)).code, "USER_FORBIDDEN");
  assert.equal((await roleActions.grantManagedRole({ ...input, role: "admin" })).code, "ROLE_FORBIDDEN");
  assert.equal((await query("SELECT status FROM uss.accounts WHERE id=$1", [target.id]))[0].status, "active");
});

test("DB authority for the restricted scope rejects a member actor even with a forged scope", async () => {
  const repo = load("lib/admin-users/user-repository.ts"), validation = load("lib/admin-users/user-validation.ts");
  const member = await account();
  await assert.rejects(repo.listUsers(member.id, validation.userFilters({}), { roles: ["admin", "super_admin"], emailSearch: false }), code("USER_FORBIDDEN"));
});

async function avatarFor(name) {
  const member = await account("member", "active", name);
  await completeMemberFixture(query, member.id);
  const avatarId = (await query("SELECT avatar_media_id id FROM uss.member_profiles WHERE account_id=$1", [member.id]))[0].id;
  return { member, avatarId };
}

test("avatar queue: authorization, FIFO paging, approve/reject leave the queue, reject reopens onboarding", async () => {
  const before = (await (as(root), queue.countAvatarReviewQueue()));
  const first = await avatarFor("Queue First"), second = await avatarFor("Queue Second"), third = await avatarFor("Queue Third");
  as(await account("member"));
  await assert.rejects(queue.listAvatarReviewQueue(), code("USER_FORBIDDEN"));
  as(null);
  assert.equal((await queueActions.listAvatarReviewQueue()).code, "UNAUTHENTICATED");
  const staff = await account("admin");
  as(staff);
  assert.equal(await queue.countAvatarReviewQueue(), before + 3);
  const page = await queue.listAvatarReviewQueue({ limit: 1 });
  assert.match(page.items[0].photo, /^https:\/\/private-storage\.example\.test\//);
  assert.deepEqual(Object.keys(page.items[0]).sort(), ["accountId", "avatarId", "memberId", "name", "photo", "status", "uploadedAt"]);
  assert.ok(!JSON.stringify(page).includes(first.member.email));
  assert.ok(page.nextCursor);
  const ids = [page.items[0].accountId];
  let cursor = page.nextCursor;
  while (cursor) { const next = await queue.listAvatarReviewQueue({ limit: 2, cursor }); ids.push(...next.items.map(i => i.accountId)); cursor = next.nextCursor; }
  assert.equal(new Set(ids).size, ids.length, "no duplicates across pages");
  assert.deepEqual([first, second, third].map(item => ids.indexOf(item.member.id)).every((at, i, all) => at >= 0 && (i === 0 || at > all[i - 1])), true, "oldest upload first");

  assert.equal((await identityResult(() => reviewMemberAvatar({ accountId: first.member.id, avatarId: first.avatarId, decision: "approved" }))).ok, true);
  assert.equal((await identityResult(() => reviewMemberAvatar({ accountId: second.member.id, avatarId: second.avatarId, decision: "rejected", reason: "x" }))).code, "PHOTO_REVIEW_INVALID");
  assert.equal((await identityResult(() => reviewMemberAvatar({ accountId: second.member.id, avatarId: second.avatarId, decision: "rejected", reason: "Face is not visible." }))).ok, true);
  assert.equal(await queue.countAvatarReviewQueue(), before + 1);
  const remaining = (await queue.listAvatarReviewQueue({ limit: 60 })).items.map(i => i.accountId);
  assert.ok(!remaining.includes(first.member.id) && !remaining.includes(second.member.id) && remaining.includes(third.member.id));
  assert.deepEqual((await query("SELECT uss.member_profile_missing($1) missing", [second.member.id]))[0].missing, ["avatar"]);
});

test("avatar queue rejects malformed paging input", async () => {
  as(await account("admin"));
  for (const input of [{ limit: 0 }, { limit: 61 }, { limit: "5" }, { cursor: "!!" }, { cursor: Buffer.from('{"at":"x","id":"y"}').toString("base64url") }, { extra: true }, []])
    await assert.rejects(queue.listAvatarReviewQueue(input), code("USER_SEARCH_INVALID"));
});

test("overview returns real counts for staff, hides metrics without permission", async () => {
  await query("INSERT INTO uss.events(slug,title,starts_at,status) VALUES($1,'Upcoming Run',now()+interval '3 days','published'),($2,'Past Run',now()-interval '3 days','published'),($3,'Draft Run',now()+interval '3 days','draft')", [randomUUID(), randomUUID(), randomUUID()]);
  const pending = await account("member", "pending_verification");
  assert.ok(pending.id);
  as(await account("admin"));
  const overview = await readAdminOverview();
  assert.equal(overview.membersByStatus.state, "ok");
  const totals = (await query("SELECT status, count(*)::int n FROM uss.accounts GROUP BY status")).reduce((all, r) => ({ ...all, [r.status]: r.n }), {});
  for (const status of ["pending_verification", "active", "suspended", "deactivated"]) assert.equal(overview.membersByStatus.value[status], totals[status] ?? 0);
  assert.deepEqual(overview.upcomingEvents, { state: "ok", value: 1 });
  assert.equal(overview.avatarQueue.state, "ok");
  assert.deepEqual(overview.failedNotifications, { state: "ok", value: 0 });
  as(await account("member"));
  assert.deepEqual(Object.values(await readAdminOverview()).map(m => m.state), ["hidden", "hidden", "hidden", "hidden"]);
  as(null);
  await assert.rejects(readAdminOverview(), code("UNAUTHENTICATED"));
});

test("overview degrades a missing table to unavailable without failing other metrics", async () => {
  const failing = async (text, params) => {
    if (text.includes("uss.notification_deliveries")) throw Object.assign(new Error('relation "uss.notification_deliveries" does not exist'), { code: "42P01" });
    return query(text, params);
  };
  const isolated = loader(overrides({ query: failing, getSql: () => sql }));
  as(root);
  const errors = console.error;
  console.error = () => {};
  try {
    const overview = await isolated("lib/admin-users/admin-overview.ts").readAdminOverview();
    assert.deepEqual(overview.failedNotifications, { state: "unavailable" });
    assert.equal(overview.membersByStatus.state, "ok");
    assert.equal(overview.upcomingEvents.state, "ok");
  } finally { console.error = errors; }
});

test("Member ID parsing is strict: case, dash and zero padding are the only accepted variations", () => {
  for (const [input, expected] of [["USS-000123", "123"], ["uss-000123", "123"], ["USS000123", "123"], ["uss123", "123"], [" USS-123 ", "123"],
    ["USS-9223372036854775807", "9223372036854775807"]]) assert.equal(parseMemberIdInput(input), expected, input);
  for (const input of ["", "123", "USS-", "USS-0", "USS-000000", "USS--123", "USS 123", "US-123", "USS-12A", "USS-１２３", "USS-9223372036854775808",
    "USS-99999999999999999999", `USS-${randomUUID()}`, "USS-123;DROP", null, 123, "U".repeat(41)]) assert.equal(parseMemberIdInput(input), null, String(input));
});

test("manual Member ID lookup returns the scanner DTO and is authorized like barcode lookup", async () => {
  const member = await account("member", "active", "Manual Entry Runner");
  await completeMemberFixture(query, member.id);
  const memberId = await formatted(member);
  as(member);
  assert.equal((await identityResult(() => identity.lookupMemberById(memberId))).code, "INSUFFICIENT_PERMISSION");
  as(null);
  assert.equal((await identityActions.lookupMemberId(memberId)).code, "UNAUTHENTICATED");
  as(await account("admin", "suspended"));
  assert.equal((await identityActions.lookupMemberId(memberId)).code, "ACCOUNT_SUSPENDED");
  as(await account("admin"));
  for (const variant of [memberId, memberId.toLowerCase(), memberId.replace("-", ""), `USS-${Number(memberId.slice(4))}`]) {
    const result = await identityResult(() => identity.lookupMemberById(variant));
    assert.equal(result.ok, true, variant);
    assert.deepEqual(Object.keys(result.data).sort(), ["memberId", "name", "photo", "status"]);
    assert.equal(result.data.memberId, memberId);
  }
  assert.equal((await identityResult(() => identity.lookupMemberById("USS-12A"))).code, "MEMBER_ID_INVALID");
  assert.equal((await identityResult(() => identity.lookupMemberById("USS-999999999"))).code, "MEMBER_NOT_FOUND");
});

test("manual lookups share the barcode 30/minute quota and audit without the entered value", async () => {
  const member = await account();
  await completeMemberFixture(query, member.id);
  const memberId = await formatted(member), staff = await account("admin");
  as(staff);
  for (let i = 0; i < 28; i++) await identityResult(() => identity.lookupMember(member.barcode_value));
  assert.equal((await identityResult(() => identity.lookupMemberById("not-a-member-id"))).code, "MEMBER_ID_INVALID");
  assert.equal((await identityResult(() => identity.lookupMemberById(memberId))).ok, true);
  const limited = await identityResult(() => identity.lookupMemberById(memberId));
  assert.equal(limited.code, "IDENTITY_RATE_LIMITED");
  assert.equal(limited.retryAfterSeconds, 60);
  assert.equal((await identityResult(() => identity.lookupMember(member.barcode_value))).code, "IDENTITY_RATE_LIMITED");
  const audits = await query("SELECT action, entity_id, change_summary FROM uss.audit_logs WHERE actor_account_id=$1 ORDER BY created_at", [staff.id]);
  assert.equal(audits.length, 30, "rate-limited attempts are not written");
  const manual = audits.filter(row => row.action === "member.id.looked_up");
  assert.deepEqual(manual.map(row => row.change_summary.outcome), ["invalid", "found"]);
  assert.equal(manual[1].entity_id, member.id);
  assert.ok(!JSON.stringify(audits).includes(memberId) && !JSON.stringify(audits).includes("not-a-member-id"));
});
