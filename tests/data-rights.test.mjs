// D1.6 data-subject rights: own-data export, deletion request lifecycle and audited erasure.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { loader } from "./frontend-loader.mjs";
import { loadMigrations, migrate } from "../scripts/database/migrations.mjs";

const pg = new PGlite({ extensions: { citext, pgcrypto } });
const query = async (text, params = []) => (await pg.query(text, params)).rows;
const transaction = (statements, options) => {
  assert.equal(options?.isolationLevel, "ReadCommitted");
  return pg.transaction(async db => {
    const results = [];
    for (const { text, params } of statements) results.push((await db.query(text, params)).rows);
    return results;
  });
};
const sql = { query: (text, params = []) => ({ text, params }), transaction };
let current = null;
const load = loader({
  "@/lib/db": { query, getSql: () => sql },
  "./account-provisioning": { getCurrentAccount: async () => current },
  "@/lib/media/storage/neon-s3-provider": { createConfiguredStorage: () => null, storageConfigFromEnv: () => null },
  "@/lib/auth/server": { isAuthConfigured: () => false, getAuth: () => { throw new Error("not configured"); } },
});
const { createDataRightsService } = load("lib/data-rights/data-rights-service.ts");
const { dataRightsResult } = load("lib/data-rights/data-rights-errors.ts");
const actions = load("lib/data-rights/data-rights-actions.ts");
const guards = load("lib/auth/guards.ts");

// Mocked adapters: signing, object deletion and provider sessions never reach real services.
const signed = [], erased = [], revoked = [];
let eraseFails = false;
const storage = { id: "memory-test", put: async () => {}, deliveryUrl: async key => { signed.push(key); return "https://private.example.test/photo?sig=short-lived"; } };
const eraser = { id: "memory-test", erase: async key => { if (eraseFails) throw new Error("provider down"); erased.push(key); } };
const sessions = { revokeAll: async id => { revoked.push(id); return "revoked"; } };
const service = createDataRightsService({ storage, eraser, sessions, now: () => new Date("2026-11-27T10:00:00.000Z") });

const migrations = await loadMigrations(new URL("../database/migrations/", import.meta.url));
const code = expected => error => { assert.equal(error.code, expected); return true; };
const actAs = account => { current = account ? { id: account.id, status: account.status, email: account.email, emailVerifiedAt: account.email_verified_at } : null; };
const row = async id => (await query("SELECT * FROM uss.accounts WHERE id=$1", [id]))[0];
const audits = async (action, entity) => (await query("SELECT * FROM uss.audit_logs WHERE action=$1 AND ($2::uuid IS NULL OR entity_id=$2) ORDER BY created_at", [action, entity ?? null]));

async function account(role = "member", status = "active") {
  const marker = randomUUID().slice(0, 8);
  const [a] = await query(`INSERT INTO uss.accounts(auth_provider_user_id,email,display_name,status,email_verified_at)
    VALUES($1,$2,$3,$4,CASE WHEN $4 IN ('active','suspended') THEN now() END) RETURNING *`,
    ["provider-" + marker, `runner-${marker}@example.test`, `Runner ${marker}`, status]);
  await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code='member'", [a.id]);
  if (role !== "member") await query("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2", [a.id, role]);
  return { ...a, marker };
}
/** A member with every exportable category populated, each value tagged with a unique marker. */
async function richMember(role = "member") {
  const a = await account(role);
  const m = a.marker;
  await query(`INSERT INTO uss.member_profiles(account_id,full_name,phone,city,emergency_contact_name,emergency_contact_phone,
    marketing_consent,marketing_consent_at,privacy_consent_at,instagram_handle)
    VALUES($1,$2,'+12025550100',$3,$4,'+12025550101',true,now(),now(),$5)`, [a.id, `Full ${m}`, `City ${m}`, `Contact ${m}`, `ig_${m}`]);
  const media = randomUUID();
  await query(`INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose,caption)
    VALUES($1,'memory-test',$2,'image/webp',100,512,512,$3,'member_avatar',$4)`, [media, `member-avatars/${media}.webp`, a.id, `caption ${m}`]);
  await query("UPDATE uss.member_profiles SET avatar_status='approved',avatar_media_id=$2 WHERE account_id=$1", [a.id, media]);
  const [past] = await query("INSERT INTO uss.events(slug,title,starts_at,status) VALUES($1,$2,now()-interval '10 days','registration_closed') RETURNING id", [`past-${m}`, `Past Run ${m}`]);
  const [future] = await query("INSERT INTO uss.events(slug,title,starts_at,status) VALUES($1,$2,now()+interval '10 days','registration_open') RETURNING id", [`future-${m}`, `Future Run ${m}`]);
  const [field] = await query("INSERT INTO uss.event_custom_fields(event_id,key,label,field_type) VALUES($1,'shirt','Shirt size','text') RETURNING id", [future.id]);
  const [r1] = await query("INSERT INTO uss.event_registrations(event_id,account_id,status,admin_note) VALUES($1,$2,'confirmed',$3) RETURNING id", [past.id, a.id, `note ${m}`]);
  const [r2] = await query("INSERT INTO uss.event_registrations(event_id,account_id,status) VALUES($1,$2,'confirmed') RETURNING id", [future.id, a.id]);
  await query("INSERT INTO uss.registration_field_values(registration_id,field_id,event_id,value) VALUES($1,$2,$3,$4)", [r2.id, field.id, future.id, JSON.stringify(`answer ${m}`)]);
  const hash = Buffer.from(randomUUID().replaceAll("-", "")).toString("hex").slice(0, 64).padEnd(64, "a");
  const [pass] = await query("INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2) RETURNING id", [r1.id, hash]);
  const hash2 = hash.split("").reverse().join("");
  await query("INSERT INTO uss.event_passes(registration_id,token_hash) VALUES($1,$2)", [r2.id, hash2]);
  await query("INSERT INTO uss.check_ins(registration_id,event_id,event_pass_id,checkpoint) VALUES($1,$2,$3,'start')", [r1.id, past.id, pass.id]);
  return { ...a, media, past: past.id, future: future.id, r1: r1.id, r2: r2.id, pass: pass.id, hash };
}

