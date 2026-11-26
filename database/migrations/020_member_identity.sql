-- Public-facing member numbers and the opaque barcode have independent identities.
CREATE SEQUENCE uss.member_number_sequence AS bigint;
ALTER TABLE uss.accounts ADD COLUMN member_number bigint NOT NULL DEFAULT nextval('uss.member_number_sequence');
ALTER SEQUENCE uss.member_number_sequence OWNED BY uss.accounts.member_number;
ALTER TABLE uss.accounts ADD CONSTRAINT accounts_member_number_valid CHECK (member_number > 0);
ALTER TABLE uss.accounts ADD CONSTRAINT accounts_member_number_unique UNIQUE (member_number);

CREATE OR REPLACE FUNCTION uss.guard_account_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.barcode_value IS DISTINCT FROM OLD.barcode_value
    OR NEW.member_number IS DISTINCT FROM OLD.member_number
    OR NEW.auth_provider_user_id IS DISTINCT FROM OLD.auth_provider_user_id THEN
    RAISE EXCEPTION 'Account identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION uss.format_member_number(number bigint) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT 'USS-' || lpad(number::text, greatest(6, length(number::text)), '0');
$$;

ALTER TABLE uss.media_assets ADD COLUMN purpose text NOT NULL DEFAULT 'cms'
  CHECK (purpose IN ('cms','member_avatar'));
ALTER TABLE uss.media_assets ADD CONSTRAINT member_avatar_private CHECK (
  purpose <> 'member_avatar' OR (visibility='private' AND public_url IS NULL
    AND storage_key LIKE 'member-avatars/%' AND uploaded_by IS NOT NULL)
);
CREATE TRIGGER media_purpose_guard BEFORE UPDATE ON uss.media_assets FOR EACH ROW
  EXECUTE FUNCTION uss.guard_event_relation_identity('purpose');

ALTER TABLE uss.member_profiles
  ADD COLUMN avatar_status text CHECK (avatar_status IN ('pending_review','approved','rejected')),
  ADD COLUMN avatar_reviewed_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  ADD COLUMN avatar_reviewed_at timestamptz,
  ADD COLUMN avatar_rejection_reason text,
  ADD CONSTRAINT profile_avatar_review_valid CHECK (
    (avatar_status IS NULL OR avatar_media_id IS NOT NULL)
    AND ((avatar_reviewed_by IS NULL) = (avatar_reviewed_at IS NULL))
    AND ((avatar_status IS NOT DISTINCT FROM 'rejected') = (avatar_rejection_reason IS NOT NULL))
    AND (avatar_rejection_reason IS NULL OR
         (avatar_reviewed_by IS NOT NULL AND length(btrim(avatar_rejection_reason)) BETWEEN 5 AND 240))
  );

CREATE FUNCTION uss.member_profile_missing(target uuid) RETURNS text[]
LANGUAGE sql STABLE SET search_path=pg_catalog,uss AS $$
  SELECT array_remove(ARRAY[
    CASE WHEN coalesce(length(btrim(p.full_name)),0)<2 THEN 'fullName' END,
    CASE WHEN p.phone IS NULL OR p.phone !~ '^[+]?[0-9]{7,15}$' THEN 'phone' END,
    CASE WHEN coalesce(length(btrim(p.emergency_contact_name)),0)<2
      OR p.emergency_contact_phone IS NULL OR p.emergency_contact_phone !~ '^[+]?[0-9]{7,15}$'
      THEN 'emergencyContact' END,
    CASE WHEN p.avatar_status IS DISTINCT FROM 'approved' OR NOT EXISTS (
      SELECT 1 FROM uss.media_assets m WHERE m.id=p.avatar_media_id
      AND m.uploaded_by=target AND m.purpose='member_avatar' AND m.status='active'
    ) THEN 'avatar' END
  ],NULL) FROM (SELECT target AS id) requested LEFT JOIN uss.member_profiles p ON p.account_id=requested.id;
$$;

-- Owner-only. Shares the role row lock with role administration and increments the account version.
CREATE FUNCTION uss.bootstrap_super_admin_by_email(target_email text) RETURNS text
LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE
  target uss.accounts;
  super_role uuid;
  next_version integer;
BEGIN
  SELECT * INTO target FROM uss.accounts WHERE email OPERATOR(public.=) target_email::public.citext FOR UPDATE;
  IF NOT FOUND THEN RETURN 'ROLE_TARGET_NOT_FOUND'; END IF;
  IF target.status<>'active' OR target.email_verified_at IS NULL THEN RETURN 'ROLE_TARGET_INELIGIBLE'; END IF;

  SELECT id INTO super_role FROM uss.roles WHERE code='super_admin' AND system_locked FOR UPDATE;
  IF super_role IS NULL THEN RETURN 'ROLE_UNAVAILABLE'; END IF;
  IF EXISTS (SELECT 1 FROM uss.account_roles WHERE role_id=super_role AND account_id=target.id)
    THEN RETURN 'ALREADY_BOOTSTRAPPED'; END IF;
  IF EXISTS (
    SELECT 1 FROM uss.account_roles ar JOIN uss.accounts a ON a.id=ar.account_id
    WHERE ar.role_id=super_role AND a.status='active' AND a.email_verified_at IS NOT NULL
  ) THEN RETURN 'ROLE_BOOTSTRAP_CLOSED'; END IF;

  INSERT INTO uss.account_roles(account_id,role_id) VALUES (target.id,super_role);
  UPDATE uss.accounts SET version=version+1 WHERE id=target.id RETURNING version INTO next_version;
  INSERT INTO uss.audit_logs(action,entity_type,entity_id,change_summary)
    VALUES ('role.bootstrap','account',target.id,
      jsonb_build_object('changedFields',ARRAY['roles'],'role','super_admin','operation','bootstrap','version',next_version));
  RETURN 'OK';
END;
$$;
REVOKE ALL ON FUNCTION uss.bootstrap_super_admin_by_email(text) FROM PUBLIC;
