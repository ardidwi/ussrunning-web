-- BE-17: account concurrency metadata; no identity/provider/role changes.
ALTER TABLE uss.accounts ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
  ADD COLUMN status_changed_at timestamptz;
-- Historic lifecycle time is unknown: do not fabricate it from last profile/login activity.
CREATE FUNCTION uss.version_account() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.version := OLD.version+1;
  NEW.status_changed_at := CASE WHEN NEW.status IS DISTINCT FROM OLD.status THEN clock_timestamp() ELSE OLD.status_changed_at END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER accounts_version BEFORE UPDATE ON uss.accounts FOR EACH ROW EXECUTE FUNCTION uss.version_account();
-- Keyset listing is ordered by immutable creation timestamp and UUID.
CREATE INDEX accounts_created_page_idx ON uss.accounts(created_at DESC,id);
-- Name-prefix search only; exact email/member ID already use their unique indexes.
CREATE INDEX accounts_display_name_prefix_idx ON uss.accounts(lower(display_name) text_pattern_ops);
-- Invoker only: caller is trusted server session, never a request-supplied actor.
-- BE-18 must coordinate role writes with these account/assignment row locks.
CREATE FUNCTION uss.manage_account(actor uuid,target uuid,operation text,expected_version integer,reason text)
RETURNS TABLE(code text) LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE a uss.accounts; t uss.accounts; next_status text; elevated boolean; usable integer;
BEGIN
  IF actor IS NULL OR target IS NULL OR expected_version IS NULL OR expected_version<1
    OR operation IS NULL OR operation NOT IN ('activate','suspend','deactivate')
    OR reason IS NULL OR length(btrim(reason))<5 OR length(reason)>500 OR reason ~ '[<>[:cntrl:]]' THEN
    RETURN QUERY SELECT 'USER_INVALID_INPUT'::text; RETURN;
  END IF;
  -- Global UUID ordering prevents opposing managed actions from deadlocking.
  PERFORM id FROM uss.accounts WHERE id IN(actor,target) ORDER BY id FOR UPDATE;
  PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
    WHERE ar.account_id IN(actor,target) ORDER BY ar.account_id,ar.role_id FOR SHARE OF ar,r;
  SELECT * INTO a FROM uss.accounts WHERE id=actor;
  IF NOT FOUND OR a.status<>'active' OR a.email_verified_at IS NULL OR NOT EXISTS(
    SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor AND r.code='super_admin') THEN
    RETURN QUERY SELECT 'USER_FORBIDDEN'::text; RETURN;
  END IF;
  SELECT * INTO t FROM uss.accounts WHERE id=target;
  IF NOT FOUND THEN RETURN QUERY SELECT 'USER_NOT_FOUND'::text; RETURN; END IF;
  SELECT EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
    WHERE ar.account_id=target AND r.code='super_admin') INTO elevated;
  -- No BE-17 action can disable ANY super_admin path; ownership changes belong to BE-18.
  IF elevated THEN
    SELECT count(*) INTO usable FROM (SELECT ac.id FROM uss.accounts ac WHERE ac.status='active'
      AND ac.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
      WHERE ar.account_id=ac.id AND r.code='super_admin') LIMIT 2) s;
    IF t.status='active' AND usable<=1 AND operation IN('suspend','deactivate') THEN
      RETURN QUERY SELECT 'USER_LAST_SUPER_ADMIN'::text; RETURN;
    END IF;
    IF actor=target THEN RETURN QUERY SELECT 'USER_SELF_ACTION_FORBIDDEN'::text; RETURN; END IF;
    RETURN QUERY SELECT 'USER_PROTECTED'::text; RETURN;
  END IF;
  IF t.version<>expected_version THEN RETURN QUERY SELECT 'USER_CONFLICT'::text; RETURN; END IF;
  IF operation='activate' THEN
    IF t.status='pending_verification' OR t.email_verified_at IS NULL THEN
      RETURN QUERY SELECT 'USER_VERIFICATION_UNAVAILABLE'::text; RETURN;
    END IF;
    IF t.status NOT IN('suspended','deactivated') THEN RETURN QUERY SELECT 'USER_INVALID_STATE'::text; RETURN; END IF;
    next_status:='active';
  ELSIF operation='suspend' THEN
    IF t.status<>'active' THEN RETURN QUERY SELECT 'USER_INVALID_STATE'::text; RETURN; END IF;
    next_status:='suspended';
  ELSE
    IF t.status NOT IN('pending_verification','active','suspended') THEN RETURN QUERY SELECT 'USER_INVALID_STATE'::text; RETURN; END IF;
    next_status:='deactivated';
  END IF;
  UPDATE uss.accounts SET status=next_status WHERE id=target;
  INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    VALUES(actor,CASE WHEN operation='activate' THEN 'account.reactivated' WHEN operation='suspend' THEN 'account.suspended' ELSE 'account.deactivated' END,
      'account',target,jsonb_build_object('changedFields',ARRAY['status'],'fromStatus',t.status,'toStatus',next_status,'reason',btrim(reason),'version',t.version+1));
  RETURN QUERY SELECT 'OK'::text;
END;
$$;
REVOKE ALL ON FUNCTION uss.version_account(),uss.manage_account(uuid,uuid,text,integer,text) FROM PUBLIC;
