-- Retain legacy attendance without inventing historical proof. All new scanner writes link a pass.
ALTER TABLE uss.event_passes ADD CONSTRAINT pass_attendance_identity UNIQUE(id,registration_id,event_id);
ALTER TABLE uss.check_ins ADD COLUMN event_pass_id uuid;
ALTER TABLE uss.check_ins ADD CONSTRAINT checkin_pass_event_fk
 FOREIGN KEY(event_pass_id,registration_id,event_id) REFERENCES uss.event_passes(id,registration_id,event_id) ON DELETE RESTRICT;
CREATE TRIGGER checkin_proof_guard BEFORE UPDATE ON uss.check_ins FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('event_pass_id','checked_in_at','checked_in_by');
CREATE TRIGGER checkin_delete_guard BEFORE DELETE ON uss.check_ins FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER checkin_truncate_guard BEFORE TRUNCATE ON uss.check_ins FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
-- Bounded fixed-window request accounting per trusted operator/event; contains no pass tokens or PII.
CREATE TABLE uss.check_in_scan_limits (
 actor_account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
 event_id uuid NOT NULL REFERENCES uss.events(id) ON DELETE RESTRICT,
 window_started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL CHECK(attempts>0), PRIMARY KEY(actor_account_id,event_id)
);
