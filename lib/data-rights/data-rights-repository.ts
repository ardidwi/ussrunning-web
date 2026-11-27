import "server-only";
import { getSql, query } from "@/lib/db";
import { DATA_RIGHTS_POLICY } from "./data-rights-policy";
import type { QueueFilters } from "./data-rights-validation";
import type { AdminDeletionRequestDTO, DataExport, DeletionRequestDTO } from "./data-rights-types";

type Outcome<T> = { out_code: string; out_data: T | null };
export type PrivateAvatar = { id: string; storageKey: string; provider: string; width: number; height: number };
export type RawExport = Omit<DataExport, "schemaVersion" | "exportedAt" | "notice" | "avatar"> & {
  avatar: (Omit<DataExport["avatar"] & object, "temporaryUrl"> & { storageKey: string; provider: string }) | null;
};
export type ErasureObject = { mediaId: string; storageProvider: string; storageKey: string };
export type ExecutionOutcome = { alreadyExecuted: boolean; request: DeletionRequestDTO; providerUserId: string; objects: ErasureObject[] };

const utc = (column: string) => `uss.data_rights_utc(${column})`;

/** Own-account data only: every subquery is anchored on the trusted session account $1. */
const exportProjection = `jsonb_build_object(
  'account', (SELECT jsonb_build_object('memberId', uss.format_member_number(a.member_number), 'email', a.email::text,
      'displayName', a.display_name, 'status', a.status, 'emailVerifiedAt', ${utc("a.email_verified_at")},
      'createdAt', ${utc("a.created_at")}, 'lastLoginAt', ${utc("a.last_login_at")},
      'roles', ARRAY(SELECT r.code FROM uss.account_roles ar JOIN uss.roles r ON r.id = ar.role_id
        WHERE ar.account_id = a.id ORDER BY r.code))
    FROM uss.accounts a WHERE a.id = $1),
  'profile', (SELECT jsonb_build_object('fullName', p.full_name, 'phone', p.phone, 'birthDate', p.birth_date,
      'gender', p.gender, 'city', p.city, 'emergencyContactName', p.emergency_contact_name,
      'emergencyContactPhone', p.emergency_contact_phone, 'instagramHandle', p.instagram_handle,
      'jerseySize', p.jersey_size, 'runningPreferences', p.running_preferences,
      'createdAt', ${utc("p.created_at")}, 'updatedAt', ${utc("p.updated_at")})
    FROM uss.member_profiles p WHERE p.account_id = $1),
  'consents', (SELECT jsonb_build_object('marketing', p.marketing_consent, 'marketingConsentAt', ${utc("p.marketing_consent_at")},
      'privacyConsentAt', ${utc("p.privacy_consent_at")}) FROM uss.member_profiles p WHERE p.account_id = $1),
  'avatar', (SELECT jsonb_build_object('id', m.id, 'storageKey', m.storage_key, 'provider', m.storage_provider,
      'mimeType', m.mime_type, 'width', m.width, 'height', m.height, 'byteSize', m.byte_size,
      'uploadedAt', ${utc("m.created_at")}, 'status', p.avatar_status, 'reviewedAt', ${utc("p.avatar_reviewed_at")},
      'rejectionReason', p.avatar_rejection_reason)
    FROM uss.member_profiles p JOIN uss.media_assets m ON m.id = p.avatar_media_id
      AND m.uploaded_by = p.account_id AND m.purpose = 'member_avatar'
    WHERE p.account_id = $1),
  'registrations', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'status', r.status,
      'registeredAt', ${utc("r.registered_at")}, 'cancelledAt', ${utc("r.cancelled_at")}, 'source', r.source,
      'event', jsonb_build_object('id', e.id, 'title', e.title, 'startsAt', ${utc("e.starts_at")}),
      'answers', COALESCE((SELECT jsonb_agg(jsonb_build_object('key', f.key, 'label', f.label, 'value', v.value) ORDER BY f.key)
        FROM uss.registration_field_values v JOIN uss.event_custom_fields f ON f.id = v.field_id AND f.event_id = v.event_id
        WHERE v.registration_id = r.id AND v.event_id = r.event_id), '[]'::jsonb))
      ORDER BY r.registered_at DESC, r.id)
    FROM uss.event_registrations r JOIN uss.events e ON e.id = r.event_id WHERE r.account_id = $1), '[]'::jsonb),
  'attendance', COALESCE((SELECT jsonb_agg(jsonb_build_object('registrationId', r.id, 'eventId', e.id, 'eventTitle', e.title,
      'checkedInAt', ${utc("c.checked_in_at")}, 'checkpoint', c.checkpoint) ORDER BY c.checked_in_at DESC, c.id)
    FROM uss.check_ins c JOIN uss.event_registrations r ON r.id = c.registration_id AND r.event_id = c.event_id
      JOIN uss.events e ON e.id = r.event_id WHERE r.account_id = $1), '[]'::jsonb),
  'passes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'registrationId', p.registration_id, 'eventId', p.event_id,
      'status', p.status, 'issuedAt', ${utc("p.issued_at")}, 'expiresAt', ${utc("p.expires_at")},
      'revokedAt', ${utc("p.revoked_at")}, 'revokedReason', p.revoked_reason) ORDER BY p.issued_at DESC, p.id)
    FROM uss.event_passes p JOIN uss.event_registrations r ON r.id = p.registration_id WHERE r.account_id = $1), '[]'::jsonb),
  'notifications', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'type', n.notification_type, 'channel', n.channel,
      'recipient', n.recipient, 'status', n.status, 'eventId', n.event_id, 'queuedAt', ${utc("n.queued_at")},
      'sentAt', ${utc("n.sent_at")}, 'deliveredAt', ${utc("n.delivered_at")}, 'failedAt', ${utc("n.failed_at")},
      'cancelledAt', ${utc("n.cancelled_at")}) ORDER BY n.queued_at DESC, n.id)
    FROM uss.notification_deliveries n WHERE n.account_id = $1), '[]'::jsonb),
  'dataRightsRequests', COALESCE((SELECT jsonb_agg(uss.data_deletion_request_json(d) ORDER BY d.requested_at DESC, d.id)
    FROM uss.data_deletion_requests d WHERE d.account_id = $1), '[]'::jsonb)
)`;

