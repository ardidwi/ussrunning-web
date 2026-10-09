-- Existing artifacts without an email binding stay intact but cannot activate an account.
ALTER TABLE uss.email_verification_tokens ADD COLUMN email_hash text CHECK (email_hash ~ '^[0-9a-f]{64}$');
CREATE FUNCTION uss.guard_verification_email_binding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.email_hash IS DISTINCT FROM OLD.email_hash THEN
    RAISE EXCEPTION 'Verification email binding is immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER verification_email_binding_guard BEFORE UPDATE OF email_hash ON uss.email_verification_tokens
  FOR EACH ROW EXECUTE FUNCTION uss.guard_verification_email_binding();

-- SECURITY INVOKER: only trusted server traffic with ordinary app grants can call these operations.
-- Account row is the common lock for issue/consume/status mutations. Never hold it during email I/O.
CREATE FUNCTION uss.issue_email_verification(
  p_account_id uuid, p_token_hash text, p_ttl_seconds integer, p_cooldown_seconds integer,
  p_window_seconds integer, p_max_requests integer
) RETURNS TABLE(code text,retry_after_seconds integer,delivery_id uuid,recipient text)
LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE
  a uss.accounts%ROWTYPE; issued uss.email_verification_tokens%ROWTYPE;
  v_now timestamptz; latest timestamptz; earliest timestamptz; recent_count integer; delivery uuid;
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$'
    OR p_ttl_seconds IS NULL OR p_ttl_seconds NOT BETWEEN 60 AND 86400
    OR p_cooldown_seconds IS NULL OR p_cooldown_seconds NOT BETWEEN 1 AND 86400
    OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN p_cooldown_seconds AND 86400
    OR p_max_requests IS NULL OR p_max_requests NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Invalid verification policy' USING ERRCODE='22023';
  END IF;
  SELECT * INTO a FROM uss.accounts WHERE id=p_account_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT 'ACCOUNT_NOT_PROVISIONED',NULL::integer,NULL::uuid,NULL::text; RETURN; END IF;
  IF a.status='suspended' THEN RETURN QUERY SELECT 'ACCOUNT_SUSPENDED',NULL::integer,NULL::uuid,NULL::text; RETURN; END IF;
  IF a.status='deactivated' THEN RETURN QUERY SELECT 'ACCOUNT_DEACTIVATED',NULL::integer,NULL::uuid,NULL::text; RETURN; END IF;
  IF a.status='active' THEN RETURN QUERY SELECT 'ACCOUNT_ALREADY_ACTIVE',NULL::integer,NULL::uuid,NULL::text; RETURN; END IF;
  v_now:=clock_timestamp();
  SELECT max(created_at) INTO latest FROM uss.email_verification_tokens WHERE account_id=a.id AND purpose='verify_email';
  IF latest IS NOT NULL AND latest+make_interval(secs=>p_cooldown_seconds)>v_now THEN
    RETURN QUERY SELECT 'VERIFICATION_RESEND_COOLDOWN',ceil(extract(epoch FROM latest+make_interval(secs=>p_cooldown_seconds)-v_now))::integer,NULL::uuid,NULL::text;
    RETURN;
  END IF;
  -- Includes consumed/revoked artifacts: invalidating a token cannot reset rate limits.
  SELECT count(*)::integer,min(created_at) INTO recent_count,earliest FROM uss.email_verification_tokens
    WHERE account_id=a.id AND purpose='verify_email' AND created_at>v_now-make_interval(secs=>p_window_seconds);
  IF recent_count>=p_max_requests THEN
    RETURN QUERY SELECT 'VERIFICATION_RATE_LIMITED',greatest(1,ceil(extract(epoch FROM earliest+make_interval(secs=>p_window_seconds)-v_now))::integer),NULL::uuid,NULL::text;
    RETURN;
  END IF;
  UPDATE uss.email_verification_tokens SET invalidated_at=v_now
    WHERE account_id=a.id AND purpose='verify_email' AND consumed_at IS NULL AND invalidated_at IS NULL;
  INSERT INTO uss.email_verification_tokens(account_id,token_hash,email_hash,created_at,expires_at)
    VALUES(a.id,p_token_hash,encode(sha256(convert_to(lower(a.email::text),'UTF8')),'hex'),v_now,v_now+make_interval(secs=>p_ttl_seconds)) RETURNING * INTO issued;
  delivery:=gen_random_uuid();
  INSERT INTO uss.notification_deliveries(id,notification_type,account_id,recipient,idempotency_key,queued_at)
    VALUES(delivery,'account.verify_email',a.id,a.email::text,'verification/'||delivery::text,v_now);
  INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    VALUES(a.id,'account.verification_issued','email_verification_token',issued.id,jsonb_build_object('delivery_id',delivery));
  RETURN QUERY SELECT 'VERIFICATION_ISSUED',NULL::integer,delivery,a.email::text;
