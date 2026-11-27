-- D1.6 data-subject rights: own-data export is read-only (audited through uss.audit_logs);
-- account deletion is an explicit request lifecycle plus one audited, transactional erasure.
-- Additive: two new tables, guarded functions, and a narrowed notification identity guard
-- that still rejects every change except the erasure-shaped redaction defined below.

CREATE TABLE uss.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled','executed')),
  reason text CHECK (reason IS NULL OR (length(btrim(reason)) BETWEEN 1 AND 500 AND reason !~ '[<>[:cntrl:]]')),
  requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  decided_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  decided_at timestamptz,
  decision_reason text CHECK (decision_reason IS NULL OR
    (length(btrim(decision_reason)) BETWEEN 5 AND 500 AND decision_reason !~ '[<>[:cntrl:]]')),
  cancelled_at timestamptz,
  executed_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  executed_at timestamptz,
  erasure_summary jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(erasure_summary) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT deletion_decision_pair CHECK ((decided_by IS NULL) = (decided_at IS NULL)),
  CONSTRAINT deletion_decision_reason CHECK ((decided_at IS NULL) = (decision_reason IS NULL)),
  CONSTRAINT deletion_pending_clean CHECK (status <> 'pending' OR
    (decided_at IS NULL AND cancelled_at IS NULL AND executed_at IS NULL)),
  CONSTRAINT deletion_decided_states CHECK (status NOT IN ('approved','rejected','executed') OR decided_at IS NOT NULL),
  CONSTRAINT deletion_cancelled_state CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  CONSTRAINT deletion_executed_state CHECK ((status = 'executed') = (executed_at IS NOT NULL AND executed_by IS NOT NULL)),
  -- Member-supplied free text is itself personal data and is erased with the account.
  CONSTRAINT deletion_executed_reason_erased CHECK (status <> 'executed' OR reason IS NULL)
);
-- One open request per account; double submits serialize on the account row and this index.
CREATE UNIQUE INDEX data_deletion_one_open_idx ON uss.data_deletion_requests(account_id)
  WHERE status IN ('pending','approved');
CREATE INDEX data_deletion_queue_idx ON uss.data_deletion_requests(status, requested_at, id);
CREATE INDEX data_deletion_account_time_idx ON uss.data_deletion_requests(account_id, requested_at DESC);

CREATE FUNCTION uss.guard_data_deletion_request() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.requested_at IS DISTINCT FROM OLD.requested_at THEN
    RAISE EXCEPTION 'Deletion request identity is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.status IN ('rejected','cancelled','executed') THEN
    RAISE EXCEPTION 'Deletion request terminal state is immutable' USING ERRCODE = '23514';
  END IF;
  IF NOT ((OLD.status = 'pending' AND NEW.status IN ('approved','rejected','cancelled'))
    OR (OLD.status = 'approved' AND NEW.status IN ('executed','cancelled'))) THEN
    RAISE EXCEPTION 'Invalid deletion request transition' USING ERRCODE = '23514';
  END IF;
  IF NEW.reason IS DISTINCT FROM OLD.reason AND NOT (NEW.status = 'executed' AND NEW.reason IS NULL) THEN
    RAISE EXCEPTION 'Deletion request reason is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.decided_at IS NOT NULL AND (NEW.decided_at IS DISTINCT FROM OLD.decided_at
    OR NEW.decided_by IS DISTINCT FROM OLD.decided_by OR NEW.decision_reason IS DISTINCT FROM OLD.decision_reason) THEN
    RAISE EXCEPTION 'Deletion decision is immutable' USING ERRCODE = '23514';
  END IF;
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER data_deletion_transition_guard BEFORE UPDATE ON uss.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION uss.guard_data_deletion_request();
CREATE TRIGGER data_deletion_no_delete BEFORE DELETE ON uss.data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER data_deletion_no_truncate BEFORE TRUNCATE ON uss.data_deletion_requests
  FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();

