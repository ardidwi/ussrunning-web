-- Newsletter consent moves into the application schema. Non-destructive: public.newsletter_subscriptions is
-- left in place (read-only for the app after this release); dropping it needs a separate approved migration.
CREATE TABLE uss.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE CHECK (length(email) <= 254 AND email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'),
  status text NOT NULL CHECK (status IN ('subscribed','unsubscribed')),
  consent_version text NOT NULL CHECK (length(consent_version) BETWEEN 1 AND 40),
  consent_at timestamptz NOT NULL,
  unsubscribed_at timestamptz,
  source text NOT NULL CHECK (source ~ '^[a-z0-9_-]{1,40}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Unsubscribed rows keep their opt-out timestamp; a subscribed row never carries one.
  CHECK ((status='unsubscribed') = (unsubscribed_at IS NOT NULL))
);
CREATE INDEX newsletter_status_idx ON uss.newsletter_subscriptions(status,created_at,id);
CREATE TRIGGER newsletter_no_truncate BEFORE TRUNCATE ON uss.newsletter_subscriptions FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();

-- Idempotent copy of the legacy table when it exists. Columns are read through to_jsonb so a legacy table that lacks an
-- optional column does not fail the migration. Existing uss rows win (ON CONFLICT DO NOTHING); opt-outs are preserved
-- as unsubscribed; rows without a valid address or recorded consent are not copied (consent cannot be invented).
-- Safe to re-run manually: SELECT uss.backfill_newsletter_subscriptions();
CREATE FUNCTION uss.backfill_newsletter_subscriptions() RETURNS integer LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE copied integer := 0;
BEGIN
 IF to_regclass('public.newsletter_subscriptions') IS NULL THEN RETURN 0; END IF;
 EXECUTE $q$
  WITH legacy AS (
   SELECT lower(btrim(j->>'email')) email, j->>'status' status, NULLIF(btrim(j->>'consent_version'),'') consent_version,
    (j->>'consent_at')::timestamptz consent_at, (j->>'unsubscribed_at')::timestamptz unsubscribed_at,
    NULLIF(btrim(j->>'source'),'') source, COALESCE((j->>'created_at')::timestamptz,(j->>'consent_at')::timestamptz) created_at,
    COALESCE((j->>'updated_at')::timestamptz,(j->>'consent_at')::timestamptz) updated_at
   FROM (SELECT to_jsonb(n) j FROM public.newsletter_subscriptions n) raw
  ), ins AS (
   INSERT INTO uss.newsletter_subscriptions(email,status,consent_version,consent_at,unsubscribed_at,source,created_at,updated_at)
   SELECT email,
    CASE WHEN status='subscribed' AND unsubscribed_at IS NULL THEN 'subscribed' ELSE 'unsubscribed' END,
    left(COALESCE(consent_version,'legacy'),40), consent_at,
    CASE WHEN status='subscribed' AND unsubscribed_at IS NULL THEN NULL ELSE COALESCE(unsubscribed_at,updated_at,consent_at) END,
    CASE WHEN source ~ '^[a-z0-9_-]{1,40}$' THEN source ELSE 'legacy' END, created_at, updated_at
   FROM legacy
   WHERE email IS NOT NULL AND length(email)<=254 AND email ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' AND consent_at IS NOT NULL
   ON CONFLICT (email) DO NOTHING RETURNING 1
  ) SELECT count(*)::integer FROM ins $q$ INTO copied;
 RETURN copied;
END;$$;
SELECT uss.backfill_newsletter_subscriptions();
REVOKE ALL ON FUNCTION uss.backfill_newsletter_subscriptions() FROM PUBLIC;
