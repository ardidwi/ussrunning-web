CREATE TABLE uss.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, event_type text,
  title text NOT NULL, summary text, description jsonb CHECK (jsonb_typeof(description) IN ('object','array')),
  cover_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  starts_at timestamptz NOT NULL, ends_at timestamptz, timezone text NOT NULL DEFAULT 'Asia/Jakarta',
  venue_name text, location_text text, map_url text, meeting_point_instructions text,
  registration_opens_at timestamptz, registration_closes_at timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity > 0), waitlist_enabled boolean NOT NULL DEFAULT false,
  checkin_enabled boolean NOT NULL DEFAULT false, checkin_opens_at timestamptz, checkin_closes_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','registration_open','registration_closed','completed','cancelled','archived')),
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','members_only','private')),
  eligibility_config jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(eligibility_config) = 'object'),
  terms_content jsonb, confirmation_email_override jsonb,
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz,
  CHECK (ends_at IS NULL OR ends_at >= starts_at),
  CHECK (registration_closes_at IS NULL OR registration_opens_at IS NULL OR registration_closes_at >= registration_opens_at),
  CHECK (checkin_closes_at IS NULL OR checkin_opens_at IS NULL OR checkin_closes_at >= checkin_opens_at)
);
CREATE INDEX events_status_start_idx ON uss.events(status,starts_at,id);
CREATE FUNCTION uss.validate_event_timezone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Unknown event timezone' USING ERRCODE = '23514';
  END IF; RETURN NEW;
END;
$$;
CREATE TRIGGER events_timezone_guard BEFORE INSERT OR UPDATE OF timezone ON uss.events FOR EACH ROW EXECUTE FUNCTION uss.validate_event_timezone();
CREATE TABLE uss.event_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES uss.events(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0), snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,version)
);
CREATE TABLE uss.event_partners (
  event_id uuid NOT NULL REFERENCES uss.events(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES uss.partners(id) ON DELETE RESTRICT,
  tier text, sort_order integer NOT NULL DEFAULT 0, PRIMARY KEY(event_id,partner_id)
);
CREATE INDEX event_partners_partner_idx ON uss.event_partners(partner_id,event_id);
CREATE TABLE uss.event_custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES uss.events(id) ON DELETE RESTRICT,
  key text NOT NULL, label text NOT NULL, helper_text text, placeholder text,
  field_type text NOT NULL CHECK (field_type IN ('text','textarea','number','email','phone','select','multiselect','checkbox','date')),
  required boolean NOT NULL DEFAULT false, options jsonb CHECK (jsonb_typeof(options) = 'array'),
  validation_config jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(validation_config) = 'object'),
  sort_order integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true,
  UNIQUE(event_id,key), UNIQUE(id,event_id)
);
CREATE INDEX event_fields_order_idx ON uss.event_custom_fields(event_id,sort_order,id) WHERE active;
CREATE TABLE uss.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES uss.events(id) ON DELETE RESTRICT,
  account_id uuid NOT NULL REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','waitlisted','cancelled','rejected')),
  registered_at timestamptz NOT NULL DEFAULT now(), cancelled_at timestamptz, source text NOT NULL DEFAULT 'web', admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,account_id), UNIQUE(id,event_id),
  CHECK (status <> 'cancelled' OR cancelled_at IS NOT NULL)
);
CREATE INDEX registrations_event_status_idx ON uss.event_registrations(event_id,status);
CREATE INDEX registrations_account_date_idx ON uss.event_registrations(account_id,registered_at DESC,id);
-- Redundant event_id is deliberate: composite foreign keys reject answers to another event's questions.
CREATE TABLE uss.registration_field_values (
  registration_id uuid NOT NULL, field_id uuid NOT NULL, event_id uuid NOT NULL,
  value jsonb NOT NULL, PRIMARY KEY(registration_id,field_id),
  FOREIGN KEY(registration_id,event_id) REFERENCES uss.event_registrations(id,event_id) ON DELETE CASCADE,
  FOREIGN KEY(field_id,event_id) REFERENCES uss.event_custom_fields(id,event_id) ON DELETE RESTRICT
);
CREATE INDEX registration_values_field_idx ON uss.registration_field_values(field_id,event_id);
CREATE TABLE uss.event_passes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL UNIQUE REFERENCES uss.event_registrations(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'), token_hint text CHECK (length(token_hint) <= 8),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked','expired')),
  issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, revoked_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > issued_at), CHECK (status <> 'revoked' OR revoked_at IS NOT NULL)
);
CREATE TABLE uss.check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL UNIQUE, event_id uuid NOT NULL,
  checked_in_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
  checked_in_at timestamptz NOT NULL DEFAULT now(), checkpoint text,
  metadata jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(metadata) = 'object'),
  FOREIGN KEY(registration_id,event_id) REFERENCES uss.event_registrations(id,event_id) ON DELETE RESTRICT
);
CREATE INDEX checkins_event_time_idx ON uss.check_ins(event_id,checked_in_at DESC);
CREATE TABLE uss.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), media_asset_id uuid NOT NULL REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
  event_id uuid REFERENCES uss.events(id) ON DELETE RESTRICT, story_id uuid REFERENCES uss.stories(id) ON DELETE RESTRICT,
  caption text, sort_order integer NOT NULL DEFAULT 0, visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_visible_order_idx ON uss.gallery_items(sort_order,id) WHERE visible;
CREATE INDEX gallery_event_idx ON uss.gallery_items(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX gallery_story_idx ON uss.gallery_items(story_id) WHERE story_id IS NOT NULL;
-- Cloning must INSERT a fresh identity; editing a slug/title must not replace the event UUID.
CREATE FUNCTION uss.guard_event_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Event identity is immutable' USING ERRCODE = '23514';
  END IF; RETURN NEW;
END;
$$;
CREATE TRIGGER events_identity_guard BEFORE UPDATE OF id ON uss.events FOR EACH ROW EXECUTE FUNCTION uss.guard_event_identity();
