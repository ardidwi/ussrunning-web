-- D2.6/D4.1: scheduled system delivery worker and automatic event pass issuance. Additive only.
-- Stale 'sending' leases are reclaimed by the worker; partial index keeps that scan bounded.
CREATE INDEX notification_stale_claim_idx ON uss.notification_deliveries(claimed_at,id)
 WHERE schema_version=1 AND cancelled_at IS NULL AND status='sending';

-- System claim for the cron worker. No actor: the caller is authenticated by the job secret before any DB access.
-- Row lock uses SKIP LOCKED so concurrent runs never wait on, or double-claim, the same intent. Claim commits before provider I/O.
CREATE FUNCTION uss.claim_notification_for_job(p_id uuid,p_hash text,p_provider text,p_lease_seconds integer,p_max_attempts integer)
RETURNS TABLE(code text,record jsonb) LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE d uss.notification_deliveries%ROWTYPE; a uss.accounts%ROWTYPE; r uss.event_registrations%ROWTYPE; e uss.events%ROWTYPE; p uss.event_passes%ROWTYPE;
BEGIN
 IF p_hash IS NULL OR p_provider IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_provider !~ '^[a-z0-9_-]{1,40}$'
 OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 60 AND 3600 OR p_max_attempts IS NULL OR p_max_attempts NOT BETWEEN 1 AND 3 THEN
  RAISE EXCEPTION 'Invalid notification job claim' USING ERRCODE='22023'; END IF;
 SELECT * INTO d FROM uss.notification_deliveries WHERE id=p_id AND schema_version=1;
 IF NOT FOUND THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_FOUND',NULL::jsonb; RETURN; END IF;
 -- Same lock order as the managed claim: account, event, registration, pass, then the delivery row.
 SELECT * INTO a FROM uss.accounts WHERE id=d.account_id FOR SHARE;
 SELECT * INTO e FROM uss.events WHERE id=d.event_id FOR SHARE;
 SELECT * INTO r FROM uss.event_registrations WHERE id=d.registration_id AND event_id=d.event_id AND account_id=d.account_id FOR SHARE;
 IF d.pass_id IS NOT NULL THEN SELECT * INTO p FROM uss.event_passes WHERE id=d.pass_id AND registration_id=r.id AND event_id=e.id FOR SHARE; END IF;
 SELECT * INTO d FROM uss.notification_deliveries WHERE id=p_id FOR UPDATE SKIP LOCKED;
 IF NOT FOUND THEN RETURN QUERY SELECT 'NOTIFICATION_LOCKED',NULL::jsonb; RETURN; END IF;
 IF d.status='sent' THEN RETURN QUERY SELECT 'NOTIFICATION_ALREADY_SENT',NULL::jsonb; RETURN; END IF;
 IF d.cancelled_at IS NOT NULL THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN; END IF;
 IF a.status<>'active' OR a.email_verified_at IS NULL OR a.email::text<>d.recipient OR r.id IS NULL
 OR r.status<>d.payload->>'registrationStatus' OR e.status IN ('draft','archived') OR e.visibility='private'
 OR (e.status='cancelled' AND d.notification_type<>'registration_cancelled')
 OR (d.notification_type='event_pass_available' AND (p.id IS NULL OR p.status<>'active' OR p.format_version<>1 OR e.status NOT IN ('published','registration_open','registration_closed') OR e.eligibility_config<>'{}'::jsonb OR (e.ends_at IS NOT NULL AND e.ends_at<=clock_timestamp()) OR (p.expires_at IS NOT NULL AND p.expires_at<=clock_timestamp()))) THEN
  UPDATE uss.notification_deliveries SET cancelled_at=clock_timestamp(),retryable=false,next_attempt_at=NULL,last_error_code='NOTIFICATION_SUPERSEDED' WHERE id=p_id;
  RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN;
 END IF;
 IF d.status='sending' AND d.claimed_at>clock_timestamp()-make_interval(secs=>p_lease_seconds) THEN RETURN QUERY SELECT 'NOTIFICATION_LOCKED',NULL::jsonb; RETURN; END IF;
 IF d.status='failed' AND NOT d.retryable THEN RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN; END IF;
 IF d.status<>'sending' AND d.next_attempt_at>clock_timestamp() THEN RETURN QUERY SELECT 'NOTIFICATION_RATE_LIMITED',NULL::jsonb; RETURN; END IF;
 -- Attempt cap and provider idempotency window (Resend keeps keys 24h; 20h leaves margin). Terminal state stays visible as failed.
 IF d.attempt_count>=p_max_attempts OR (d.first_attempt_at IS NOT NULL AND d.first_attempt_at<clock_timestamp()-interval '20 hours') THEN
  UPDATE uss.notification_deliveries SET status='failed',retryable=false,next_attempt_at=NULL,failed_at=COALESCE(failed_at,clock_timestamp()),
   last_error_code=CASE WHEN d.status='sending' THEN 'EMAIL_DELIVERY_UNCERTAIN' ELSE COALESCE(d.last_error_code,'NOTIFICATION_RETRY_EXHAUSTED') END WHERE id=p_id;
  RETURN QUERY SELECT 'NOTIFICATION_NOT_RETRYABLE',NULL::jsonb; RETURN;
 END IF;
 -- A retry must replay the exact first envelope; a changed one would defeat provider idempotency.
 IF d.envelope_hash IS NOT NULL AND (d.envelope_hash<>p_hash OR d.provider<>p_provider) THEN
  UPDATE uss.notification_deliveries SET status='failed',retryable=false,next_attempt_at=NULL,failed_at=clock_timestamp(),last_error_code='NOTIFICATION_ENVELOPE_CHANGED' WHERE id=p_id;
  RETURN QUERY SELECT 'NOTIFICATION_CONFLICT',NULL::jsonb; RETURN;
 END IF;
 UPDATE uss.notification_deliveries SET status='sending',provider=p_provider,envelope_hash=p_hash,claimed_at=clock_timestamp(),first_attempt_at=COALESCE(first_attempt_at,clock_timestamp()),claim_id=gen_random_uuid(),
  attempt_count=attempt_count+1,retryable=false,next_attempt_at=NULL WHERE id=p_id RETURNING * INTO d;
 IF d.attempt_count>1 THEN INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary) VALUES(NULL,'notification.retry_requested','notification',d.id,jsonb_build_object('attemptCount',d.attempt_count,'initiator','system')); END IF;
 RETURN QUERY SELECT 'OK',to_jsonb(d);
