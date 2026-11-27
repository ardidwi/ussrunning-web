// Orphaned media object cleanup: dry run first, audited, scoped. Pure logic with injected db/storage
// so it is fully testable with mocks; the CLI wrapper lives in cleanup-orphans.mjs.
//
// storage contract: { buckets: ['public','private'], async *list(bucket, prefix) -> {key,size,lastModified:Date},
//                     async delete(bucket, key) }
// db contract:      { query(text, params) -> rows }

export const AVATAR_PREFIX = 'member-avatars/';
const KEY = /^[a-z0-9/-]+\.(jpg|png|webp)$/;

export function cleanupScope(scope, prefix = 'uss-media') {
  if (scope === 'cms') {
    if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(prefix) || `${prefix}/`.startsWith(AVATAR_PREFIX)) throw new Error('Unsafe MEDIA_STORAGE_PREFIX for cleanup.');
    return { scope, prefix: `${prefix}/`, purpose: 'cms' };
  }
  if (scope === 'member-avatars') return { scope, prefix: AVATAR_PREFIX, purpose: 'member_avatar' };
  throw new Error('Scope must be cms or member-avatars.');
}

/** Lists storage objects with no media_assets row (and no pending upload intent), plus rows with no object. Never deletes. */
export async function planCleanup({ db, storage, scope = 'cms', prefix, graceHours = 24, now = new Date() }) {
  const s = cleanupScope(scope, prefix);
  if (!Number.isFinite(graceHours) || graceHours < 1) throw new Error('Grace period must be at least 1 hour.');
  const cutoff = new Date(now.getTime() - graceHours * 3600_000);
  const rows = await db.query("SELECT id,storage_key,purpose,status FROM uss.media_assets WHERE left(storage_key,length($1))=$1", [s.prefix]);
  const pending = await db.query("SELECT storage_key FROM uss.media_upload_intents WHERE status='pending' AND expires_at>$2 AND left(storage_key,length($1))=$1", [s.prefix, now.toISOString()]);
  const known = new Set(rows.map(r => r.storage_key)), reserved = new Set(pending.map(r => r.storage_key)), seen = new Set();
  const orphans = [], skipped = { recent: 0, pendingUpload: 0, outOfScope: 0, unexpectedKey: 0 };
  let scanned = 0;
  for (const bucket of storage.buckets) {
    for await (const object of storage.list(bucket, s.prefix)) {
      scanned++;
      const key = object.key;
      if (!key.startsWith(s.prefix) || (s.scope === 'cms' && key.startsWith(AVATAR_PREFIX))) { skipped.outOfScope++; continue; }
      seen.add(key);
      if (known.has(key)) continue;
      if (!KEY.test(key) || key.includes('..')) { skipped.unexpectedKey++; continue; }
      if (reserved.has(key)) { skipped.pendingUpload++; continue; }
      if (!(object.lastModified instanceof Date) || object.lastModified > cutoff) { skipped.recent++; continue; }
      orphans.push({ bucket, key, size: Number(object.size ?? 0), lastModified: object.lastModified.toISOString() });
    }
  }
  const missing = rows.filter(r => r.purpose === s.purpose && !seen.has(r.storage_key)).map(r => ({ id: r.id, key: r.storage_key, status: r.status }));
  return { scope: s.scope, prefix: s.prefix, purpose: s.purpose, graceHours, cutoff: cutoff.toISOString(), scanned, orphans, missing, skipped };
}

async function audit(db, action, summary) {
  await db.query("INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) VALUES(NULL,$1,'media_object',NULL,$2::jsonb)", [action, JSON.stringify(summary)]);
}

/**
 * Dry run (default) only records an audit entry. Apply re-checks each key against the database right before
 * deleting it, deletes one object at a time, audits each deletion and stops at maxDeletes.
 * Member avatar objects are only reachable with scope 'member-avatars' AND allowAvatarScope.
 */
export async function runCleanup({ db, storage, scope = 'cms', prefix, graceHours = 24, apply = false, allowAvatarScope = false, maxDeletes = 500, now = new Date() }) {
  if (scope === 'member-avatars' && apply && !allowAvatarScope) throw new Error('Deleting member avatar objects requires --confirm-member-avatar-scope.');
  if (!Number.isInteger(maxDeletes) || maxDeletes < 1 || maxDeletes > 10000) throw new Error('--max-deletes must be between 1 and 10000.');
  const plan = await planCleanup({ db, storage, scope, prefix, graceHours, now });
  const result = { ...plan, mode: apply ? 'apply' : 'dry_run', deleted: [], failed: [], notDeleted: 0 };
  if (apply) {
    for (const o of plan.orphans) {
      if (result.deleted.length >= maxDeletes) { result.notDeleted++; continue; }
      const still = await db.query("SELECT 1 FROM uss.media_assets WHERE storage_key=$1 UNION ALL SELECT 1 FROM uss.media_upload_intents WHERE storage_key=$1 AND status='pending'", [o.key]);
      if (still.length) { result.notDeleted++; continue; }
      try { await storage.delete(o.bucket, o.key); }
      catch { result.failed.push({ bucket: o.bucket, key: o.key }); continue; }
      await audit(db, 'media.cleanup.object_deleted', { scope: plan.scope, bucket: o.bucket, key: o.key, sizeBytes: o.size });
      result.deleted.push(o);
    }
  }
  await audit(db, apply ? 'media.cleanup.applied' : 'media.cleanup.dry_run', { scope: plan.scope, prefix: plan.prefix, graceHours: plan.graceHours, scanned: plan.scanned, orphanCount: plan.orphans.length, missingObjectCount: plan.missing.length, deletedCount: result.deleted.length, failedCount: result.failed.length, skipped: plan.skipped });
  return result;
}