-- Storage objects owed a physical delete after the DB erasure committed. Provider I/O is retried
-- idempotently from here; storage keys never leave the server.
CREATE TABLE uss.data_erasure_objects (
  request_id uuid NOT NULL REFERENCES uss.data_deletion_requests(id) ON DELETE RESTRICT,
  media_id uuid NOT NULL REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','deleted')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error_code text CHECK (last_error_code IS NULL OR last_error_code ~ '^[A-Z_]{1,64}$'),
  last_attempt_at timestamptz,
  deleted_at timestamptz,
  PRIMARY KEY (request_id, media_id),
  CONSTRAINT erasure_object_deleted_state CHECK ((status = 'deleted') = (deleted_at IS NOT NULL))
);
CREATE INDEX data_erasure_pending_idx ON uss.data_erasure_objects(request_id) WHERE status = 'pending';
CREATE TRIGGER data_erasure_no_delete BEFORE DELETE ON uss.data_erasure_objects
  FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();

-- Notification history stays append-only. Recipient/payload may change ONLY to the fixed
-- erasure markers, and only inside a transaction that declared that account's erasure.
DROP TRIGGER notification_identity_guard ON uss.notification_deliveries;
CREATE TRIGGER notification_identity_guard BEFORE UPDATE ON uss.notification_deliveries FOR EACH ROW
  EXECUTE FUNCTION uss.guard_event_relation_identity('id','schema_version','notification_type','channel','account_id',
    'event_id','registration_id','pass_id','template_key','template_version','idempotency_key','queued_at');
CREATE TRIGGER notification_recipient_guard BEFORE UPDATE ON uss.notification_deliveries FOR EACH ROW
  WHEN (NOT (OLD.account_id IS NOT NULL
    AND current_setting('uss.erasure_account', true) = OLD.account_id::text
    AND NEW.recipient = 'erased@erased.invalid'
    AND NEW.payload IS NOT DISTINCT FROM (CASE WHEN OLD.payload IS NULL THEN NULL ELSE '{"erased": true}'::jsonb END)))
  EXECUTE FUNCTION uss.guard_event_relation_identity('recipient','payload');

