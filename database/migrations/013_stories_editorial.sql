-- Existing records and revisions remain; no content/identity rewrite.
ALTER TABLE uss.stories ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public'));
ALTER TABLE uss.stories ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
UPDATE uss.stories s SET version=GREATEST(1,COALESCE((SELECT max(r.version) FROM uss.story_revisions r WHERE r.story_id=s.id),0)) WHERE COALESCE((SELECT max(r.version) FROM uss.story_revisions r WHERE r.story_id=s.id),0)>1;
CREATE INDEX stories_managed_page_idx ON uss.stories(status,created_at DESC,id DESC);
-- Scheduled and published public reads share a stable publication ordering.
CREATE INDEX stories_public_page_idx ON uss.stories(COALESCE(published_at,publish_at) DESC,id DESC)
 WHERE visibility='public' AND status IN ('published','scheduled');
CREATE TRIGGER story_identity_guard BEFORE UPDATE ON uss.stories FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('id','slug','created_at');
CREATE TRIGGER story_no_delete BEFORE DELETE ON uss.stories FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER story_no_truncate BEFORE TRUNCATE ON uss.stories FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
