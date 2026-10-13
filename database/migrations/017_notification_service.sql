-- BE-16: reuse deliveries. Legacy verification remains schema_version=0 and is never replayed.
ALTER TABLE uss.notification_deliveries
 ADD COLUMN schema_version integer NOT NULL DEFAULT 0 CHECK(schema_version IN (0,1)),
 ADD COLUMN template_key text,
 ADD COLUMN template_version integer CHECK(template_version IS NULL OR template_version=1),
 ADD COLUMN payload jsonb CHECK(payload IS NULL OR jsonb_typeof(payload)='object'),
 ADD COLUMN pass_id uuid REFERENCES uss.event_passes(id) ON DELETE RESTRICT,
 ADD COLUMN next_attempt_at timestamptz,
 ADD COLUMN retryable boolean NOT NULL DEFAULT false,
 ADD COLUMN cancelled_at timestamptz,
 ADD COLUMN claimed_at timestamptz,
 ADD COLUMN first_attempt_at timestamptz,
 ADD COLUMN claim_id uuid,
 ADD COLUMN envelope_hash text CHECK(envelope_hash IS NULL OR envelope_hash ~ '^[0-9a-f]{64}$'),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD CONSTRAINT notification_v1_shape CHECK(schema_version=0 OR
  (notification_type IN ('registration_confirmed','registration_waitlisted','registration_cancelled','event_pass_available')
   AND status IN ('queued','sending','sent','failed') AND channel='email' AND account_id IS NOT NULL AND registration_id IS NOT NULL AND event_id IS NOT NULL
   AND template_key IS NOT NULL AND template_key=notification_type AND template_version IS NOT NULL AND template_version=1 AND payload IS NOT NULL AND idempotency_key IS NOT NULL
   AND (notification_type<>'event_pass_available' OR pass_id IS NOT NULL)));
ALTER TABLE uss.notification_deliveries ADD CONSTRAINT notification_pass_scope_fk
 FOREIGN KEY(pass_id,registration_id,event_id) REFERENCES uss.event_passes(id,registration_id,event_id) ON DELETE RESTRICT;
-- Partial queue supports explicit/ future bounded workers without scanning BE-03 history.
CREATE INDEX notification_due_idx ON uss.notification_deliveries(next_attempt_at,queued_at,id)
 WHERE schema_version=1 AND cancelled_at IS NULL AND status IN ('queued','failed');
CREATE TRIGGER notification_identity_guard BEFORE UPDATE ON uss.notification_deliveries FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('id','schema_version','notification_type','channel','account_id','event_id','registration_id','pass_id','recipient','template_key','template_version','payload','idempotency_key','queued_at');
CREATE FUNCTION uss.touch_notification_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.updated_at:=clock_timestamp(); NEW.version:=OLD.version+1; RETURN NEW;
END;$$;
CREATE TRIGGER notification_version BEFORE UPDATE ON uss.notification_deliveries FOR EACH ROW EXECUTE FUNCTION uss.touch_notification_version();
CREATE TRIGGER notification_no_delete BEFORE DELETE ON uss.notification_deliveries FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER notification_no_truncate BEFORE TRUNCATE ON uss.notification_deliveries FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();

-- Invoker, no external I/O: domain row + intent commit/rollback together. No historical backfill sends.
CREATE FUNCTION uss.capture_application_notification() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE r uss.event_registrations%ROWTYPE; e uss.events%ROWTYPE; a uss.accounts%ROWTYPE;
 v_type text; v_pass uuid; v_key text;
