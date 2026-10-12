-- Additive metadata only; existing asset identities/URLs/references survive unchanged.
ALTER TABLE uss.media_assets ADD COLUMN original_filename text CHECK(length(original_filename)<=255);
ALTER TABLE uss.media_assets ADD COLUMN checksum_sha256 text CHECK(checksum_sha256 ~ '^[0-9a-f]{64}$');
ALTER TABLE uss.media_assets ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN('private','public'));
UPDATE uss.media_assets SET visibility='public' WHERE public_url IS NOT NULL;
ALTER TABLE uss.media_assets ADD COLUMN archived_at timestamptz;
ALTER TABLE uss.media_assets ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE INDEX media_library_page_idx ON uss.media_assets(status,created_at DESC,id DESC);
CREATE TRIGGER media_binary_identity_guard BEFORE UPDATE ON uss.media_assets FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('id','storage_provider','storage_key','mime_type','byte_size','width','height','checksum_sha256','uploaded_by','created_at');
CREATE TRIGGER media_no_delete BEFORE DELETE ON uss.media_assets FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER media_no_truncate BEFORE TRUNCATE ON uss.media_assets FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
