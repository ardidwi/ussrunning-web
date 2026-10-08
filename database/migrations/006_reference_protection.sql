-- Reference seed only. No users, credentials, event samples or editable editorial taxonomy are seeded.
INSERT INTO uss.roles(code,name,description) VALUES
  ('super_admin','Super Admin','Global access including account and role controls'),
  ('admin','Admin','Approved content and event operations'),
  ('member','Member','Own profile and eligible registrations')
ON CONFLICT(code) DO NOTHING;

-- Keep timestamps consistent even when future repositories use explicit SQL.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['media_assets','member_profiles','site_content','partners','stories','events','event_registrations','notification_templates'] LOOP
    EXECUTE format('CREATE TRIGGER touch_updated_at BEFORE UPDATE ON uss.%I FOR EACH ROW EXECUTE FUNCTION uss.touch_updated_at()',table_name);
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['site_content_revisions','story_revisions','partner_revisions','event_revisions','audit_logs'] LOOP
    EXECUTE format('CREATE TRIGGER append_only BEFORE UPDATE OR DELETE ON uss.%I FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation()',table_name);
    EXECUTE format('CREATE TRIGGER no_truncate BEFORE TRUNCATE ON uss.%I FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation()',table_name);
  END LOOP;
END;
$$;
REVOKE ALL ON ALL TABLES IN SCHEMA uss FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA uss FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA uss REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA uss REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
