CREATE TABLE uss.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider_user_id text NOT NULL UNIQUE CHECK (length(btrim(auth_provider_user_id)) > 0),
  email citext NOT NULL UNIQUE CHECK (email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  member_id text NOT NULL UNIQUE DEFAULT ('USS-' || upper(gen_random_uuid()::text)) CHECK (member_id ~ '^USS-[0-9A-F-]{36}$'),
  barcode_value text NOT NULL UNIQUE DEFAULT ('USS-' || upper(gen_random_uuid()::text)) CHECK (barcode_value ~ '^USS-[0-9A-F-]{36}$'),
  status text NOT NULL DEFAULT 'pending_verification' CHECK (status IN ('pending_verification','active','suspended','deactivated')),
  email_verified_at timestamptz,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  CHECK (status <> 'active' OR email_verified_at IS NOT NULL)
);
CREATE INDEX accounts_status_idx ON uss.accounts(status);
-- Immutable application identifiers cannot be altered by normal profile updates.
CREATE FUNCTION uss.guard_account_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.member_id IS DISTINCT FROM OLD.member_id
    OR NEW.barcode_value IS DISTINCT FROM OLD.barcode_value
    OR NEW.auth_provider_user_id IS DISTINCT FROM OLD.auth_provider_user_id THEN
    RAISE EXCEPTION 'Account identity is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER accounts_identity_guard BEFORE UPDATE ON uss.accounts FOR EACH ROW EXECUTE FUNCTION uss.guard_account_identity();
CREATE TRIGGER accounts_touch BEFORE UPDATE ON uss.accounts FOR EACH ROW EXECUTE FUNCTION uss.touch_updated_at();
CREATE TABLE uss.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE,
  name text NOT NULL, description text, system_locked boolean NOT NULL DEFAULT true
);
CREATE TABLE uss.account_roles (
  account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  role_id uuid NOT NULL REFERENCES uss.roles(id) ON DELETE RESTRICT,
  granted_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  granted_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(account_id,role_id)
);
CREATE INDEX account_roles_role_idx ON uss.account_roles(role_id,account_id);
CREATE TABLE uss.email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  purpose text NOT NULL DEFAULT 'verify_email',
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  code_hash text CHECK (code_hash IS NULL OR code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz, invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), requested_ip_hash text,
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at),
  CHECK (invalidated_at IS NULL OR invalidated_at >= created_at)
);
-- Resend must invalidate prior outstanding tokens transactionally, including expired ones.
CREATE UNIQUE INDEX verification_one_outstanding_idx ON uss.email_verification_tokens(account_id,purpose)
  WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE INDEX verification_account_created_idx ON uss.email_verification_tokens(account_id,created_at DESC);
CREATE INDEX verification_expiry_idx ON uss.email_verification_tokens(expires_at);
-- A consumed/revoked artifact cannot be revived or rebound to a different account.
CREATE FUNCTION uss.guard_verification_artifact() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.account_id IS DISTINCT FROM OLD.account_id
    OR NEW.token_hash IS DISTINCT FROM OLD.token_hash OR NEW.code_hash IS DISTINCT FROM OLD.code_hash
    OR NEW.purpose IS DISTINCT FROM OLD.purpose OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR (OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at)
    OR (OLD.invalidated_at IS NOT NULL AND NEW.invalidated_at IS DISTINCT FROM OLD.invalidated_at) THEN
    RAISE EXCEPTION 'Verification artifact cannot be rebound or revived' USING ERRCODE = '23514';
  END IF; RETURN NEW;
END;
$$;
CREATE TRIGGER verification_artifact_guard BEFORE UPDATE ON uss.email_verification_tokens FOR EACH ROW EXECUTE FUNCTION uss.guard_verification_artifact();