let root;
before(async () => {
  await migrate({ query, transaction: s => pg.transaction(async tx => { for (const q of s) await tx.query(q.text, q.params); }) }, migrations);
  root = await account("super_admin");
});
after(async () => pg.close());

// ---------- export ----------
test("member export contains only own data across every category", async () => {
  const me = await richMember(), other = await richMember();
  actAs(me);
  const { data, filename } = await service.exportOwnData();
  assert.equal(filename, "uss-running-data-2026-11-27.json");
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.account.email, me.email);
  assert.match(data.account.memberId, /^USS-\d{6,}$/);
  assert.deepEqual(data.account.roles, ["member"]);
  assert.equal(data.profile.fullName, `Full ${me.marker}`);
  assert.equal(data.consents.marketing, true);
  assert.ok(data.consents.privacyConsentAt);
  assert.equal(data.avatar.id, me.media);
  assert.equal(data.avatar.temporaryUrl, "https://private.example.test/photo?sig=short-lived");
  assert.equal(data.registrations.length, 2);
  assert.ok(data.registrations.some(r => r.answers.some(x => x.value === `answer ${me.marker}`)));
  assert.equal(data.attendance.length, 1);
  assert.equal(data.passes.length, 2);
  assert.ok(data.notifications.length >= 2, "registration notification intents addressed to the member are exported");
  assert.ok(data.notifications.every(n => n.recipient === me.email));
  const json = JSON.stringify(data);
  for (const leaked of [other.marker, other.email, other.id, "member-avatars/", me.hash, me.barcode_value, me.auth_provider_user_id,
    "storageKey", "token_hash", "tokenHash", `note ${me.marker}`, "checked_in_by", "decided_by", root.id])
    assert.ok(!json.includes(leaked), `export must not include ${leaked}`);
  assert.equal((await audits("data_rights.export.generated", me.id)).length, 1);
});

test("export isolation: each member only ever receives their own records", async () => {
  const a = await richMember(), b = await richMember();
  actAs(a); const ea = JSON.stringify((await service.exportOwnData()).data);
  actAs(b); const eb = JSON.stringify((await service.exportOwnData()).data);
  for (const v of [b.marker, b.email, b.r1, b.r2, b.pass, b.media]) assert.ok(!ea.includes(v));
  for (const v of [a.marker, a.email, a.r1, a.r2, a.pass, a.media]) assert.ok(!eb.includes(v));
});

test("export cannot be redirected to another account via repository authority", async () => {
  const victim = await richMember(), suspended = await account("member", "suspended");
  const repo = load("lib/data-rights/data-rights-repository.ts");
  const out = await repo.exportOwnData(suspended.id, ["member"]);
  assert.equal(out.out_code, "DATA_RIGHTS_FORBIDDEN");
  assert.equal(out.out_data, null);
  assert.ok(!JSON.stringify(out).includes(victim.marker));
});

test("export is rate limited per account and audited", async () => {
  const me = await account(); actAs(me);
  for (let i = 0; i < 3; i++) await service.exportOwnData();
  await assert.rejects(service.exportOwnData(), code("DATA_RIGHTS_RATE_LIMITED"));
  assert.equal((await audits("data_rights.export.generated", me.id)).length, 3);
  const other = await account(); actAs(other);
  await service.exportOwnData();
});