/** Authority, rate limit, audit and snapshot read commit together on the locked account row. */
export async function exportOwnData(actor: string, roles: string[]) {
  const sql = getSql();
  const results = await sql.transaction([
    sql.query("SELECT set_config('lock_timeout','15s',true)"),
    sql.query("SELECT id FROM uss.accounts WHERE id=$1 FOR UPDATE", [actor]),
    sql.query(`WITH decision AS MATERIALIZED (
        SELECT CASE WHEN NOT uss.data_rights_authorized($1, $2::text[]) THEN 'DATA_RIGHTS_FORBIDDEN'
          WHEN (SELECT count(*) FROM uss.audit_logs WHERE actor_account_id = $1 AND action = 'data_rights.export.generated'
            AND created_at > clock_timestamp() - interval '1 hour') >= $3 THEN 'DATA_RIGHTS_RATE_LIMITED'
          ELSE 'OK' END AS code
      ), audit AS (
        INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
        SELECT $1, 'data_rights.export.generated', 'account', $1, jsonb_build_object('format', 'json', 'schemaVersion', 1)
        FROM decision WHERE code = 'OK'
      ) SELECT code AS out_code, CASE WHEN code = 'OK' THEN ${exportProjection} END AS out_data FROM decision`,
      [actor, roles, DATA_RIGHTS_POLICY.exportsPerHour]),
  ], { isolationLevel: "ReadCommitted" });
  return (results[2] as Outcome<RawExport>[])[0];
}

export async function ownDeletionStatus(actor: string, roles: string[]) {
  return (await query<{ authorized: boolean; current: DeletionRequestDTO | null }>(`
    SELECT uss.data_rights_authorized($1, $2::text[]) AS authorized,
      (SELECT uss.data_deletion_request_json(r) FROM uss.data_deletion_requests r
        WHERE r.account_id = $1 AND uss.data_rights_authorized($1, $2::text[])
        ORDER BY (r.status IN ('pending','approved')) DESC, r.requested_at DESC, r.id LIMIT 1) AS current`,
    [actor, roles]))[0];
}