BEGIN
 IF TG_TABLE_NAME='event_registrations' THEN
  IF TG_OP='UPDATE' AND NEW.status=OLD.status THEN RETURN NEW; END IF;
  r:=NEW;
  IF r.status NOT IN ('confirmed','waitlisted','cancelled') THEN RETURN NEW; END IF;
  v_type:='registration_'||r.status;
  v_key:='app/registration/'||r.id::text||'/'||r.status||'/'||extract(epoch FROM r.updated_at)::text;
  -- Superseded pending intents are retained, never sent as if still current.
  UPDATE uss.notification_deliveries SET cancelled_at=clock_timestamp(),retryable=false,next_attempt_at=NULL,last_error_code='NOTIFICATION_SUPERSEDED'
   WHERE schema_version=1 AND registration_id=r.id AND cancelled_at IS NULL AND status IN ('queued','failed');
 ELSE
  IF NEW.format_version<>1 OR NEW.status<>'active' THEN RETURN NEW; END IF;
  SELECT * INTO r FROM uss.event_registrations WHERE id=NEW.registration_id AND event_id=NEW.event_id;
  IF NOT FOUND OR r.status<>'confirmed' OR r.cancelled_at IS NOT NULL THEN RETURN NEW; END IF;
  v_type:='event_pass_available'; v_pass:=NEW.id; v_key:='app/pass/'||NEW.id::text||'/available/v1';
 END IF;
 SELECT * INTO a FROM uss.accounts WHERE id=r.account_id;
 SELECT * INTO e FROM uss.events WHERE id=r.event_id;
 IF a.status<>'active' OR a.email_verified_at IS NULL THEN RETURN NEW; END IF;
 INSERT INTO uss.notification_deliveries(notification_type,account_id,event_id,registration_id,pass_id,recipient,idempotency_key,
  schema_version,template_key,template_version,payload,next_attempt_at)
 VALUES(v_type,a.id,r.event_id,r.id,v_pass,a.email::text,v_key,1,v_type,1,
  jsonb_build_object('eventName',e.title,'eventSlug',CASE WHEN e.visibility='public' THEN e.slug ELSE NULL END,'displayName',COALESCE((SELECT full_name FROM uss.member_profiles WHERE account_id=a.id),a.display_name),'venue',NULLIF(concat_ws(', ',e.venue_name,e.location_text),''),'instructions',e.meeting_point_instructions,'startsAt',to_char(e.starts_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
   'timezone',e.timezone,'registrationId',r.id,'registrationStatus',r.status),clock_timestamp())
 ON CONFLICT(idempotency_key) DO NOTHING;
 RETURN NEW;
END;$$;
CREATE TRIGGER registration_notification_intent AFTER INSERT OR UPDATE OF status ON uss.event_registrations FOR EACH ROW EXECUTE FUNCTION uss.capture_application_notification();
CREATE TRIGGER pass_notification_intent AFTER INSERT ON uss.event_passes FOR EACH ROW EXECUTE FUNCTION uss.capture_application_notification();

-- Claim transaction ends before provider I/O. Fixed UUID/key/envelope across bounded retries.
CREATE FUNCTION uss.claim_application_notification(p_actor uuid,p_id uuid,p_hash text,p_provider text,p_version integer)
RETURNS TABLE(code text,record jsonb) LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE d uss.notification_deliveries%ROWTYPE; a uss.accounts%ROWTYPE; r uss.event_registrations%ROWTYPE; e uss.events%ROWTYPE; p uss.event_passes%ROWTYPE;
BEGIN
 IF p_hash IS NULL OR p_provider IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_provider !~ '^[a-z0-9_-]{1,40}$' THEN RAISE EXCEPTION 'Invalid notification claim' USING ERRCODE='22023'; END IF;
 SELECT * INTO d FROM uss.notification_deliveries WHERE id=p_id AND schema_version=1;
 IF NOT FOUND THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_FOUND',NULL::jsonb; RETURN; END IF;
 PERFORM id FROM uss.accounts WHERE id IN (p_actor,d.account_id) ORDER BY id FOR SHARE;
 PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=p_actor FOR SHARE OF ar,role;
 IF NOT EXISTS(SELECT 1 FROM uss.accounts WHERE id=p_actor AND status='active' AND email_verified_at IS NOT NULL)
 OR NOT EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles role ON role.id=ar.role_id WHERE ar.account_id=p_actor AND role.code IN ('admin','super_admin')) THEN
  RETURN QUERY SELECT 'NOTIFICATION_FORBIDDEN',NULL::jsonb; RETURN; END IF;
 SELECT * INTO a FROM uss.accounts WHERE id=d.account_id FOR SHARE;
 SELECT * INTO e FROM uss.events WHERE id=d.event_id FOR SHARE;
 SELECT * INTO r FROM uss.event_registrations WHERE id=d.registration_id AND event_id=d.event_id AND account_id=d.account_id FOR SHARE;
 IF d.pass_id IS NOT NULL THEN SELECT * INTO p FROM uss.event_passes WHERE id=d.pass_id AND registration_id=r.id AND event_id=e.id FOR SHARE; END IF;
 SELECT * INTO d FROM uss.notification_deliveries WHERE id=p_id FOR UPDATE;
 IF d.status='sent' THEN RETURN QUERY SELECT 'NOTIFICATION_ALREADY_SENT',NULL::jsonb; RETURN; END IF;
 IF p_version IS NULL OR d.version<>p_version THEN RETURN QUERY SELECT 'NOTIFICATION_CONFLICT',NULL::jsonb; RETURN; END IF;
 IF d.cancelled_at IS NOT NULL THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN; END IF;
 IF a.status<>'active' OR a.email_verified_at IS NULL OR a.email::text<>d.recipient OR r.id IS NULL
 OR r.status<>d.payload->>'registrationStatus' OR e.status IN ('draft','archived') OR e.visibility='private'
 OR (e.status='cancelled' AND d.notification_type<>'registration_cancelled')
 OR (d.notification_type='event_pass_available' AND (p.id IS NULL OR p.status<>'active' OR p.format_version<>1 OR e.status NOT IN ('published','registration_open','registration_closed') OR e.eligibility_config<>'{}'::jsonb OR (e.ends_at IS NOT NULL AND e.ends_at<=clock_timestamp()) OR (p.expires_at IS NOT NULL AND p.expires_at<=clock_timestamp()))) THEN
  UPDATE uss.notification_deliveries SET cancelled_at=clock_timestamp(),retryable=false,next_attempt_at=NULL,last_error_code='NOTIFICATION_SUPERSEDED' WHERE id=p_id;
  RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN;
 END IF;
 IF d.attempt_count>=3 OR (d.first_attempt_at IS NOT NULL AND d.first_attempt_at<clock_timestamp()-interval '20 hours') THEN
  RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN; END IF;
 IF d.status='sending' AND d.claimed_at>clock_timestamp()-interval '5 minutes' THEN RETURN QUERY SELECT 'NOTIFICATION_CONFLICT',NULL::jsonb; RETURN; END IF;
 IF d.status='failed' AND NOT d.retryable THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN; END IF;
 IF d.next_attempt_at>clock_timestamp() THEN RETURN QUERY SELECT 'NOTIFICATION_RATE_LIMITED',NULL::jsonb; RETURN; END IF;
 IF d.envelope_hash IS NOT NULL AND (d.envelope_hash<>p_hash OR d.provider<>p_provider) THEN RETURN QUERY SELECT 'NOTIFICATION_CONFLICT',NULL::jsonb; RETURN; END IF;
 UPDATE uss.notification_deliveries SET status='sending',provider=p_provider,envelope_hash=p_hash,claimed_at=clock_timestamp(),first_attempt_at=COALESCE(first_attempt_at,clock_timestamp()),claim_id=gen_random_uuid(),
  attempt_count=attempt_count+1,retryable=false,next_attempt_at=NULL WHERE id=p_id RETURNING * INTO d;
 IF d.attempt_count>1 THEN INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) VALUES(p_actor,'notification.retry_requested','notification',d.id,jsonb_build_object('attemptCount',d.attempt_count)); END IF;
 RETURN QUERY SELECT 'OK',to_jsonb(d);
END;$$;
REVOKE ALL ON FUNCTION uss.touch_notification_version(),uss.capture_application_notification(),uss.claim_application_notification(uuid,uuid,text,text,integer) FROM PUBLIC;