CREATE FUNCTION uss.data_rights_utc(value timestamptz) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT to_char(value AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;

CREATE FUNCTION uss.data_rights_has_role(target uuid, role_code text) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, uss AS $$
  SELECT EXISTS (SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id = ar.role_id
    WHERE ar.account_id = target AND r.code = role_code);
$$;

-- Fresh DB authority: active, verified and holding one of the server-derived roles.
CREATE FUNCTION uss.data_rights_authorized(actor uuid, allowed_roles text[]) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, uss AS $$
  SELECT EXISTS (SELECT 1 FROM uss.accounts a WHERE a.id = actor AND a.status = 'active'
    AND a.email_verified_at IS NOT NULL AND EXISTS (SELECT 1 FROM uss.account_roles ar
      JOIN uss.roles r ON r.id = ar.role_id WHERE ar.account_id = a.id AND r.code = ANY(allowed_roles)));
$$;

CREATE FUNCTION uss.data_rights_usable_super_admins() RETURNS integer
LANGUAGE sql STABLE SET search_path = pg_catalog, uss AS $$
  SELECT count(*)::integer FROM uss.accounts a JOIN uss.account_roles ar ON ar.account_id = a.id
    JOIN uss.roles r ON r.id = ar.role_id
    WHERE r.code = 'super_admin' AND a.status = 'active' AND a.email_verified_at IS NOT NULL;
$$;

-- Member-facing projection: no reviewer identity, no erasure internals.
CREATE FUNCTION uss.data_deletion_request_json(r uss.data_deletion_requests) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = pg_catalog, uss AS $$
  SELECT jsonb_build_object('id', r.id, 'status', r.status, 'reason', r.reason,
    'requestedAt', uss.data_rights_utc(r.requested_at), 'decidedAt', uss.data_rights_utc(r.decided_at),
    'decisionReason', r.decision_reason, 'cancelledAt', uss.data_rights_utc(r.cancelled_at),
    'executedAt', uss.data_rights_utc(r.executed_at), 'version', r.version);
$$;

CREATE FUNCTION uss.request_account_deletion(actor uuid, allowed_roles text[], p_reason text, p_confirm_email text)
RETURNS TABLE(out_code text, out_data jsonb)
LANGUAGE plpgsql SET search_path = pg_catalog, uss AS $$
DECLARE v_account uss.accounts; v_open uss.data_deletion_requests; v_new uss.data_deletion_requests; v_reason text;
BEGIN
  v_reason := NULLIF(btrim(p_reason), '');
  IF actor IS NULL OR p_confirm_email IS NULL OR length(p_confirm_email) > 320
    OR (v_reason IS NOT NULL AND (length(v_reason) > 500 OR v_reason ~ '[<>[:cntrl:]]')) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  -- The account row lock serializes concurrent submissions from the same member.
  SELECT * INTO v_account FROM uss.accounts WHERE id = actor FOR UPDATE;
  IF v_account.id IS NULL OR NOT uss.data_rights_authorized(actor, allowed_roles) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  IF lower(btrim(p_confirm_email)) <> lower(v_account.email::text) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_CONFIRMATION_MISMATCH'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_open FROM uss.data_deletion_requests
    WHERE account_id = actor AND status IN ('pending','approved') FOR UPDATE;
  IF v_open.id IS NOT NULL THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_REQUEST_OPEN'::text, uss.data_deletion_request_json(v_open); RETURN;
  END IF;
  IF (SELECT count(*) FROM uss.data_deletion_requests WHERE account_id = actor
    AND requested_at > clock_timestamp() - interval '24 hours') >= 3 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_RATE_LIMITED'::text, NULL::jsonb; RETURN;
  END IF;
  IF uss.data_rights_has_role(actor, 'super_admin') AND uss.data_rights_usable_super_admins() <= 1 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_LAST_SUPER_ADMIN'::text, NULL::jsonb; RETURN;
  END IF;
  INSERT INTO uss.data_deletion_requests(account_id, reason) VALUES (actor, v_reason) RETURNING * INTO v_new;
  INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
    VALUES (actor, 'data_rights.deletion.requested', 'data_deletion_request', v_new.id,
      jsonb_build_object('toStatus', 'pending', 'hasReason', v_reason IS NOT NULL, 'version', v_new.version));
  RETURN QUERY SELECT 'OK'::text, uss.data_deletion_request_json(v_new);
END;
$$;

CREATE FUNCTION uss.cancel_account_deletion(actor uuid, allowed_roles text[], p_request uuid, p_version integer)
RETURNS TABLE(out_code text, out_data jsonb)
LANGUAGE plpgsql SET search_path = pg_catalog, uss AS $$
DECLARE v_request uss.data_deletion_requests; v_from text;
BEGIN
  IF actor IS NULL OR p_request IS NULL OR p_version IS NULL OR p_version < 1 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  PERFORM id FROM uss.accounts WHERE id = actor FOR UPDATE;
  IF NOT uss.data_rights_authorized(actor, allowed_roles) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  -- Ownership is part of the lookup: another member's request is indistinguishable from absent.
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request AND account_id = actor FOR UPDATE;
  IF v_request.id IS NULL THEN RETURN QUERY SELECT 'DATA_RIGHTS_NOT_FOUND'::text, NULL::jsonb; RETURN; END IF;
  IF v_request.status NOT IN ('pending','approved') THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_TRANSITION'::text, uss.data_deletion_request_json(v_request); RETURN;
  END IF;
  IF v_request.version <> p_version THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_CONFLICT'::text, uss.data_deletion_request_json(v_request); RETURN;
  END IF;
  v_from := v_request.status;
  UPDATE uss.data_deletion_requests SET status = 'cancelled', cancelled_at = clock_timestamp()
    WHERE id = p_request RETURNING * INTO v_request;
  INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
    VALUES (actor, 'data_rights.deletion.cancelled', 'data_deletion_request', v_request.id,
      jsonb_build_object('fromStatus', v_from, 'toStatus', 'cancelled', 'version', v_request.version));
  RETURN QUERY SELECT 'OK'::text, uss.data_deletion_request_json(v_request);
END;
$$;

CREATE FUNCTION uss.decide_account_deletion(actor uuid, allowed_roles text[], p_request uuid, p_decision text,
  p_version integer, p_reason text)
RETURNS TABLE(out_code text, out_data jsonb)
LANGUAGE plpgsql SET search_path = pg_catalog, uss AS $$
DECLARE v_request uss.data_deletion_requests; v_status text; v_reason text;
BEGIN
  v_reason := btrim(p_reason);
  IF actor IS NULL OR p_request IS NULL OR p_version IS NULL OR p_version < 1
    OR p_decision IS NULL OR p_decision NOT IN ('approve','reject')
    OR v_reason IS NULL OR length(v_reason) < 5 OR length(v_reason) > 500 OR v_reason ~ '[<>[:cntrl:]]' THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request;
  IF v_request.id IS NULL THEN
    IF NOT uss.data_rights_authorized(actor, allowed_roles) OR NOT uss.data_rights_has_role(actor, 'super_admin') THEN
      RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
    END IF;
    RETURN QUERY SELECT 'DATA_RIGHTS_NOT_FOUND'::text, NULL::jsonb; RETURN;
  END IF;
  -- Global account ordering matches manage_account/manage_role; super_admin row serializes role changes.
  PERFORM id FROM uss.accounts WHERE id IN (actor, v_request.account_id) ORDER BY id FOR UPDATE;
  PERFORM r.id FROM uss.roles r WHERE r.code = 'super_admin' FOR UPDATE;
  IF NOT uss.data_rights_authorized(actor, allowed_roles) OR NOT uss.data_rights_has_role(actor, 'super_admin') THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request FOR UPDATE;
  IF v_request.account_id = actor THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_SELF_ACTION_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  IF v_request.status <> 'pending' THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_TRANSITION'::text, NULL::jsonb; RETURN;
  END IF;
  IF v_request.version <> p_version THEN RETURN QUERY SELECT 'DATA_RIGHTS_CONFLICT'::text, NULL::jsonb; RETURN; END IF;
  IF p_decision = 'approve' AND uss.data_rights_has_role(v_request.account_id, 'super_admin')
    AND uss.data_rights_usable_super_admins() <= 1 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_LAST_SUPER_ADMIN'::text, NULL::jsonb; RETURN;
  END IF;
  v_status := CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END;
  UPDATE uss.data_deletion_requests SET status = v_status, decided_by = actor, decided_at = clock_timestamp(),
    decision_reason = v_reason WHERE id = p_request RETURNING * INTO v_request;
  INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
    VALUES (actor, 'data_rights.deletion.' || v_status, 'data_deletion_request', v_request.id,
      jsonb_build_object('fromStatus', 'pending', 'toStatus', v_status, 'reason', v_reason,
        'subjectAccountId', v_request.account_id, 'version', v_request.version));
  RETURN QUERY SELECT 'OK'::text, uss.data_deletion_request_json(v_request);
END;
$$;

-- SECURITY DEFINER: the runtime role has no DELETE privilege. Authority is re-derived from the DB
-- inside the function (active, verified super_admin, not the subject). One transaction performs
-- every DB erasure step plus audit; any failure rolls all of it back. Re-running on an executed
-- request is a no-op that only reports the storage objects still owed a physical delete.
CREATE FUNCTION uss.execute_account_deletion(actor uuid, p_request uuid, p_version integer)
RETURNS TABLE(out_code text, out_data jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, uss AS $$
DECLARE
  v_request uss.data_deletion_requests; v_target uss.accounts;
  v_roles integer; v_passes integer; v_registrations integer; v_answers integer; v_notes integer;
  v_notifications integer; v_tokens integer; v_profiles integer; v_avatars integer; v_summary jsonb;
BEGIN
  IF actor IS NULL OR p_request IS NULL OR p_version IS NULL OR p_version < 1 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request;
  IF v_request.id IS NULL THEN
    IF NOT uss.data_rights_authorized(actor, ARRAY['super_admin']) THEN
      RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
    END IF;
    RETURN QUERY SELECT 'DATA_RIGHTS_NOT_FOUND'::text, NULL::jsonb; RETURN;
  END IF;
  PERFORM id FROM uss.accounts WHERE id IN (actor, v_request.account_id) ORDER BY id FOR UPDATE;
  PERFORM r.id FROM uss.roles r WHERE r.code = 'super_admin' FOR UPDATE;
  IF NOT uss.data_rights_authorized(actor, ARRAY['super_admin']) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request FOR UPDATE;
  IF v_request.account_id = actor THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_SELF_ACTION_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_target FROM uss.accounts WHERE id = v_request.account_id;
  IF v_request.status = 'executed' THEN
    RETURN QUERY SELECT 'OK'::text, jsonb_build_object('alreadyExecuted', true,
      'request', uss.data_deletion_request_json(v_request), 'providerUserId', v_target.auth_provider_user_id,
      'objects', COALESCE((SELECT jsonb_agg(jsonb_build_object('mediaId', o.media_id, 'storageProvider', m.storage_provider,
        'storageKey', m.storage_key) ORDER BY o.media_id) FROM uss.data_erasure_objects o
        JOIN uss.media_assets m ON m.id = o.media_id WHERE o.request_id = p_request AND o.status = 'pending'), '[]'::jsonb));
    RETURN;
  END IF;
  IF v_request.status <> 'approved' THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_TRANSITION'::text, NULL::jsonb; RETURN;
  END IF;
  IF v_request.version <> p_version THEN RETURN QUERY SELECT 'DATA_RIGHTS_CONFLICT'::text, NULL::jsonb; RETURN; END IF;
  IF uss.data_rights_has_role(v_target.id, 'super_admin') AND uss.data_rights_usable_super_admins() <= 1 THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_LAST_SUPER_ADMIN'::text, NULL::jsonb; RETURN;
  END IF;

  -- 1. Account: deactivate first so triggers revoke passes and suppress new notifications.
  SELECT count(*)::integer INTO v_passes FROM uss.event_passes p JOIN uss.event_registrations r ON r.id = p.registration_id
    WHERE r.account_id = v_target.id AND p.status = 'active';
  UPDATE uss.accounts SET status = 'deactivated', email = ('deleted-' || id::text || '@erased.invalid')::public.citext,
    display_name = NULL, last_login_at = NULL, email_verified_at = NULL WHERE id = v_target.id;
  DELETE FROM uss.account_roles WHERE account_id = v_target.id;
  GET DIAGNOSTICS v_roles = ROW_COUNT;
  UPDATE uss.email_verification_tokens SET invalidated_at = clock_timestamp()
    WHERE account_id = v_target.id AND consumed_at IS NULL AND invalidated_at IS NULL;
  GET DIAGNOSTICS v_tokens = ROW_COUNT;

  -- 2. Profile and avatar: rows erased, avatar assets archived and queued for physical delete.
  INSERT INTO uss.data_erasure_objects(request_id, media_id)
    SELECT p_request, m.id FROM uss.media_assets m WHERE m.uploaded_by = v_target.id AND m.purpose = 'member_avatar'
    ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_avatars = ROW_COUNT;
  DELETE FROM uss.member_profiles WHERE account_id = v_target.id;
  GET DIAGNOSTICS v_profiles = ROW_COUNT;
  UPDATE uss.media_assets SET status = 'archived', archived_at = COALESCE(archived_at, clock_timestamp()),
    alt_text = NULL, caption = NULL, original_filename = NULL
    WHERE uploaded_by = v_target.id AND purpose = 'member_avatar';

  -- 3. Event participation: rows retained for anonymised counts; free text and answers erased;
  --    upcoming registrations release their place.
  UPDATE uss.event_registrations r SET status = 'cancelled', cancelled_at = clock_timestamp()
    FROM uss.events e WHERE e.id = r.event_id AND r.account_id = v_target.id
      AND r.status IN ('pending','confirmed','waitlisted') AND e.starts_at > clock_timestamp();
  GET DIAGNOSTICS v_registrations = ROW_COUNT;
  UPDATE uss.event_registrations SET admin_note = NULL WHERE account_id = v_target.id AND admin_note IS NOT NULL;
  GET DIAGNOSTICS v_notes = ROW_COUNT;
  DELETE FROM uss.registration_field_values v USING uss.event_registrations r
    WHERE r.id = v.registration_id AND r.event_id = v.event_id AND r.account_id = v_target.id;
  GET DIAGNOSTICS v_answers = ROW_COUNT;

  -- 4. Notification history: delivery facts retained, recipient and rendered payload redacted.
  PERFORM set_config('uss.erasure_account', v_target.id::text, true);
  UPDATE uss.notification_deliveries SET recipient = 'erased@erased.invalid',
    payload = CASE WHEN payload IS NULL THEN NULL ELSE '{"erased": true}'::jsonb END,
    last_error_summary = NULL,
    cancelled_at = CASE WHEN cancelled_at IS NULL AND status IN ('queued','failed') THEN clock_timestamp() ELSE cancelled_at END,
    retryable = false, next_attempt_at = NULL
    WHERE account_id = v_target.id;
  GET DIAGNOSTICS v_notifications = ROW_COUNT;
  PERFORM set_config('uss.erasure_account', '', true);

  v_summary := jsonb_build_object('rolesRemoved', v_roles, 'passesRevoked', v_passes,
    'verificationTokensInvalidated', v_tokens, 'profilesErased', v_profiles, 'avatarObjectsQueued', v_avatars,
    'registrationsCancelled', v_registrations, 'registrationNotesErased', v_notes,
    'registrationAnswersErased', v_answers, 'notificationsRedacted', v_notifications);
  UPDATE uss.data_deletion_requests SET status = 'executed', executed_by = actor, executed_at = clock_timestamp(),
    reason = NULL, erasure_summary = v_summary WHERE id = p_request RETURNING * INTO v_request;
  INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
    VALUES (actor, 'data_rights.deletion.executed', 'data_deletion_request', v_request.id,
      jsonb_build_object('fromStatus', 'approved', 'toStatus', 'executed', 'subjectAccountId', v_target.id,
        'version', v_request.version, 'summary', v_summary)),
      (actor, 'account.erased', 'account', v_target.id,
      jsonb_build_object('changedFields', ARRAY['status','email','display_name','roles','profile'],
        'requestId', v_request.id, 'toStatus', 'deactivated'));
  RETURN QUERY SELECT 'OK'::text, jsonb_build_object('alreadyExecuted', false,
    'request', uss.data_deletion_request_json(v_request), 'providerUserId', v_target.auth_provider_user_id,
    'objects', COALESCE((SELECT jsonb_agg(jsonb_build_object('mediaId', o.media_id, 'storageProvider', m.storage_provider,
      'storageKey', m.storage_key) ORDER BY o.media_id) FROM uss.data_erasure_objects o
      JOIN uss.media_assets m ON m.id = o.media_id WHERE o.request_id = p_request AND o.status = 'pending'), '[]'::jsonb));
END;
$$;

-- Post-commit provider outcomes (storage object deletes, provider session revocation) are audited
-- separately because external I/O can never be part of the erasure transaction.
CREATE FUNCTION uss.record_erasure_followup(actor uuid, p_request uuid, p_kind text, p_media uuid,
  p_outcome text, p_error text)
RETURNS TABLE(out_code text, out_data jsonb)
LANGUAGE plpgsql SET search_path = pg_catalog, uss AS $$
DECLARE v_request uss.data_deletion_requests; v_object uss.data_erasure_objects;
BEGIN
  IF actor IS NULL OR p_request IS NULL OR p_kind IS NULL OR p_kind NOT IN ('object','sessions')
    OR (p_kind = 'object' AND p_media IS NULL) OR p_outcome IS NULL
    OR p_outcome NOT IN ('deleted','failed','revoked','unavailable')
    OR (p_error IS NOT NULL AND p_error !~ '^[A-Z_]{1,64}$') THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  PERFORM id FROM uss.accounts WHERE id = actor FOR SHARE;
  IF NOT uss.data_rights_authorized(actor, ARRAY['super_admin']) THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_FORBIDDEN'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_request FROM uss.data_deletion_requests WHERE id = p_request;
  IF v_request.id IS NULL THEN RETURN QUERY SELECT 'DATA_RIGHTS_NOT_FOUND'::text, NULL::jsonb; RETURN; END IF;
  IF v_request.status <> 'executed' THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_TRANSITION'::text, NULL::jsonb; RETURN;
  END IF;
  IF p_kind = 'sessions' THEN
    IF p_outcome NOT IN ('revoked','unavailable') THEN
      RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
    END IF;
    INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
      VALUES (actor, 'data_rights.sessions.' || p_outcome, 'data_deletion_request', p_request,
        jsonb_build_object('subjectAccountId', v_request.account_id, 'errorCode', p_error));
    RETURN QUERY SELECT 'OK'::text, NULL::jsonb; RETURN;
  END IF;
  IF p_outcome NOT IN ('deleted','failed') THEN
    RETURN QUERY SELECT 'DATA_RIGHTS_INVALID_INPUT'::text, NULL::jsonb; RETURN;
  END IF;
  SELECT * INTO v_object FROM uss.data_erasure_objects WHERE request_id = p_request AND media_id = p_media FOR UPDATE;
  IF v_object.request_id IS NULL THEN RETURN QUERY SELECT 'DATA_RIGHTS_NOT_FOUND'::text, NULL::jsonb; RETURN; END IF;
  IF v_object.status = 'deleted' THEN RETURN QUERY SELECT 'OK'::text, NULL::jsonb; RETURN; END IF;
  UPDATE uss.data_erasure_objects SET attempts = attempts + 1, last_attempt_at = clock_timestamp(),
    status = CASE WHEN p_outcome = 'deleted' THEN 'deleted' ELSE 'pending' END,
    deleted_at = CASE WHEN p_outcome = 'deleted' THEN clock_timestamp() ELSE NULL END,
    last_error_code = CASE WHEN p_outcome = 'deleted' THEN NULL ELSE COALESCE(p_error, 'DATA_RIGHTS_STORAGE_FAILED') END
    WHERE request_id = p_request AND media_id = p_media;
  INSERT INTO uss.audit_logs(actor_account_id, action, entity_type, entity_id, change_summary)
    VALUES (actor, CASE WHEN p_outcome = 'deleted' THEN 'data_rights.erasure_object.deleted'
      ELSE 'data_rights.erasure_object.failed' END, 'media', p_media,
      jsonb_build_object('requestId', p_request, 'errorCode', p_error));
  RETURN QUERY SELECT 'OK'::text, NULL::jsonb;
END;
$$;

REVOKE ALL ON FUNCTION uss.guard_data_deletion_request(), uss.data_rights_utc(timestamptz),
  uss.data_rights_has_role(uuid,text), uss.data_rights_authorized(uuid,text[]), uss.data_rights_usable_super_admins(),
  uss.data_deletion_request_json(uss.data_deletion_requests),
  uss.request_account_deletion(uuid,text[],text,text), uss.cancel_account_deletion(uuid,text[],uuid,integer),
  uss.decide_account_deletion(uuid,text[],uuid,text,integer,text), uss.execute_account_deletion(uuid,uuid,integer),
  uss.record_erasure_followup(uuid,uuid,text,uuid,text,text) FROM PUBLIC;