export async function requestDeletion(actor: string, roles: string[], reason: string | null, confirmEmail: string) {
  return (await query<Outcome<DeletionRequestDTO>>("SELECT * FROM uss.request_account_deletion($1,$2::text[],$3,$4)",
    [actor, roles, reason, confirmEmail]))[0];
}
export async function cancelDeletion(actor: string, roles: string[], id: string, version: number) {
  return (await query<Outcome<DeletionRequestDTO>>("SELECT * FROM uss.cancel_account_deletion($1,$2::text[],$3,$4)",
    [actor, roles, id, version]))[0];
}
export async function decideDeletion(actor: string, roles: string[], id: string, decision: "approve" | "reject", version: number, reason: string) {
  return (await query<Outcome<DeletionRequestDTO>>("SELECT * FROM uss.decide_account_deletion($1,$2::text[],$3,$4,$5,$6)",
    [actor, roles, id, decision, version, reason]))[0];
}
export async function executeDeletion(actor: string, id: string, version: number) {
  return (await query<Outcome<ExecutionOutcome>>("SELECT * FROM uss.execute_account_deletion($1,$2,$3)", [actor, id, version]))[0];
}
export async function recordFollowup(actor: string, id: string, kind: "object" | "sessions", mediaId: string | null,
  outcome: "deleted" | "failed" | "revoked" | "unavailable", errorCode: string | null) {
  return (await query<Outcome<null>>("SELECT * FROM uss.record_erasure_followup($1,$2,$3,$4,$5,$6)",
    [actor, id, kind, mediaId, outcome, errorCode]))[0];
}

export async function listQueue(actor: string, roles: string[], f: QueueFilters) {
  return (await query<{ authorized: boolean; items: (AdminDeletionRequestDTO & { cursorAt: string })[] }>(`
    WITH authority AS MATERIALIZED (SELECT uss.data_rights_authorized($1, $2::text[]) AND uss.data_rights_has_role($1, 'super_admin') AS ok),
    page AS (
      SELECT r AS req, r.id, r.account_id, r.status, r.requested_at, r.decided_by, r.executed_by, r.erasure_summary,
        a.member_number, a.display_name AS account_name, a.email::text AS account_email, a.status AS account_status,
        NULLIF(btrim(p.full_name), '') AS full_name
      FROM uss.data_deletion_requests r JOIN uss.accounts a ON a.id = r.account_id
        LEFT JOIN uss.member_profiles p ON p.account_id = r.account_id
      WHERE (SELECT ok FROM authority) AND ($3::text IS NULL OR r.status = $3)
        AND ($4::timestamptz IS NULL OR r.requested_at < $4 OR (r.requested_at = $4 AND r.id > $5::uuid))
      ORDER BY r.requested_at DESC, r.id LIMIT $6
    )
    SELECT (SELECT ok FROM authority) AS authorized, COALESCE((SELECT jsonb_agg(
      uss.data_deletion_request_json(pg.req)
      || jsonb_build_object('cursorAt', uss.data_rights_utc(pg.requested_at),
        'subject', jsonb_build_object('accountId', pg.account_id, 'memberId', uss.format_member_number(pg.member_number),
          'displayName', COALESCE(pg.full_name, pg.account_name), 'email', pg.account_email, 'accountStatus', pg.account_status),
        'decidedBy', (SELECT jsonb_build_object('accountId', d.id, 'displayName', d.display_name) FROM uss.accounts d WHERE d.id = pg.decided_by),
        'executedBy', (SELECT jsonb_build_object('accountId', x.id, 'displayName', x.display_name) FROM uss.accounts x WHERE x.id = pg.executed_by),
        'erasure', CASE WHEN pg.status = 'executed' THEN jsonb_build_object('summary', pg.erasure_summary,
          'pendingObjects', (SELECT count(*) FROM uss.data_erasure_objects o WHERE o.request_id = pg.id AND o.status = 'pending'),
          'deletedObjects', (SELECT count(*) FROM uss.data_erasure_objects o WHERE o.request_id = pg.id AND o.status = 'deleted')) END)
      ORDER BY pg.requested_at DESC, pg.id) FROM page pg), '[]'::jsonb) AS items`,
    [actor, roles, f.status, f.cursor?.at ?? null, f.cursor?.id ?? null, f.limit + 1]))[0];
}
