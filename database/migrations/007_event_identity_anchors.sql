-- Forward-only review fix. A pass must never follow a registration reassigned to another event/member.
-- Only identity/ownership columns are locked; statuses, timestamps, notes, labels and metadata remain editable.
CREATE FUNCTION uss.guard_event_relation_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE column_name text;
BEGIN
  FOREACH column_name IN ARRAY TG_ARGV LOOP
    IF (to_jsonb(NEW) -> column_name) IS DISTINCT FROM (to_jsonb(OLD) -> column_name) THEN
      RAISE EXCEPTION 'Event relation identity is immutable' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER registration_identity_guard BEFORE UPDATE ON uss.event_registrations
  FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','event_id','account_id');
CREATE TRIGGER pass_identity_guard BEFORE UPDATE ON uss.event_passes
  FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','registration_id');
CREATE TRIGGER checkin_identity_guard BEFORE UPDATE ON uss.check_ins
  FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','registration_id','event_id');
CREATE TRIGGER custom_field_identity_guard BEFORE UPDATE ON uss.event_custom_fields
  FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','event_id');
-- Schema-scoped default REVOKE cannot override PostgreSQL's global default function EXECUTE.
-- Revoke explicitly for each new function; do not alter global defaults for legacy public/neon_auth.
REVOKE ALL ON FUNCTION uss.guard_event_relation_identity() FROM PUBLIC;