END;$$;

-- D4.1: issue a v1 event pass for a confirmed registration. The token hash is computed by the application keyring;
-- eligibility mirrors the managed issuance decision. One pass per registration (unique), never re-issued after revocation.
CREATE FUNCTION uss.issue_event_pass_for_job(p_registration uuid,p_pass uuid,p_hash text,p_key_id text)
RETURNS TABLE(code text,pass_id uuid) LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE r uss.event_registrations%ROWTYPE; a uss.accounts%ROWTYPE; e uss.events%ROWTYPE; existing uuid;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' OR p_key_id IS NULL OR p_key_id !~ '^[a-zA-Z0-9_-]{1,32}$' OR p_pass IS NULL THEN
  RAISE EXCEPTION 'Invalid event pass issuance' USING ERRCODE='22023'; END IF;
 SELECT * INTO r FROM uss.event_registrations WHERE id=p_registration;
 IF NOT FOUND THEN RETURN QUERY SELECT 'EVENT_PASS_NOT_FOUND',NULL::uuid; RETURN; END IF;
 -- Lock order matches lib/passes/pass-repository.ts: account, event, registration, pass.
 SELECT * INTO a FROM uss.accounts WHERE id=r.account_id FOR UPDATE;
 SELECT * INTO e FROM uss.events WHERE id=r.event_id FOR UPDATE;
 SELECT * INTO r FROM uss.event_registrations WHERE id=p_registration FOR UPDATE;
 SELECT p.id INTO existing FROM uss.event_passes p WHERE p.registration_id=r.id FOR UPDATE;
 IF existing IS NOT NULL THEN RETURN QUERY SELECT 'EVENT_PASS_EXISTS',existing; RETURN; END IF;
 IF r.status<>'confirmed' OR r.cancelled_at IS NOT NULL OR a.status<>'active' OR a.email_verified_at IS NULL
 OR e.status NOT IN ('published','registration_open','registration_closed') OR e.archived_at IS NOT NULL OR e.visibility='private'
 OR e.eligibility_config<>'{}'::jsonb OR (e.ends_at IS NOT NULL AND e.ends_at<=clock_timestamp()) THEN
  RETURN QUERY SELECT 'EVENT_PASS_NOT_ELIGIBLE',NULL::uuid; RETURN; END IF;
 IF cardinality(uss.member_profile_missing(a.id))>0 THEN RETURN QUERY SELECT 'PROFILE_INCOMPLETE',NULL::uuid; RETURN; END IF;
 INSERT INTO uss.event_passes(id,registration_id,event_id,token_hash,format_version,token_key_id,expires_at)
 VALUES(p_pass,r.id,r.event_id,p_hash,1,p_key_id,e.ends_at);
 INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
 VALUES(NULL,'event_pass.issued','event_pass',p_pass,jsonb_build_object('registrationId',r.id,'eventId',r.event_id,'formatVersion',1,'initiator','system'));
 RETURN QUERY SELECT 'EVENT_PASS_ISSUED',p_pass;
END;$$;
REVOKE ALL ON FUNCTION uss.claim_notification_for_job(uuid,text,text,integer,integer),uss.issue_event_pass_for_job(uuid,uuid,text,text) FROM PUBLIC;
