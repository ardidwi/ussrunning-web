CREATE TABLE uss.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE,
  channel text NOT NULL DEFAULT 'email', notification_type text NOT NULL,
  subject_template text NOT NULL, body_template text NOT NULL,
  variable_schema jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(variable_schema) = 'object'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  updated_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE uss.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES uss.notification_templates(id) ON DELETE RESTRICT,
  notification_type text NOT NULL, account_id uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  event_id uuid REFERENCES uss.events(id) ON DELETE RESTRICT, registration_id uuid,
  channel text NOT NULL DEFAULT 'email', recipient text NOT NULL, provider text,
  provider_message_id text, idempotency_key text UNIQUE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','failed','bounced')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text, last_error_summary text CHECK (length(last_error_summary) <= 500),
  queued_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, delivered_at timestamptz, failed_at timestamptz,
  CHECK (registration_id IS NULL OR event_id IS NOT NULL),
  FOREIGN KEY(registration_id,event_id) REFERENCES uss.event_registrations(id,event_id) ON DELETE RESTRICT
);
-- Queue workers paginate by status/time; provider message lookup supports future idempotent webhook handling.
CREATE INDEX notification_queue_idx ON uss.notification_deliveries(status,queued_at,id) WHERE status IN ('queued','failed');
CREATE INDEX notification_account_time_idx ON uss.notification_deliveries(account_id,queued_at DESC);
CREATE INDEX notification_registration_idx ON uss.notification_deliveries(registration_id,event_id) WHERE registration_id IS NOT NULL;
CREATE UNIQUE INDEX notification_provider_message_idx ON uss.notification_deliveries(provider,provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE TABLE uss.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_account_id uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  action text NOT NULL, entity_type text NOT NULL, entity_id uuid, revision_id uuid,
  change_summary jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(change_summary) = 'object'),
  request_id text, ip_hash text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON uss.audit_logs(created_at DESC,id);
CREATE INDEX audit_actor_time_idx ON uss.audit_logs(actor_account_id,created_at DESC);
CREATE INDEX audit_entity_time_idx ON uss.audit_logs(entity_type,entity_id,created_at DESC);
