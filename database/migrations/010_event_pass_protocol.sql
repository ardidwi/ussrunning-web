-- Additive BE-09 protocol. Existing token hashes are retained as unsupported legacy version 0.
ALTER TABLE uss.event_passes ADD COLUMN event_id uuid;
UPDATE uss.event_passes p SET event_id=r.event_id FROM uss.event_registrations r WHERE r.id=p.registration_id;
ALTER TABLE uss.event_passes ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE uss.event_passes ADD CONSTRAINT pass_registration_event_fk FOREIGN KEY(registration_id,event_id) REFERENCES uss.event_registrations(id,event_id) ON DELETE RESTRICT;
ALTER TABLE uss.event_passes ADD COLUMN format_version integer NOT NULL DEFAULT 0 CHECK (format_version IN (0,1));
ALTER TABLE uss.event_passes ADD COLUMN token_key_id text CHECK (token_key_id ~ '^[a-zA-Z0-9_-]{1,32}$');
ALTER TABLE uss.event_passes ADD COLUMN revoked_reason text CHECK (revoked_reason IN ('registration_ineligible','event_ineligible','account_ineligible','admin_revoked'));
ALTER TABLE uss.event_passes ADD CONSTRAINT pass_v1_key CHECK(format_version=0 OR token_key_id IS NOT NULL);
-- Supports event invalidation without scanning unrelated passes; token_hash and registration_id already unique/indexed.
CREATE INDEX passes_active_event_idx ON uss.event_passes(event_id) WHERE status='active';
CREATE TRIGGER pass_protocol_identity_guard BEFORE UPDATE ON uss.event_passes FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('event_id','format_version','token_hash','token_key_id','issued_at','expires_at');
CREATE FUNCTION uss.guard_terminal_pass() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status<>'active' AND NEW.status IS DISTINCT FROM OLD.status THEN
  RAISE EXCEPTION 'Pass terminal state is immutable' USING ERRCODE='23514';
 END IF;
 IF OLD.status='revoked' AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.revoked_reason IS DISTINCT FROM OLD.revoked_reason) THEN
  RAISE EXCEPTION 'Pass invalidation history is immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER pass_terminal_guard BEFORE UPDATE ON uss.event_passes FOR EACH ROW EXECUTE FUNCTION uss.guard_terminal_pass();
-- Invoker triggers: no privilege elevation. Revocation and minimized audit are atomic with the eligibility change.
CREATE FUNCTION uss.invalidate_event_passes() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reason text;
BEGIN
 IF TG_TABLE_NAME='event_registrations' THEN
  IF NEW.status='confirmed' AND NEW.cancelled_at IS NULL THEN RETURN NEW; END IF;
  reason:='registration_ineligible';
 ELSIF TG_TABLE_NAME='events' THEN
  IF NEW.status IN ('published','registration_open','registration_closed') AND NEW.archived_at IS NULL AND NEW.visibility<>'private' AND NEW.eligibility_config='{}'::jsonb AND (NEW.ends_at IS NULL OR NEW.ends_at>clock_timestamp()) THEN RETURN NEW; END IF;
  reason:='event_ineligible';
 ELSE
  IF NEW.status='active' AND NEW.email_verified_at IS NOT NULL THEN RETURN NEW; END IF;
  reason:='account_ineligible';
 END IF;
 -- Separate indexed target paths; one-time table-name filters avoid scanning unrelated passes.
 WITH targets AS MATERIALIZED (
  SELECT p.id FROM uss.event_passes p WHERE TG_TABLE_NAME='event_registrations' AND p.registration_id=NEW.id AND p.status='active'
  UNION ALL SELECT p.id FROM uss.event_passes p WHERE TG_TABLE_NAME='events' AND p.event_id=NEW.id AND p.status='active'
  UNION ALL SELECT p.id FROM uss.event_registrations r JOIN uss.event_passes p ON p.registration_id=r.id
   WHERE TG_TABLE_NAME='accounts' AND r.account_id=NEW.id AND p.status='active'
 ), changed AS (
  UPDATE uss.event_passes p SET status='revoked',revoked_at=clock_timestamp(),revoked_reason=reason
  FROM targets t WHERE p.id=t.id AND p.status='active'
  RETURNING p.id,p.registration_id,p.event_id
 ) INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 SELECT NULL,'event_pass.revoked','event_pass',id,jsonb_build_object('registrationId',registration_id,'eventId',event_id,'reason',reason,'initiator','system') FROM changed;
 RETURN NEW;
END;
$$;
CREATE TRIGGER registration_pass_invalidation AFTER UPDATE OF status,cancelled_at ON uss.event_registrations FOR EACH ROW EXECUTE FUNCTION uss.invalidate_event_passes();
CREATE TRIGGER event_pass_invalidation AFTER UPDATE OF status,visibility,archived_at,eligibility_config,ends_at ON uss.events FOR EACH ROW EXECUTE FUNCTION uss.invalidate_event_passes();
CREATE TRIGGER account_pass_invalidation AFTER UPDATE OF status,email_verified_at ON uss.accounts FOR EACH ROW EXECUTE FUNCTION uss.invalidate_event_passes();
REVOKE ALL ON FUNCTION uss.guard_terminal_pass(),uss.invalidate_event_passes() FROM PUBLIC;

-- Legacy inserts without event_id continue to use their immutable registration relation.
CREATE FUNCTION uss.fill_pass_event_id() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.event_id IS NULL THEN SELECT event_id INTO NEW.event_id FROM uss.event_registrations WHERE id=NEW.registration_id; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER pass_event_id_default BEFORE INSERT ON uss.event_passes FOR EACH ROW EXECUTE FUNCTION uss.fill_pass_event_id();
REVOKE ALL ON FUNCTION uss.fill_pass_event_id() FROM PUBLIC;
