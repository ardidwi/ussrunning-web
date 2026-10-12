-- Existing legacy event/story gallery items remain untouched and unassigned.
CREATE TABLE uss.galleries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE,
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 240), description text CHECK(length(description)<=4000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
 visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('public','private')),
 event_id uuid REFERENCES uss.events(id) ON DELETE RESTRICT,
 cover_media_id uuid REFERENCES uss.media_assets(id) ON DELETE RESTRICT,
 created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz, archived_at timestamptz,
 CHECK(status<>'published' OR published_at IS NOT NULL)
);
ALTER TABLE uss.gallery_items ADD COLUMN gallery_id uuid REFERENCES uss.galleries(id) ON DELETE RESTRICT,
 ADD COLUMN alt_text_override text CHECK(length(alt_text_override)<=1000), ADD COLUMN removed_at timestamptz;
-- Partial constraints leave all legacy rows untouched. Removed references retain history.
CREATE UNIQUE INDEX gallery_item_media_unique ON uss.gallery_items(gallery_id,media_asset_id) WHERE gallery_id IS NOT NULL AND removed_at IS NULL;
CREATE UNIQUE INDEX gallery_item_order_unique ON uss.gallery_items(gallery_id,sort_order) WHERE gallery_id IS NOT NULL AND removed_at IS NULL;
CREATE INDEX galleries_managed_page_idx ON uss.galleries(status,created_at DESC,id DESC);
CREATE INDEX galleries_public_page_idx ON uss.galleries(published_at DESC,id DESC) WHERE status='published' AND visibility='public';
CREATE TABLE uss.gallery_revisions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gallery_id uuid NOT NULL REFERENCES uss.galleries(id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version>0), snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 created_by uuid REFERENCES uss.accounts(id) ON DELETE RESTRICT, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(gallery_id,version)
);
CREATE TRIGGER gallery_revision_append_only BEFORE UPDATE OR DELETE ON uss.gallery_revisions FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER gallery_revision_no_truncate BEFORE TRUNCATE ON uss.gallery_revisions FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER gallery_identity_guard BEFORE UPDATE ON uss.galleries FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','slug','created_at');
CREATE TRIGGER gallery_no_delete BEFORE DELETE ON uss.galleries FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER gallery_no_truncate BEFORE TRUNCATE ON uss.galleries FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER gallery_touch BEFORE UPDATE ON uss.galleries FOR EACH ROW EXECUTE FUNCTION uss.touch_updated_at();
CREATE TRIGGER gallery_item_identity_guard BEFORE UPDATE ON uss.gallery_items FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','gallery_id','media_asset_id');
-- Cover/history references extend the existing conservative MediaAsset retention at DB boundary.
CREATE FUNCTION uss.guard_gallery_media_retention() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status='archived' AND
 (EXISTS(SELECT 1 FROM uss.galleries WHERE cover_media_id=OLD.id) OR EXISTS(SELECT 1 FROM uss.gallery_revisions WHERE snapshot::text LIKE '%'||OLD.id::text||'%')) THEN
 RAISE EXCEPTION 'Media referenced by gallery history' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER gallery_media_retention BEFORE UPDATE OF status ON uss.media_assets FOR EACH ROW EXECUTE FUNCTION uss.guard_gallery_media_retention();