test("export authorization: unauthenticated, unverified, suspended and deactivated are denied", async () => {
  actAs(null);
  assert.deepEqual(await dataRightsResult(() => service.exportOwnData()), { ok: false, code: "UNAUTHENTICATED" });
  for (const [status, expected] of [["pending_verification", "EMAIL_NOT_VERIFIED"], ["suspended", "ACCOUNT_SUSPENDED"], ["deactivated", "ACCOUNT_DEACTIVATED"]]) {
    actAs(await account("member", status));
    assert.deepEqual(await dataRightsResult(() => service.exportOwnData()), { ok: false, code: expected });
  }
});

test("admin and super_admin export only their own data too", async () => {
  const admin = await richMember("admin"), member = await richMember();
  actAs(admin);
  const json = JSON.stringify((await service.exportOwnData()).data);
  assert.ok(json.includes(admin.marker));
  assert.ok(!json.includes(member.marker));
});

// ---------- request lifecycle (member) ----------
test("member requests deletion with typed email confirmation and optional reason", async () => {
  const me = await account(); actAs(me);
  await assert.rejects(service.requestOwnDeletion({ confirmEmail: "wrong@example.test" }), code("DATA_RIGHTS_CONFIRMATION_MISMATCH"));
  const req = await service.requestOwnDeletion({ confirmEmail: me.email.toUpperCase(), reason: "  Moving away  " });
  assert.equal(req.status, "pending");
  assert.equal(req.reason, "Moving away");
  const status = await service.getOwnDeletionStatus();
  assert.equal(status.current.id, req.id);
  assert.equal(status.canRequest, false);
  const [audit] = await audits("data_rights.deletion.requested", req.id);
  assert.equal(audit.actor_account_id, me.id);
  assert.equal(audit.change_summary.hasReason, true);
  assert.ok(!JSON.stringify(audit).includes("Moving away"), "free-text reason is not copied into audit");
});

