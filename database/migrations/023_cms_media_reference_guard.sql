-- D3 CMS media: DB-level purpose isolation. CMS/public content may reference only purpose='cms' media.
-- Member avatars are signed exclusively through lib/member/avatar-storage.ts; this guard closes direct SQL,
-- future writers and any path that bypasses the service checks added in a9881b6.
-- Additive: no data rewrite. Legacy rows are untouched; a guarded column is checked only when a write
-- introduces a media id that the row did not already reference.

-- Every UUID stored under a media key (mediaId, mediaAssetId, *MediaId) anywhere inside a JSON document.
CREATE FUNCTION uss.jsonb_media_ids(doc jsonb) RETURNS uuid[]
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
  SELECT COALESCE(array_agg(DISTINCT lower(e.value)::uuid),'{}'::uuid[])
  FROM jsonb_path_query(COALESCE(doc,'null'::jsonb),'strict $.** ? (@.type() == "object")') o(obj),
       jsonb_each_text(o.obj) e
  WHERE (e.key IN ('mediaId','mediaAssetId') OR e.key ~ 'MediaId$')
    AND e.value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

-- TG_ARGV lists guarded columns; a 'json:' prefix extracts media ids from a JSON column.
CREATE FUNCTION uss.guard_cms_media_reference() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,uss AS $$
DECLARE
  col text; name text; n jsonb := to_jsonb(NEW); o jsonb; fresh uuid[] := '{}'::uuid[]; current_ids uuid[]; previous_ids uuid[];
BEGIN
  IF TG_OP = 'UPDATE' THEN o := to_jsonb(OLD); END IF;
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF col LIKE 'json:%' THEN
      name := substr(col,6);
      current_ids := uss.jsonb_media_ids(n->name);
      previous_ids := CASE WHEN o IS NULL THEN '{}'::uuid[] ELSE uss.jsonb_media_ids(o->name) END;
    ELSE
      current_ids := CASE WHEN n->>col IS NULL THEN '{}'::uuid[] ELSE ARRAY[(n->>col)::uuid] END;
      previous_ids := CASE WHEN o IS NULL OR o->>col IS NULL THEN '{}'::uuid[] ELSE ARRAY[(o->>col)::uuid] END;
    END IF;
    fresh := fresh || ARRAY(SELECT unnest(current_ids) EXCEPT SELECT unnest(previous_ids));
  END LOOP;
  IF cardinality(fresh) > 0 AND EXISTS (SELECT 1 FROM uss.media_assets m WHERE m.id = ANY(fresh) AND m.purpose <> 'cms') THEN
    -- Message token matches lib/media/media-reference.ts isPurposeViolation(); no ids or keys are disclosed.
    RAISE EXCEPTION 'cms_media_purpose_violation' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER story_cms_media_guard BEFORE INSERT OR UPDATE ON uss.stories FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('cover_media_id','social_preview_media_id','json:body');
CREATE TRIGGER event_cms_media_guard BEFORE INSERT OR UPDATE ON uss.events FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('cover_media_id');
CREATE TRIGGER partner_cms_media_guard BEFORE INSERT OR UPDATE ON uss.partners FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('logo_media_id');
CREATE TRIGGER gallery_cms_media_guard BEFORE INSERT OR UPDATE ON uss.galleries FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('cover_media_id');
CREATE TRIGGER gallery_item_cms_media_guard BEFORE INSERT OR UPDATE ON uss.gallery_items FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('media_asset_id');
CREATE TRIGGER site_content_cms_media_guard BEFORE INSERT OR UPDATE ON uss.site_content FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('json:content');
CREATE TRIGGER site_content_revision_cms_media_guard BEFORE INSERT ON uss.site_content_revisions FOR EACH ROW
  EXECUTE FUNCTION uss.guard_cms_media_reference('json:content');
