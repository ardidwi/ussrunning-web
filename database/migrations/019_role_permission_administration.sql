-- BE-18: narrow elevated-role administration. Runtime callers may only manage admin/super_admin.
-- The member baseline remains provisioning-owned. Every super_admin change is serialized on the
-- super_admin role row and the last-usable-super-admin invariant is checked in the same transaction.

CREATE FUNCTION uss.manage_role(
  actor uuid,
  target uuid,
  operation text,
  role_code text,
  expected_version integer,
  reason text
) RETURNS TABLE(code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,uss AS $$
DECLARE
  actor_account uss.accounts;
  target_account uss.accounts;
  managed_role uss.roles;
  assigned boolean;
  usable_super_admins integer;
  next_version integer;
BEGIN
  IF actor IS NULL OR target IS NULL OR actor=target
    OR operation IS NULL OR operation NOT IN ('grant','revoke')
    OR role_code IS NULL OR role_code NOT IN ('admin','super_admin')
    OR expected_version IS NULL OR expected_version<1
    OR reason IS NULL OR length(btrim(reason))<5 OR length(reason)>500
    OR reason ~ '[<>[:cntrl:]]' THEN
    RETURN QUERY SELECT CASE WHEN actor=target THEN 'ROLE_SELF_ACTION_FORBIDDEN' ELSE 'ROLE_INVALID_INPUT' END::text;
    RETURN;
  END IF;

  -- Global account ordering matches BE-17 and prevents opposing actor/target deadlocks.
  PERFORM id FROM uss.accounts WHERE id IN(actor,target) ORDER BY id FOR UPDATE;
  SELECT * INTO actor_account FROM uss.accounts WHERE id=actor;
  SELECT * INTO target_account FROM uss.accounts WHERE id=target;
  IF actor_account.id IS NULL OR actor_account.status<>'active' OR actor_account.email_verified_at IS NULL
    OR NOT EXISTS(
      SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id
      WHERE ar.account_id=actor AND r.code='super_admin'
    ) THEN
    RETURN QUERY SELECT 'ROLE_FORBIDDEN'::text; RETURN;
  END IF;
  IF target_account.id IS NULL THEN RETURN QUERY SELECT 'ROLE_TARGET_NOT_FOUND'::text; RETURN; END IF;
  IF target_account.version<>expected_version THEN RETURN QUERY SELECT 'ROLE_CONFLICT'::text; RETURN; END IF;

  -- Qualify the role-code column because RETURNS TABLE(code text) creates an output variable named
  -- code inside PL/pgSQL. Leaving the column unqualified makes PostgreSQL treat the reference as
  -- ambiguous and fails the function at runtime.
  SELECT r.* INTO managed_role FROM uss.roles AS r WHERE r.code=role_code FOR UPDATE;
  IF managed_role.id IS NULL OR managed_role.system_locked IS DISTINCT FROM true THEN
    RETURN QUERY SELECT 'ROLE_UNAVAILABLE'::text; RETURN;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM uss.account_roles WHERE account_id=target AND role_id=managed_role.id
  ) INTO assigned;

  IF operation='grant' THEN
    IF target_account.status<>'active' OR target_account.email_verified_at IS NULL THEN
      RETURN QUERY SELECT 'ROLE_TARGET_INELIGIBLE'::text; RETURN;
    END IF;
    IF assigned THEN RETURN QUERY SELECT 'ROLE_ALREADY_ASSIGNED'::text; RETURN; END IF;
    INSERT INTO uss.account_roles(account_id,role_id,granted_by) VALUES(target,managed_role.id,actor);
  ELSE
    IF NOT assigned THEN RETURN QUERY SELECT 'ROLE_NOT_ASSIGNED'::text; RETURN; END IF;
    IF role_code='super_admin' THEN
      SELECT count(*)::integer INTO usable_super_admins
      FROM uss.accounts a
      JOIN uss.account_roles ar ON ar.account_id=a.id
      JOIN uss.roles r ON r.id=ar.role_id
      WHERE r.code='super_admin' AND a.status='active' AND a.email_verified_at IS NOT NULL;
      IF usable_super_admins<=1 THEN
        RETURN QUERY SELECT 'ROLE_LAST_SUPER_ADMIN'::text; RETURN;
      END IF;
    END IF;
    DELETE FROM uss.account_roles WHERE account_id=target AND role_id=managed_role.id;
  END IF;

  -- Explicitly request the optimistic version advance. BE-17's BEFORE UPDATE trigger also
  -- normalizes NEW.version to OLD.version+1, so this remains exactly one increment on current
  -- schemas while preserving the intended version change on compatible upgrade paths.
  UPDATE uss.accounts
    SET version=version+1, updated_at=clock_timestamp()
    WHERE id=target
    RETURNING version INTO next_version;
  INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    VALUES(
      actor,
      CASE WHEN operation='grant' THEN 'role.granted' ELSE 'role.revoked' END,
      'account',
      target,
      jsonb_build_object(
        'changedFields',ARRAY['roles'],
        'role',role_code,
        'operation',operation,
        'reason',btrim(reason),
        'version',next_version
      )
    );
  RETURN QUERY SELECT 'OK'::text;