test("only one open request; double submit yields one request", async () => {
  const me = await account(); actAs(me);
  const out = await Promise.allSettled([service.requestOwnDeletion({ confirmEmail: me.email }), service.requestOwnDeletion({ confirmEmail: me.email })]);
  assert.equal(out.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(out.find(x => x.status === "rejected").reason.code, "DATA_RIGHTS_REQUEST_OPEN");
  await assert.rejects(service.requestOwnDeletion({ confirmEmail: me.email }), code("DATA_RIGHTS_REQUEST_OPEN"));
  assert.equal((await query("SELECT count(*)::int n FROM uss.data_deletion_requests WHERE account_id=$1", [me.id]))[0].n, 1);
});

test("request input is closed-shape and bounded", async () => {
  const me = await account(); actAs(me);
  for (const input of [undefined, {}, { confirmEmail: me.email, accountId: root.id }, { confirmEmail: me.email, status: "approved" },
    { confirmEmail: me.email, reason: "<script>alert(1)</script>" }, { confirmEmail: me.email, reason: "a".repeat(501) },
    { confirmEmail: 42 }, "string", [me.email]])
    await assert.rejects(service.requestOwnDeletion(input), code("DATA_RIGHTS_INVALID_INPUT"));
});

test("member cancels own pending request; invalid and foreign cancels are rejected", async () => {
  const me = await account(), other = await account();
  actAs(other); const foreign = await service.requestOwnDeletion({ confirmEmail: other.email });
  actAs(me); const mine = await service.requestOwnDeletion({ confirmEmail: me.email });
  await assert.rejects(service.cancelOwnDeletion({ id: foreign.id, expectedVersion: foreign.version }), code("DATA_RIGHTS_NOT_FOUND"));
  await assert.rejects(service.cancelOwnDeletion({ id: mine.id, expectedVersion: mine.version + 5 }), code("DATA_RIGHTS_CONFLICT"));
  const cancelled = await service.cancelOwnDeletion({ id: mine.id, expectedVersion: mine.version });
  assert.equal(cancelled.status, "cancelled");
  await assert.rejects(service.cancelOwnDeletion({ id: mine.id, expectedVersion: cancelled.version }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  assert.equal((await audits("data_rights.deletion.cancelled", mine.id)).length, 1);
  assert.equal((await service.getOwnDeletionStatus()).canRequest, true);
  actAs(other);
  assert.equal((await service.getOwnDeletionStatus()).current.status, "pending", "foreign request untouched");
});

test("submissions are rate limited per 24 hours", async () => {
  const me = await account(); actAs(me);
  for (let i = 0; i < 3; i++) {
    const r = await service.requestOwnDeletion({ confirmEmail: me.email });
    await service.cancelOwnDeletion({ id: r.id, expectedVersion: r.version });
  }
  await assert.rejects(service.requestOwnDeletion({ confirmEmail: me.email }), code("DATA_RIGHTS_RATE_LIMITED"));
});

test("member request actions deny unauthenticated and restricted accounts", async () => {
  actAs(null);
  assert.equal((await actions.getOwnDeletionStatus()).code, "UNAUTHENTICATED");
  assert.equal((await actions.requestOwnDeletion({ confirmEmail: "x@example.test" })).code, "UNAUTHENTICATED");
  actAs(await account("member", "suspended"));
  assert.equal((await actions.requestOwnDeletion({ confirmEmail: "x@example.test" })).code, "ACCOUNT_SUSPENDED");
});

// ---------- admin queue ----------
async function pendingFor(member) {
  actAs(member);
  const r = await service.requestOwnDeletion({ confirmEmail: member.email, reason: "Please remove me" });
  actAs(root);
  return r;
}
async function approvedFor(member) {
  const r = await pendingFor(member);
  return service.decideDeletionRequest({ id: r.id, expectedVersion: r.version, decision: "approve", reason: "Verified identity" });
}

test("member and admin cannot list, decide or execute; unauthenticated gets UNAUTHENTICATED", async () => {
  const subject = await account(), req = await pendingFor(subject);
  for (const role of ["member", "admin"]) {
    actAs(await account(role));
    await assert.rejects(service.listDeletionRequests(), code("DATA_RIGHTS_FORBIDDEN"));
    await assert.rejects(service.decideDeletionRequest({ id: req.id, expectedVersion: req.version, decision: "approve", reason: "Looks fine" }), code("DATA_RIGHTS_FORBIDDEN"));
    await assert.rejects(service.executeDeletionRequest({ id: req.id, expectedVersion: req.version, confirm: "ERASE" }), code("DATA_RIGHTS_FORBIDDEN"));
  }
  actAs(null);
  assert.equal((await actions.listDeletionRequests()).code, "UNAUTHENTICATED");
  assert.equal((await actions.executeDeletionRequest({ id: req.id, expectedVersion: 1, confirm: "ERASE" })).code, "UNAUTHENTICATED");
  assert.equal((await query("SELECT status FROM uss.data_deletion_requests WHERE id=$1", [req.id]))[0].status, "pending");
});

test("DB functions re-check authority even if the TS guard is bypassed", async () => {
  const subject = await account(), admin = await account("admin"), req = await pendingFor(subject);
  const [d] = await query("SELECT * FROM uss.decide_account_deletion($1,ARRAY['admin','super_admin'],$2,'approve',$3,'Forged roles')", [admin.id, req.id, req.version]);
  assert.equal(d.out_code, "DATA_RIGHTS_FORBIDDEN");
  const [x] = await query("SELECT * FROM uss.execute_account_deletion($1,$2,$3)", [admin.id, req.id, req.version]);
  assert.equal(x.out_code, "DATA_RIGHTS_FORBIDDEN");
  const [c] = await query("SELECT * FROM uss.cancel_account_deletion($1,ARRAY['member'],$2,$3)", [admin.id, req.id, req.version]);
  assert.equal(c.out_code, "DATA_RIGHTS_NOT_FOUND", "cannot cancel someone else's request");
});

test("super_admin lists the queue with status filter and stable cursor", async () => {
  for (let i = 0; i < 3; i++) await pendingFor(await account());
  actAs(root);
  const first = await service.listDeletionRequests({ status: "pending", limit: 2 });
  assert.equal(first.items.length, 2);
  assert.ok(first.nextCursor);
  assert.ok(first.items.every(i => i.status === "pending" && i.subject.memberId.startsWith("USS-")));
  const second = await service.listDeletionRequests({ status: "pending", limit: 2, cursor: first.nextCursor });
  assert.ok(second.items.every(i => !first.items.some(f => f.id === i.id)));
  await assert.rejects(service.listDeletionRequests({ status: "approved", cursor: first.nextCursor }), code("DATA_RIGHTS_INVALID_INPUT"));
  for (const bad of [{ status: "deleted" }, { limit: 0 }, { limit: 51 }, { cursor: "!!" }, { accountId: root.id }])
    await assert.rejects(service.listDeletionRequests(bad), code("DATA_RIGHTS_INVALID_INPUT"));
});

test("approve and reject require a reason and are audited; terminal states reject further transitions", async () => {
  const a = await account(), b = await account();
  const ra = await pendingFor(a), rb = await pendingFor(b);
  for (const reason of [undefined, "", "abc", "<b>no</b>", "x".repeat(501)])
    await assert.rejects(service.decideDeletionRequest({ id: ra.id, expectedVersion: ra.version, decision: "approve", reason }), code("DATA_RIGHTS_INVALID_INPUT"));
  await assert.rejects(service.decideDeletionRequest({ id: ra.id, expectedVersion: ra.version, decision: "delete", reason: "Valid reason" }), code("DATA_RIGHTS_INVALID_INPUT"));
  await assert.rejects(service.decideDeletionRequest({ id: ra.id, expectedVersion: ra.version + 1, decision: "approve", reason: "Valid reason" }), code("DATA_RIGHTS_CONFLICT"));
  const rejected = await service.decideDeletionRequest({ id: rb.id, expectedVersion: rb.version, decision: "reject", reason: "Outstanding event obligations" });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.decisionReason, "Outstanding event obligations");
  const [audit] = await audits("data_rights.deletion.rejected", rb.id);
  assert.equal(audit.actor_account_id, root.id);
  assert.equal(audit.change_summary.reason, "Outstanding event obligations");
  await assert.rejects(service.decideDeletionRequest({ id: rb.id, expectedVersion: rejected.version, decision: "approve", reason: "Changed mind" }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  await assert.rejects(service.executeDeletionRequest({ id: rb.id, expectedVersion: rejected.version, confirm: "ERASE" }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  actAs(b);
  await assert.rejects(service.cancelOwnDeletion({ id: rb.id, expectedVersion: rejected.version }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  assert.equal((await service.getOwnDeletionStatus()).current.decisionReason, "Outstanding event obligations");
});

test("pending requests cannot be executed and execution needs explicit confirmation", async () => {
  const a = await account(), r = await pendingFor(a);
  await assert.rejects(service.executeDeletionRequest({ id: r.id, expectedVersion: r.version, confirm: "ERASE" }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  const approved = await service.decideDeletionRequest({ id: r.id, expectedVersion: r.version, decision: "approve", reason: "Verified request" });
  for (const confirm of [undefined, "erase", "yes"])
    await assert.rejects(service.executeDeletionRequest({ id: r.id, expectedVersion: approved.version, confirm }), code("DATA_RIGHTS_INVALID_INPUT"));
  assert.equal((await row(a.id)).status, "active");
});

test("member may cancel an approved request before execution", async () => {
  const a = await account(), approved = await approvedFor(a);
  actAs(a);
  const cancelled = await service.cancelOwnDeletion({ id: approved.id, expectedVersion: approved.version });
  assert.equal(cancelled.status, "cancelled");
  actAs(root);
  await assert.rejects(service.executeDeletionRequest({ id: approved.id, expectedVersion: cancelled.version, confirm: "ERASE" }), code("DATA_RIGHTS_INVALID_TRANSITION"));
  assert.equal((await row(a.id)).status, "active");
});

test("super_admin cannot decide or execute a request about themselves", async () => {
  const other = await account("super_admin");
  actAs(other);
  const own = await service.requestOwnDeletion({ confirmEmail: other.email });
  await assert.rejects(service.decideDeletionRequest({ id: own.id, expectedVersion: own.version, decision: "approve", reason: "Self approval" }), code("DATA_RIGHTS_SELF_ACTION_FORBIDDEN"));
  await service.cancelOwnDeletion({ id: own.id, expectedVersion: own.version });
});

// ---------- execution ----------
test("execution erases PII, keeps retained records, deletes avatar object and revokes sessions", async () => {
  const subject = await richMember("admin");
  const approved = await approvedFor(subject);
  actAs(root);
  const result = await service.executeDeletionRequest({ id: approved.id, expectedVersion: approved.version, confirm: "ERASE" });
  assert.equal(result.request.status, "executed");
  assert.equal(result.alreadyExecuted, false);
  assert.deepEqual(result.objects, { deleted: 1, pending: 0 });
  assert.equal(result.sessions, "revoked");
  assert.deepEqual(revoked.slice(-1), [subject.auth_provider_user_id]);
  assert.ok(erased.includes(`member-avatars/${subject.media}.webp`));

  const acc = await row(subject.id);
  assert.equal(acc.status, "deactivated");
  assert.equal(acc.email, `deleted-${subject.id}@erased.invalid`);
  assert.equal(acc.display_name, null);
  for (const key of ["member_id", "barcode_value", "auth_provider_user_id", "member_number"]) assert.equal(String(acc[key]), String(subject[key]));
  assert.equal((await query("SELECT count(*)::int n FROM uss.account_roles WHERE account_id=$1", [subject.id]))[0].n, 0);
  assert.equal((await query("SELECT count(*)::int n FROM uss.member_profiles WHERE account_id=$1", [subject.id]))[0].n, 0);
  const media = (await query("SELECT * FROM uss.media_assets WHERE id=$1", [subject.media]))[0];
  assert.equal(media.status, "archived"); assert.equal(media.caption, null); assert.equal(media.purpose, "member_avatar");
  const regs = await query("SELECT id,status,admin_note FROM uss.event_registrations WHERE account_id=$1 ORDER BY registered_at", [subject.id]);
  assert.equal(regs.length, 2, "registration rows retained for anonymised counts");
  assert.equal(regs.find(r => r.id === subject.r1).status, "confirmed", "past attendance retained");
  assert.equal(regs.find(r => r.id === subject.r2).status, "cancelled", "upcoming place released");
  assert.ok(regs.every(r => r.admin_note === null));
  assert.equal((await query("SELECT count(*)::int n FROM uss.registration_field_values WHERE registration_id=$1", [subject.r2]))[0].n, 0);
  assert.equal((await query("SELECT count(*)::int n FROM uss.check_ins WHERE registration_id=$1", [subject.r1]))[0].n, 1);
  assert.ok((await query("SELECT p.status FROM uss.event_passes p JOIN uss.event_registrations r ON r.id=p.registration_id WHERE r.account_id=$1", [subject.id])).every(p => p.status === "revoked"));
  const notes = await query("SELECT recipient,payload,cancelled_at,status FROM uss.notification_deliveries WHERE account_id=$1", [subject.id]);
  assert.ok(notes.length >= 1);
  assert.ok(notes.every(n => n.recipient === "erased@erased.invalid" && (n.payload === null || n.payload.erased === true)));
  const req = (await query("SELECT * FROM uss.data_deletion_requests WHERE id=$1", [approved.id]))[0];
  assert.equal(req.reason, null, "member free text erased");
  assert.equal(req.erasure_summary.rolesRemoved, 2);
  // Everything still carrying the subject's markers must be gone outside the immutable audit trail.
  const leftovers = await query(`SELECT 'accounts' t FROM uss.accounts WHERE id=$1 AND (email::text LIKE '%'||$2||'%' OR display_name LIKE '%'||$2||'%')
    UNION ALL SELECT 'notifications' FROM uss.notification_deliveries WHERE account_id=$1 AND (recipient LIKE '%'||$2||'%' OR payload::text LIKE '%'||$2||'%')
    UNION ALL SELECT 'answers' FROM uss.registration_field_values v JOIN uss.event_registrations r ON r.id=v.registration_id WHERE r.account_id=$1`, [subject.id, subject.marker]);
  assert.deepEqual(leftovers, []);
  // Audit rows survive; the actor id now resolves to an anonymised account (pseudonymised).
  const history = await query("SELECT * FROM uss.audit_logs WHERE actor_account_id=$1", [subject.id]);
  assert.ok(history.some(h => h.action === "data_rights.deletion.requested"));
  assert.equal((await audits("data_rights.deletion.executed", approved.id)).length, 1);
  assert.equal((await audits("account.erased", subject.id)).length, 1);
  assert.equal((await audits("data_rights.erasure_object.deleted", subject.media)).length, 1);
  assert.equal((await audits("data_rights.sessions.revoked", approved.id)).length, 1);
  // Sessions: every USS guard fails closed for the erased account.
  actAs(await row(subject.id));
  await assert.rejects(guards.requireActiveAccount(), code("ACCOUNT_DEACTIVATED"));
  assert.equal((await dataRightsResult(() => service.exportOwnData())).code, "ACCOUNT_DEACTIVATED");
  // Erased account cannot be re-elevated.
  const [grant] = await query("SELECT * FROM uss.manage_role($1,$2,'grant','admin',$3,'Re-elevation attempt')", [root.id, subject.id, acc.version]);
  assert.equal(grant.code, "ROLE_TARGET_INELIGIBLE");
});

test("execution is idempotent and retries only pending storage objects", async () => {
  const subject = await richMember();
  const approved = await approvedFor(subject);
  actAs(root);
  eraseFails = true;
  const first = await service.executeDeletionRequest({ id: approved.id, expectedVersion: approved.version, confirm: "ERASE" });
  eraseFails = false;
  assert.deepEqual(first.objects, { deleted: 0, pending: 1 });
  assert.equal((await audits("data_rights.erasure_object.failed", subject.media)).length, 1);
  const queue = await service.listDeletionRequests({ status: "executed" });
  assert.equal(queue.items.find(i => i.id === approved.id).erasure.pendingObjects, 1);
  const second = await service.executeDeletionRequest({ id: approved.id, expectedVersion: first.request.version, confirm: "ERASE" });
  assert.equal(second.alreadyExecuted, true);
  assert.deepEqual(second.objects, { deleted: 1, pending: 0 });
  const third = await service.executeDeletionRequest({ id: approved.id, expectedVersion: 1, confirm: "ERASE" });
  assert.deepEqual(third.objects, { deleted: 0, pending: 0 });
  assert.equal((await audits("data_rights.deletion.executed", approved.id)).length, 1, "erasure transition audited exactly once");
  assert.equal((await query("SELECT attempts,status FROM uss.data_erasure_objects WHERE request_id=$1", [approved.id]))[0].status, "deleted");
});

test("concurrent executions erase once", async () => {
  const subject = await richMember();
  const approved = await approvedFor(subject);
  actAs(root);
  const input = { id: approved.id, expectedVersion: approved.version, confirm: "ERASE" };
  const out = await Promise.all([service.executeDeletionRequest(input), service.executeDeletionRequest(input)]);
  assert.equal(out.filter(o => !o.alreadyExecuted).length, 1);
  assert.equal((await audits("data_rights.deletion.executed", approved.id)).length, 1);
  assert.equal((await audits("account.erased", subject.id)).length, 1);
});

test("execution failure rolls back every erasure step atomically", async () => {
  const subject = await richMember();
  const approved = await approvedFor(subject);
  await query("CREATE FUNCTION uss.fail_dr_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='account.erased' THEN RAISE EXCEPTION 'private failure'; END IF; RETURN NEW; END $$");
  await query("CREATE TRIGGER fail_dr BEFORE INSERT ON uss.audit_logs FOR EACH ROW EXECUTE FUNCTION uss.fail_dr_audit()");
  try {
    actAs(root);
    const out = await actions.executeDeletionRequest({ id: approved.id, expectedVersion: approved.version, confirm: "ERASE" });
    assert.deepEqual(out, { ok: false, code: "DATA_RIGHTS_UNAVAILABLE" });
    const acc = await row(subject.id);
    assert.equal(acc.status, "active"); assert.equal(acc.email, subject.email);
    assert.equal((await query("SELECT count(*)::int n FROM uss.member_profiles WHERE account_id=$1", [subject.id]))[0].n, 1);
    assert.equal((await query("SELECT status FROM uss.data_deletion_requests WHERE id=$1", [approved.id]))[0].status, "approved");
    assert.equal((await query("SELECT count(*)::int n FROM uss.data_erasure_objects WHERE request_id=$1", [approved.id]))[0].n, 0);
  } finally {
    await query("DROP TRIGGER fail_dr ON uss.audit_logs");
    await query("DROP FUNCTION uss.fail_dr_audit()");
  }
});

test("storage mismatch never deletes another provider's object", async () => {
  const subject = await richMember();
  const foreign = randomUUID();
  await query(`INSERT INTO uss.media_assets(id,storage_provider,storage_key,mime_type,byte_size,width,height,uploaded_by,purpose,status)
    VALUES($1,'neon-s3',$2,'image/webp',100,512,512,$3,'member_avatar','archived')`, [foreign, `member-avatars/${foreign}.webp`, subject.id]);
  const approved = await approvedFor(subject);
  actAs(root);
  const result = await service.executeDeletionRequest({ id: approved.id, expectedVersion: approved.version, confirm: "ERASE" });
  assert.deepEqual(result.objects, { deleted: 1, pending: 1 });
  assert.ok(!erased.includes(`member-avatars/${foreign}.webp`));
  const [failure] = await audits("data_rights.erasure_object.failed", foreign);
  assert.equal(failure.change_summary.errorCode, "DATA_RIGHTS_STORAGE_MISMATCH");
});

// ---------- last super admin ----------
test("the last usable super admin cannot request deletion; another super admin can be erased", async () => {
  const isolated = new PGlite({ extensions: { citext, pgcrypto } });
  const q = async (t, p = []) => (await isolated.query(t, p)).rows;
  try {
    await migrate({ query: q, transaction: s => isolated.transaction(async tx => { for (const x of s) await tx.query(x.text, x.params); }) }, migrations);
    const mk = async role => { const [a] = await q("INSERT INTO uss.accounts(auth_provider_user_id,email,status,email_verified_at) VALUES($1,$2,'active',now()) RETURNING *", [randomUUID(), randomUUID() + "@example.test"]); await q("INSERT INTO uss.account_roles(account_id,role_id) SELECT $1,id FROM uss.roles WHERE code=$2", [a.id, role]); return a; };
    const only = await mk("super_admin");
    const [r1] = await q("SELECT * FROM uss.request_account_deletion($1,ARRAY['member','admin','super_admin'],NULL,$2)", [only.id, only.email]);
    assert.equal(r1.out_code, "DATA_RIGHTS_LAST_SUPER_ADMIN");
    const second = await mk("super_admin");
    const [r2] = await q("SELECT * FROM uss.request_account_deletion($1,ARRAY['member','admin','super_admin'],NULL,$2)", [second.id, second.email]);
    assert.equal(r2.out_code, "OK");
    const [d] = await q("SELECT * FROM uss.decide_account_deletion($1,ARRAY['super_admin'],$2,'approve',$3,'Ownership handed over')", [only.id, r2.out_data.id, r2.out_data.version]);
    assert.equal(d.out_code, "OK");
    const [x] = await q("SELECT * FROM uss.execute_account_deletion($1,$2,$3)", [only.id, r2.out_data.id, d.out_data.version]);
    assert.equal(x.out_code, "OK");
    assert.equal((await q("SELECT uss.data_rights_usable_super_admins() n"))[0].n, 1, "one usable super admin always remains");
    const [again] = await q("SELECT * FROM uss.request_account_deletion($1,ARRAY['member','admin','super_admin'],NULL,$2)", [only.id, only.email]);
    assert.equal(again.out_code, "DATA_RIGHTS_LAST_SUPER_ADMIN");
  } finally { await isolated.close(); }
});

// ---------- DB invariants ----------
test("deletion lifecycle is enforced by the database", async () => {
  const a = await account(), r = await pendingFor(a);
  await assert.rejects(query("UPDATE uss.data_deletion_requests SET status='executed',executed_at=now(),executed_by=$2 WHERE id=$1", [r.id, root.id]));
  await assert.rejects(query("UPDATE uss.data_deletion_requests SET account_id=$2 WHERE id=$1", [r.id, root.id]));
  await assert.rejects(query("DELETE FROM uss.data_deletion_requests WHERE id=$1", [r.id]));
  await assert.rejects(query("INSERT INTO uss.data_deletion_requests(account_id) VALUES($1)", [a.id]), "second open request blocked by unique index");
});

test("notification identity remains immutable outside an erasure transaction", async () => {
  const m = await richMember();
  const [n] = await query("SELECT id FROM uss.notification_deliveries WHERE account_id=$1 LIMIT 1", [m.id]);
  await assert.rejects(query("UPDATE uss.notification_deliveries SET recipient='attacker@example.test' WHERE id=$1", [n.id]));
  await assert.rejects(query("UPDATE uss.notification_deliveries SET recipient='erased@erased.invalid' WHERE id=$1", [n.id]), "erasure marker requires the erasure context");
  await assert.rejects(query("UPDATE uss.notification_deliveries SET account_id=$2 WHERE id=$1", [n.id, root.id]));
});

test("migration rerun executes nothing", async () => {
  assert.equal((await migrate({ query, transaction: s => pg.transaction(async tx => { for (const x of s) await tx.query(x.text, x.params); }) }, migrations)).executed.length, 0);
  assert.ok(migrations.some(m => m.version === "026"));
});

// ---------- export route ----------
test("export route is POST same-origin only, no-store, attachment, and maps failures", async () => {
  let outcome = { filename: "uss-running-data-2026-11-27.json", data: { schemaVersion: 1 } }, failure = null;
  const route = loader({
    "@/lib/data-rights/data-rights-service": { exportOwnData: async () => { if (failure) throw failure; return outcome; } },
    "@/lib/data-rights/data-rights-errors": load("lib/data-rights/data-rights-errors.ts"),
  })("app/api/member/data-export/route.ts");
  assert.equal(route.GET, undefined, "no GET export: links and prefetch cannot trigger downloads");
  const { DataRightsError } = load("lib/data-rights/data-rights-errors.ts");
  const call = headers => route.POST(new Request("https://uss.example.test/api/member/data-export", { method: "POST", headers }));
  const cross = await call({ origin: "https://evil.example.test" });
  assert.equal(cross.status, 403);
  assert.equal((await call({ "sec-fetch-site": "cross-site" })).status, 403);
  const ok = await call({ origin: "https://uss.example.test", "sec-fetch-site": "same-origin" });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.match(ok.headers.get("content-disposition"), /^attachment; filename="uss-running-data-2026-11-27\.json"$/);
  assert.deepEqual(await ok.json(), { schemaVersion: 1 });
  failure = new DataRightsError("DATA_RIGHTS_RATE_LIMITED");
  const limited = await call({ origin: "https://uss.example.test" });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "3600");
  failure = new Error("db exploded with secret text");
  const broken = await call({});
  assert.equal(broken.status, 503);
  assert.ok(!(await broken.text()).includes("secret"));
});

test("runtime role (no DELETE) can run the full lifecycle through the granted functions", async () => {
  const { readFileSync } = await import("node:fs");
  const subject = await richMember();
  await query("CREATE ROLE dr_runtime");
  const grants = readFileSync("database/runtime-grants.sql", "utf8").split("\n").filter(x => !x.trim().startsWith("--")).join("\n").replaceAll(':"app_role"', "dr_runtime");
  await pg.exec(grants);
  await query("SET ROLE dr_runtime");
  try {
    const [r] = await query("SELECT * FROM uss.request_account_deletion($1,ARRAY['member'],NULL,$2)", [subject.id, subject.email]);
    assert.equal(r.out_code, "OK");
    const [d] = await query("SELECT * FROM uss.decide_account_deletion($1,ARRAY['super_admin'],$2,'approve',$3,'Runtime approval')", [root.id, r.out_data.id, r.out_data.version]);
    assert.equal(d.out_code, "OK");
    const [x] = await query("SELECT * FROM uss.execute_account_deletion($1,$2,$3)", [root.id, r.out_data.id, d.out_data.version]);
    assert.equal(x.out_code, "OK");
    const [f] = await query("SELECT * FROM uss.record_erasure_followup($1,$2,'object',$3,'deleted',NULL)", [root.id, r.out_data.id, subject.media]);
    assert.equal(f.out_code, "OK");
    await assert.rejects(query("DELETE FROM uss.member_profiles WHERE account_id=$1", [root.id]), "runtime role still has no direct DELETE");
    await assert.rejects(query("UPDATE uss.data_erasure_objects SET request_id=request_id"), "erasure object identity not writable at runtime");
  } finally {
    await query("RESET ROLE");
  }
});