END;
$$;

CREATE FUNCTION uss.consume_email_verification(p_token_hash text) RETURNS text
LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE a uss.accounts%ROWTYPE; proof uss.email_verification_tokens%ROWTYPE; account_uuid uuid; v_now timestamptz; result text;
BEGIN
  SELECT account_id INTO account_uuid FROM uss.email_verification_tokens WHERE token_hash=p_token_hash AND purpose='verify_email';
  IF NOT FOUND THEN RETURN 'VERIFICATION_INVALID'; END IF;
  -- Same lock order as issuance: account first, then proof. Re-read proof after waiting.
  SELECT * INTO a FROM uss.accounts WHERE id=account_uuid FOR UPDATE;
  IF NOT FOUND THEN RETURN 'VERIFICATION_INVALID'; END IF;
  SELECT * INTO proof FROM uss.email_verification_tokens WHERE token_hash=p_token_hash AND purpose='verify_email' FOR UPDATE;
  IF NOT FOUND THEN RETURN 'VERIFICATION_INVALID'; END IF;
  v_now:=clock_timestamp();
  IF proof.consumed_at IS NOT NULL THEN RETURN 'VERIFICATION_ALREADY_USED'; END IF;
  IF proof.invalidated_at IS NOT NULL THEN RETURN 'VERIFICATION_INVALID'; END IF;
  IF proof.expires_at<=v_now THEN RETURN 'VERIFICATION_EXPIRED'; END IF;
  IF proof.email_hash IS NULL OR proof.email_hash<>encode(sha256(convert_to(lower(a.email::text),'UTF8')),'hex') THEN RETURN 'VERIFICATION_INVALID'; END IF;
  IF a.status='suspended' THEN RETURN 'ACCOUNT_SUSPENDED'; END IF;
  IF a.status='deactivated' THEN RETURN 'ACCOUNT_DEACTIVATED'; END IF;
  IF a.status NOT IN ('pending_verification','active') THEN RETURN 'VERIFICATION_INVALID'; END IF;
  UPDATE uss.email_verification_tokens SET consumed_at=v_now WHERE id=proof.id;
  UPDATE uss.email_verification_tokens SET invalidated_at=v_now
    WHERE account_id=a.id AND purpose='verify_email' AND id<>proof.id AND consumed_at IS NULL AND invalidated_at IS NULL;
  IF a.status='pending_verification' THEN
    -- Equivalent BE-02 activation policy, composed here with proof consumption for the HTTP driver.
    UPDATE uss.accounts SET status='active',email_verified_at=COALESCE(email_verified_at,v_now) WHERE id=a.id;
    INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id)
      VALUES(a.id,'account.activated','account',a.id);
    result:='VERIFICATION_SUCCESS';
  ELSE result:='ACCOUNT_ALREADY_ACTIVE'; END IF;
  INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id)
    VALUES(a.id,'account.verification_completed','email_verification_token',proof.id);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION uss.guard_verification_email_binding() FROM PUBLIC;
REVOKE ALL ON FUNCTION uss.issue_email_verification(uuid,text,integer,integer,integer,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION uss.consume_email_verification(text) FROM PUBLIC;