END;
$$;

-- Initial ownership bootstrap is deliberately NOT granted to the application role. Only the
-- database owner/operator may invoke it, and only when no super_admin assignment exists.
CREATE FUNCTION uss.bootstrap_super_admin(target uuid, reason text)
RETURNS TABLE(code text)
LANGUAGE plpgsql
SET search_path=pg_catalog,uss AS $$
DECLARE
  target_account uss.accounts;
  super_role uss.roles;
  next_version integer;
BEGIN
  IF target IS NULL OR reason IS NULL OR length(btrim(reason))<5 OR length(reason)>500
    OR reason ~ '[<>[:cntrl:]]' THEN
    RETURN QUERY SELECT 'ROLE_INVALID_INPUT'::text; RETURN;
  END IF;
  SELECT * INTO target_account FROM uss.accounts WHERE id=target FOR UPDATE;
  IF target_account.id IS NULL THEN RETURN QUERY SELECT 'ROLE_TARGET_NOT_FOUND'::text; RETURN; END IF;
  IF target_account.status<>'active' OR target_account.email_verified_at IS NULL THEN
    RETURN QUERY SELECT 'ROLE_TARGET_INELIGIBLE'::text; RETURN;
  END IF;

  -- Same output-variable ambiguity applies here because this function also RETURNS TABLE(code text).
  SELECT r.* INTO super_role FROM uss.roles AS r WHERE r.code='super_admin' FOR UPDATE;
  IF super_role.id IS NULL THEN RETURN QUERY SELECT 'ROLE_UNAVAILABLE'::text; RETURN; END IF;
  IF EXISTS(
    SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE r.code='super_admin'
  ) THEN
    RETURN QUERY SELECT 'ROLE_BOOTSTRAP_CLOSED'::text; RETURN;
  END IF;
  INSERT INTO uss.account_roles(account_id,role_id,granted_by) VALUES(target,super_role.id,NULL);
  UPDATE uss.accounts
    SET version=version+1, updated_at=clock_timestamp()
    WHERE id=target
    RETURNING version INTO next_version;
  INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,change_summary)
    VALUES(NULL,'role.bootstrap','account',target,jsonb_build_object(
      'changedFields',ARRAY['roles'],'role','super_admin','operation','bootstrap',
      'reason',btrim(reason),'version',next_version
    ));
  RETURN QUERY SELECT 'OK'::text;
END;
$$;

REVOKE ALL ON FUNCTION uss.manage_role(uuid,uuid,text,text,integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION uss.bootstrap_super_admin(uuid,text) FROM PUBLIC;
