CREATE TABLE uss.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), storage_provider text NOT NULL,
  storage_key text NOT NULL UNIQUE, public_url text, mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0), width integer CHECK (width > 0), height integer CHECK (height > 0),
  alt_text text, caption text, uploaded_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_uploader_idx ON uss.media_assets(uploaded_by);
CREATE TABLE uss.member_profiles (
  account_id uuid PRIMARY KEY REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  full_name text NOT NULL CHECK (length(btrim(full_name)) > 0), phone text, birth_date date, gender text, city text,
  emergency_contact_name text, emergency_contact_phone text, instagram_handle text, jersey_size text,
  running_preferences jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(running_preferences) = 'object'),
  avatar_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  marketing_consent boolean NOT NULL DEFAULT false, marketing_consent_at timestamptz, privacy_consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE uss.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE,
  content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_revision_id uuid, updated_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR published_revision_id IS NOT NULL)
);
CREATE TABLE uss.site_content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), site_content_id uuid NOT NULL REFERENCES uss.site_content(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0), content jsonb NOT NULL CHECK (jsonb_typeof(content) = 'object'),
  status text NOT NULL CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, change_note text, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_content_id,version), UNIQUE(site_content_id,id)
);
-- A published pointer can never point at a different site's content history.
ALTER TABLE uss.site_content ADD CONSTRAINT site_content_published_revision_fk
  FOREIGN KEY (id,published_revision_id) REFERENCES uss.site_content_revisions(site_content_id,id) ON DELETE RESTRICT;
CREATE FUNCTION uss.guard_published_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.published_revision_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM uss.site_content_revisions r
    WHERE r.id = NEW.published_revision_id AND r.site_content_id = NEW.id AND r.status = 'published'
  ) THEN RAISE EXCEPTION 'Published pointer requires its own published revision' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER site_content_publish_guard BEFORE INSERT OR UPDATE ON uss.site_content FOR EACH ROW EXECUTE FUNCTION uss.guard_published_revision();
CREATE TABLE uss.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
  logo_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT, description text,
  website_url text, instagram_url text, campaign_url text, collaboration_type text,
  active_from timestamptz, active_until timestamptz, featured boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, archived_at timestamptz,
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (active_until IS NULL OR active_from IS NULL OR active_until >= active_from)
);
CREATE TABLE uss.partner_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_id uuid NOT NULL REFERENCES uss.partners(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0), snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id,version)
);
CREATE INDEX partners_visible_order_idx ON uss.partners(sort_order,id) WHERE visible AND archived_at IS NULL;
CREATE TABLE uss.story_content_types (
  code text PRIMARY KEY, name text NOT NULL, description text, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE uss.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE uss.tags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL);
CREATE TABLE uss.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE,
  content_type text NOT NULL REFERENCES uss.story_content_types(code) ON DELETE RESTRICT,
  title text NOT NULL, excerpt text, body jsonb NOT NULL CHECK (jsonb_typeof(body) IN ('object','array')),
  category_id uuid REFERENCES uss.categories(id) ON DELETE RESTRICT,
  cover_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  social_preview_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  author_account_id uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, byline text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  featured boolean NOT NULL DEFAULT false, sponsored boolean NOT NULL DEFAULT false, disclosure_label text,
  cta_label text, cta_url text, seo_title text, seo_description text,
  publish_at timestamptz, published_at timestamptz, archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'scheduled' OR publish_at IS NOT NULL),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX stories_status_publish_idx ON uss.stories(status,publish_at,id);
CREATE INDEX stories_published_date_idx ON uss.stories(published_at DESC,id) WHERE status = 'published';
CREATE INDEX stories_category_idx ON uss.stories(category_id);
CREATE INDEX stories_author_idx ON uss.stories(author_account_id);
CREATE TABLE uss.story_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), story_id uuid NOT NULL REFERENCES uss.stories(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0), snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id,version)
);
CREATE TABLE uss.story_tags (
  story_id uuid NOT NULL REFERENCES uss.stories(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES uss.tags(id) ON DELETE CASCADE, PRIMARY KEY(story_id,tag_id)
);
CREATE INDEX story_tags_tag_idx ON uss.story_tags(tag_id,story_id);
CREATE TABLE uss.story_partners (
  story_id uuid NOT NULL REFERENCES uss.stories(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES uss.partners(id) ON DELETE RESTRICT,
  relationship_type text NOT NULL DEFAULT 'media_partner', display_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY(story_id,partner_id)
);
CREATE INDEX story_partners_partner_idx ON uss.story_partners(partner_id,story_id);
