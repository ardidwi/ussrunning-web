-- D3.1 direct-to-storage uploads, D3.5 editorial taxonomy. Additive only: no existing row is rewritten.

-- A presigned upload intent. Its id becomes the media_assets id only after server-side finalisation
-- re-validates the stored object (size, magic bytes, decoded dimensions). Intents are retained as history.
CREATE TABLE uss.media_upload_intents (
 id uuid PRIMARY KEY,
 actor_account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
 storage_provider text NOT NULL,
 storage_key text NOT NULL UNIQUE CHECK (storage_key !~ '^member-avatars/' AND storage_key ~ '^[a-z0-9/-]+\.(jpg|png|webp)$'),
 mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
 declared_bytes bigint NOT NULL CHECK (declared_bytes > 0),
 original_filename text NOT NULL CHECK (length(original_filename) BETWEEN 1 AND 255),
 alt_text text NOT NULL CHECK (length(btrim(alt_text)) BETWEEN 1 AND 512),
 caption text CHECK (length(caption) <= 2000),
 visibility text NOT NULL CHECK (visibility IN ('private','public')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','finalized','rejected')),
 rejection_code text CHECK (rejection_code ~ '^MEDIA_[A-Z_]+$'),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 CHECK ((status = 'pending') = (resolved_at IS NULL)),
 CHECK ((status = 'rejected') = (rejection_code IS NOT NULL)),
 CHECK (expires_at > created_at)
);
CREATE INDEX media_upload_intent_pending_idx ON uss.media_upload_intents(expires_at) WHERE status = 'pending';
CREATE INDEX media_upload_intent_actor_idx ON uss.media_upload_intents(actor_account_id, created_at DESC);
CREATE TRIGGER media_upload_intent_identity_guard BEFORE UPDATE ON uss.media_upload_intents FOR EACH ROW
 EXECUTE FUNCTION uss.guard_event_relation_identity('id','actor_account_id','storage_provider','storage_key','mime_type','declared_bytes','created_at');
CREATE TRIGGER media_upload_intent_no_delete BEFORE DELETE ON uss.media_upload_intents FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER media_upload_intent_no_truncate BEFORE TRUNCATE ON uss.media_upload_intents FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();

-- Library search/filter support (bounded ILIKE scan within status/time order).
CREATE INDEX media_library_mime_idx ON uss.media_assets(status, mime_type, created_at DESC, id DESC) WHERE purpose = 'cms';

-- Editorial taxonomy management. Legacy slugs are kept (NOT VALID); new writes must be URL-safe.
ALTER TABLE uss.categories
 ADD COLUMN description text CHECK (length(description) <= 600),
 ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE uss.categories ADD CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80) NOT VALID;
ALTER TABLE uss.categories ADD CONSTRAINT categories_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 80) NOT VALID;
ALTER TABLE uss.tags
 ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE uss.tags ADD CONSTRAINT tags_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80) NOT VALID;
ALTER TABLE uss.tags ADD CONSTRAINT tags_name_length CHECK (length(btrim(name)) BETWEEN 1 AND 80) NOT VALID;

-- Author bylines are editorial records, not accounts: a byline never grants identity or authority.
CREATE TABLE uss.story_bylines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
 role_title text CHECK (length(role_title) <= 120),
 is_active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE uss.stories ADD COLUMN byline_id uuid REFERENCES uss.story_bylines(id) ON DELETE RESTRICT;
CREATE INDEX stories_byline_idx ON uss.stories(byline_id) WHERE byline_id IS NOT NULL;
-- story_tags already cascades from tags; deletion of a tag in use is refused by the service.
CREATE INDEX stories_public_category_idx ON uss.stories(category_id, COALESCE(published_at,publish_at) DESC, id DESC)
 WHERE visibility = 'public' AND status IN ('published','scheduled');
