// Usage (operator only; never run against real storage without an owner-approved window):
//   node --env-file-if-exists=.env.local scripts/media/cleanup-orphans.mjs                 # dry run, cms scope
//   node ... cleanup-orphans.mjs --apply [--max-deletes=100] [--grace-hours=48]
//   node ... cleanup-orphans.mjs --scope=member-avatars [--apply --confirm-member-avatar-scope]
// Prints a JSON summary without credentials. Every run (including dry runs) writes an audit_logs entry.
import { pathToFileURL } from 'node:url';
import { runCleanup } from './orphan-cleanup.mjs';

export function parseArgs(argv) {
  const out = { apply: false, scope: 'cms', graceHours: 24, maxDeletes: 500, allowAvatarScope: false };
  for (const arg of argv) {
    if (arg === '--apply') out.apply = true;
    else if (arg === '--confirm-member-avatar-scope') out.allowAvatarScope = true;
    else if (arg.startsWith('--scope=')) out.scope = arg.slice(8);
    else if (arg.startsWith('--grace-hours=')) out.graceHours = Number(arg.slice(14));
    else if (arg.startsWith('--max-deletes=')) out.maxDeletes = Number(arg.slice(14));
    else throw new Error(`Unknown flag ${arg}. Use --apply, --scope=cms|member-avatars, --grace-hours=N, --max-deletes=N, --confirm-member-avatar-scope.`);
  }
  if (!['cms', 'member-avatars'].includes(out.scope)) throw new Error('--scope must be cms or member-avatars.');
  if (out.allowAvatarScope && out.scope !== 'member-avatars') throw new Error('--confirm-member-avatar-scope only applies with --scope=member-avatars.');
  return out;
}

async function s3Storage() {
  const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const env = n => process.env[n]?.trim() ?? '';
  const endpoint = env('AWS_ENDPOINT_URL_S3'), buckets = { public: env('MEDIA_PUBLIC_BUCKET_NAME'), private: env('MEDIA_PRIVATE_BUCKET_NAME') };
  if (!endpoint.startsWith('https://') || !env('AWS_REGION') || !env('AWS_ACCESS_KEY_ID') || !env('AWS_SECRET_ACCESS_KEY') || !buckets.public || !buckets.private) throw new Error('Storage is not configured (AWS_* and MEDIA_*_BUCKET_NAME).');
  const client = new S3Client({ region: env('AWS_REGION'), endpoint, forcePathStyle: true, credentials: { accessKeyId: env('AWS_ACCESS_KEY_ID'), secretAccessKey: env('AWS_SECRET_ACCESS_KEY') } });
  return {
    buckets: ['public', 'private'],
    async *list(bucket, prefix) { let token; do { const r = await client.send(new ListObjectsV2Command({ Bucket: buckets[bucket], Prefix: prefix, ContinuationToken: token })); for (const o of r.Contents ?? []) yield { key: o.Key, size: o.Size, lastModified: o.LastModified }; token = r.IsTruncated ? r.NextContinuationToken : undefined; } while (token); },
    async delete(bucket, key) { await client.send(new DeleteObjectCommand({ Bucket: buckets[bucket], Key: key })); },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('Missing DATABASE_URL.');
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);
  const db = { query: (text, params = []) => sql.query(text, params) };
  let result;
  try { result = await runCleanup({ db, storage: await s3Storage(), prefix: process.env.MEDIA_STORAGE_PREFIX ?? 'uss-media', ...args }); }
  catch (error) { throw new Error(error instanceof Error && /^(Deleting|--|Scope|Grace|Unsafe|Storage is not)/.test(error.message) ? error.message : 'Cleanup failed; nothing further was deleted. Check database/storage access.'); }
  console.info(JSON.stringify({ mode: result.mode, scope: result.scope, scanned: result.scanned, orphans: result.orphans, missingObjects: result.missing, skipped: result.skipped, deleted: result.deleted.length, failed: result.failed, notDeleted: result.notDeleted }, null, 2));
  if (result.mode === 'dry_run' && result.orphans.length) console.info('Dry run only. Re-run with --apply to delete the listed objects.');
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