-- Invoker privileges only; provider/session trust remains in the existing server guards.
CREATE FUNCTION uss.mutate_gallery(actor uuid, gid uuid, operation text, expected integer, payload jsonb, base text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uss AS $$
DECLARE g uss.galleries; media_row uss.media_assets; iid uuid; mid uuid; rid uuid; code text; n integer; ids uuid[]; action text;
BEGIN
 PERFORM set_config('lock_timeout','15s',true);
 PERFORM id FROM uss.accounts WHERE id=actor FOR UPDATE;
 PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor FOR SHARE OF ar,r;
 IF NOT EXISTS(SELECT 1 FROM uss.accounts a WHERE a.id=actor AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor AND r.code IN ('admin','super_admin'))) THEN RETURN 'GALLERY_FORBIDDEN'; END IF;
 IF operation='create' THEN PERFORM pg_advisory_xact_lock(hashtextextended('gallery-slug:'||base,0));
 ELSE SELECT * INTO g FROM uss.galleries WHERE id=gid FOR UPDATE;
 IF NOT FOUND THEN RETURN 'GALLERY_NOT_FOUND'; END IF;
 IF g.version<>expected THEN RETURN 'GALLERY_CONFLICT'; END IF;
 IF operation IN ('update','add','item','remove','reorder') AND g.status<>'draft' THEN RETURN 'GALLERY_INVALID_STATE'; END IF;
 END IF;
 IF operation IN ('create','update') THEN
 mid=(payload->>'coverMediaId')::uuid;
 IF (payload->>'eventId') IS NOT NULL THEN PERFORM id FROM uss.events WHERE id=(payload->>'eventId')::uuid FOR SHARE; IF NOT FOUND THEN RETURN 'GALLERY_INVALID_REFERENCE'; END IF; END IF;
 ELSIF operation='add' THEN mid=(payload->>'mediaAssetId')::uuid;
 ELSE mid=g.cover_media_id; END IF;
 IF mid IS NOT NULL AND operation NOT IN ('unpublish','archive','remove','reorder','item') THEN
 SELECT * INTO media_row FROM uss.media_assets WHERE id=mid FOR SHARE;
 IF NOT FOUND OR media_row.status<>'active' OR media_row.mime_type NOT IN ('image/jpeg','image/png','image/webp') THEN RETURN 'GALLERY_MEDIA_INVALID'; END IF;
 IF COALESCE(payload->>'visibility',g.visibility)='public' AND media_row.visibility<>'public' THEN RETURN 'GALLERY_MEDIA_INVALID'; END IF;
 END IF;
 IF operation='create' THEN
 INSERT INTO uss.galleries(id,slug,title,description,visibility,event_id,cover_media_id,created_by) VALUES(gid,CASE WHEN EXISTS(SELECT 1 FROM uss.galleries WHERE slug=base) THEN base||'-'||replace(gid::text,'-','') ELSE base END,payload->>'title',payload->>'description',payload->>'visibility',(payload->>'eventId')::uuid,mid,actor);
 ELSIF operation='update' THEN
 UPDATE uss.galleries SET title=payload->>'title',description=payload->>'description',visibility=payload->>'visibility',event_id=(payload->>'eventId')::uuid,cover_media_id=mid WHERE id=gid;
 ELSIF operation='publish' THEN
 IF g.status<>'draft' THEN RETURN 'GALLERY_INVALID_STATE'; END IF;
 IF NOT EXISTS(SELECT 1 FROM uss.gallery_items WHERE gallery_id=gid AND removed_at IS NULL) THEN RETURN 'GALLERY_NOT_PUBLISHABLE'; END IF;
 PERFORM m.id FROM uss.media_assets m JOIN uss.gallery_items i ON i.media_asset_id=m.id WHERE i.gallery_id=gid AND i.removed_at IS NULL FOR SHARE OF m;
 IF EXISTS(SELECT 1 FROM uss.gallery_items i JOIN uss.media_assets m ON m.id=i.media_asset_id WHERE i.gallery_id=gid AND i.removed_at IS NULL AND (m.status<>'active' OR m.mime_type NOT IN ('image/jpeg','image/png','image/webp') OR (g.visibility='public' AND m.visibility<>'public'))) THEN RETURN 'GALLERY_MEDIA_INVALID'; END IF;
 IF g.event_id IS NOT NULL THEN PERFORM id FROM uss.events WHERE id=g.event_id FOR SHARE; END IF;
 IF g.visibility='public' AND g.event_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM uss.events WHERE id=g.event_id AND visibility='public' AND status NOT IN ('draft','cancelled','archived')) THEN RETURN 'GALLERY_NOT_PUBLISHABLE'; END IF;
 UPDATE uss.galleries SET status='published',published_at=clock_timestamp() WHERE id=gid;
 ELSIF operation='unpublish' THEN
 IF g.status<>'published' THEN RETURN 'GALLERY_INVALID_STATE'; END IF;
 UPDATE uss.galleries SET status='draft',published_at=NULL WHERE id=gid;
 ELSIF operation='archive' THEN
 IF g.status='archived' THEN RETURN 'GALLERY_INVALID_STATE'; END IF;
 UPDATE uss.galleries SET status='archived',archived_at=clock_timestamp() WHERE id=gid;
 ELSIF operation='add' THEN
 IF EXISTS(SELECT 1 FROM uss.gallery_items WHERE gallery_id=gid AND media_asset_id=mid AND removed_at IS NULL) THEN RETURN 'GALLERY_CONFLICT'; END IF;
 SELECT count(*) INTO n FROM uss.gallery_items WHERE gallery_id=gid AND removed_at IS NULL;
 IF n>=1000 THEN RETURN 'GALLERY_ORDER_CONFLICT'; END IF;
 INSERT INTO uss.gallery_items(id,gallery_id,media_asset_id,caption,alt_text_override,sort_order) SELECT (payload->>'itemId')::uuid,gid,mid,payload->>'caption',payload->>'altTextOverride',COALESCE(max(sort_order)+1,0) FROM uss.gallery_items WHERE gallery_id=gid AND removed_at IS NULL;
 ELSIF operation IN ('item','remove') THEN
 iid=(payload->>'itemId')::uuid;
 IF NOT EXISTS(SELECT 1 FROM uss.gallery_items WHERE id=iid AND gallery_id=gid AND removed_at IS NULL) THEN RETURN 'GALLERY_ITEM_NOT_FOUND'; END IF;
 IF operation='item' THEN UPDATE uss.gallery_items SET caption=payload->>'caption',alt_text_override=payload->>'altTextOverride' WHERE id=iid;
 ELSE UPDATE uss.gallery_items SET removed_at=clock_timestamp(),visible=false WHERE id=iid; END IF;
 ELSIF operation='reorder' THEN
 SELECT array_agg(value::uuid ORDER BY ordinality) INTO ids FROM jsonb_array_elements_text(payload->'itemIds') WITH ORDINALITY;
 SELECT count(*) INTO n FROM uss.gallery_items WHERE gallery_id=gid AND removed_at IS NULL;
 IF n<>COALESCE(cardinality(ids),0) OR (SELECT count(DISTINCT x) FROM unnest(ids) x)<>n OR EXISTS(SELECT 1 FROM unnest(ids) x WHERE NOT EXISTS(SELECT 1 FROM uss.gallery_items WHERE id=x AND gallery_id=gid AND removed_at IS NULL)) THEN RETURN 'GALLERY_ORDER_CONFLICT'; END IF;
 -- Unique positive positions free first; transient negatives stay inside this transaction.
 UPDATE uss.gallery_items SET sort_order=-sort_order-1 WHERE gallery_id=gid AND removed_at IS NULL;
 UPDATE uss.gallery_items i SET sort_order=o.ordinality-1 FROM unnest(ids) WITH ORDINALITY o(id,ordinality) WHERE i.id=o.id AND i.gallery_id=gid;
 ELSE RETURN 'GALLERY_INVALID_STATE'; END IF;
 IF operation<>'create' THEN UPDATE uss.galleries SET version=version+1 WHERE id=gid; END IF;
 SELECT * INTO g FROM uss.galleries WHERE id=gid;
 action='gallery.'||operation;
 INSERT INTO uss.gallery_revisions(gallery_id,version,snapshot,created_by,action) VALUES(gid,g.version,jsonb_build_object('title',g.title,'description',g.description,'slug',g.slug,'status',g.status,'visibility',g.visibility,'eventId',g.event_id,'coverMediaId',g.cover_media_id,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'mediaAssetId',media_asset_id,'sortOrder',sort_order) ORDER BY sort_order,id) FROM uss.gallery_items WHERE gallery_id=gid AND removed_at IS NULL),'[]'::jsonb)),actor,action) RETURNING id INTO rid;
 INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary) VALUES(actor,action,'gallery',gid,rid,jsonb_build_object('changedFields',CASE WHEN operation='update' THEN ARRAY(SELECT jsonb_object_keys(payload)) ELSE ARRAY[operation] END));
 RETURN 'OK';
END $$;
REVOKE ALL ON FUNCTION uss.mutate_gallery(uuid,uuid,text,integer,jsonb,text) FROM PUBLIC;
