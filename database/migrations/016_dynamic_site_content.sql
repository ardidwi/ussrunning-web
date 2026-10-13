-- Reuse foundation records/published pointers. Legacy JSON remains retained but not silently adopted.
ALTER TABLE uss.site_content ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN schema_version integer NOT NULL DEFAULT 0 CHECK(schema_version IN (0,1));
UPDATE uss.site_content c SET version=r.maximum FROM (SELECT site_content_id,max(version) maximum FROM uss.site_content_revisions GROUP BY site_content_id) r WHERE c.id=r.site_content_id AND r.maximum>1;
CREATE TRIGGER site_content_identity_guard BEFORE UPDATE ON uss.site_content FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','key','created_at');
CREATE TRIGGER site_content_no_delete BEFORE DELETE ON uss.site_content FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER site_content_no_truncate BEFORE TRUNCATE ON uss.site_content FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
-- Explicit references, not arbitrary recursive JSON/domain payloads. Casts follow authoritative service validation.
CREATE FUNCTION uss.site_content_references_valid(p jsonb,public_read boolean) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,uss AS $$
SELECT NOT EXISTS(SELECT 1 FROM jsonb_each_text(p) j WHERE j.key IN ('desktopMediaId','mobileMediaId','imageMediaId','backgroundMediaId') AND j.value IS NOT NULL AND NOT EXISTS(SELECT 1 FROM uss.media_assets m WHERE m.id=j.value::uuid AND m.status='active' AND m.mime_type IN ('image/jpeg','image/png','image/webp') AND (NOT public_read OR m.visibility='public')))
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p->'storyIds','[]')) j WHERE NOT EXISTS(SELECT 1 FROM uss.stories s WHERE s.id=j.value::uuid AND s.archived_at IS NULL AND s.status<>'archived' AND (NOT public_read OR (s.visibility='public' AND s.status IN ('published','scheduled') AND COALESCE(s.published_at,s.publish_at)<=statement_timestamp() AND (s.publish_at IS NULL OR s.publish_at<=statement_timestamp()) AND EXISTS(SELECT 1 FROM uss.media_assets m WHERE m.id=s.cover_media_id AND m.status='active' AND m.visibility='public' AND m.mime_type IN ('image/jpeg','image/png','image/webp'))))))
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p->'galleryIds','[]')) j WHERE NOT EXISTS(SELECT 1 FROM uss.galleries g WHERE g.id=j.value::uuid AND g.archived_at IS NULL AND (NOT public_read OR (g.visibility='public' AND g.status='published' AND g.published_at<=statement_timestamp() AND (g.cover_media_id IS NULL OR EXISTS(SELECT 1 FROM uss.media_assets m WHERE m.id=g.cover_media_id AND m.status='active' AND m.visibility='public' AND m.mime_type IN ('image/jpeg','image/png','image/webp'))) AND EXISTS(SELECT 1 FROM uss.gallery_items WHERE gallery_id=g.id AND removed_at IS NULL) AND NOT EXISTS(SELECT 1 FROM uss.gallery_items i JOIN uss.media_assets m ON m.id=i.media_asset_id WHERE i.gallery_id=g.id AND i.removed_at IS NULL AND (m.status<>'active' OR m.visibility<>'public' OR m.mime_type NOT IN ('image/jpeg','image/png','image/webp'))) AND (g.event_id IS NULL OR EXISTS(SELECT 1 FROM uss.events WHERE id=g.event_id AND visibility='public' AND status NOT IN ('draft','cancelled','archived')))))))
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p->'partnerIds','[]')) j WHERE NOT EXISTS(SELECT 1 FROM uss.partners a WHERE a.id=j.value::uuid AND a.archived_at IS NULL AND a.status<>'archived' AND (NOT public_read OR (a.visibility='public' AND a.status='active' AND EXISTS(SELECT 1 FROM uss.media_assets m WHERE m.id=a.logo_media_id AND m.status='active' AND m.visibility='public' AND m.mime_type IN ('image/jpeg','image/png','image/webp')) AND (a.active_from IS NULL OR a.active_from<=statement_timestamp()) AND (a.active_until IS NULL OR a.active_until>statement_timestamp())))))
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p->'eventIds','[]')) j WHERE NOT EXISTS(SELECT 1 FROM uss.events e WHERE e.id=j.value::uuid AND e.archived_at IS NULL AND e.status NOT IN ('cancelled','archived') AND (NOT public_read OR (e.visibility='public' AND e.status IN ('published','registration_open','registration_closed','completed')))))
$$;
CREATE FUNCTION uss.mutate_site_content(actor uuid,slot text,operation text,expected integer,p jsonb) RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uss AS $$
DECLARE c uss.site_content; rid uuid; act text; revision_status text;
BEGIN
 PERFORM set_config('lock_timeout','15s',true);
 PERFORM id FROM uss.accounts WHERE id=actor FOR UPDATE;
 PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor FOR SHARE OF ar,r;
 IF NOT EXISTS(SELECT 1 FROM uss.accounts a WHERE a.id=actor AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor AND r.code IN ('admin','super_admin'))) THEN RETURN 'SITE_CONTENT_FORBIDDEN'; END IF;
 IF slot NOT IN ('homepage.hero','homepage.membership','homepage.manifesto','homepage.marquee','homepage.featured','homepage.sections','login.visual','auth.login','auth.register','footer.global') THEN RETURN 'SITE_CONTENT_INVALID_KEY'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('site-content:'||slot,0));
 SELECT * INTO c FROM uss.site_content WHERE key=slot FOR UPDATE;
 IF operation='create' THEN
 IF FOUND THEN RETURN 'SITE_CONTENT_CONFLICT'; END IF;
 ELSE
 IF NOT FOUND THEN RETURN 'SITE_CONTENT_NOT_FOUND'; END IF;
 IF c.schema_version<>1 THEN RETURN 'SITE_CONTENT_INVALID_PAYLOAD'; END IF;
 IF expected IS NULL OR c.version<>expected THEN RETURN 'SITE_CONTENT_CONFLICT'; END IF;
 IF c.status='archived' THEN RETURN 'SITE_CONTENT_INVALID_STATE'; END IF;
 END IF;
 IF operation NOT IN ('create','update','publish','unpublish','archive') THEN RETURN 'SITE_CONTENT_INVALID_STATE'; END IF;
 IF operation='unpublish' AND c.status<>'published' THEN RETURN 'SITE_CONTENT_INVALID_STATE'; END IF;
 IF operation IN ('create','update') AND (p IS NULL OR jsonb_typeof(p)<>'object' OR octet_length(p::text)>32768) THEN RETURN 'SITE_CONTENT_INVALID_PAYLOAD'; END IF;
 IF operation NOT IN ('create','update') THEN p=c.content; END IF;
 IF operation IN ('create','update','publish') THEN
 -- Lock only referenced rows. Preserve reference eligibility through this mutation/history transaction.
 PERFORM m.id FROM uss.media_assets m WHERE m.id IN (SELECT j.value::uuid FROM jsonb_each_text(p) j WHERE j.key IN ('desktopMediaId','mobileMediaId','imageMediaId','backgroundMediaId') AND j.value IS NOT NULL) ORDER BY m.id FOR SHARE;
 PERFORM s.id FROM uss.stories s WHERE s.id IN (SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p->'storyIds','[]'))) ORDER BY s.id FOR SHARE;
 PERFORM g.id FROM uss.galleries g WHERE g.id IN (SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p->'galleryIds','[]'))) ORDER BY g.id FOR SHARE;
 PERFORM a.id FROM uss.partners a WHERE a.id IN (SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p->'partnerIds','[]'))) ORDER BY a.id FOR SHARE;
 PERFORM e.id FROM uss.events e WHERE e.id IN (SELECT value::uuid FROM jsonb_array_elements_text(COALESCE(p->'eventIds','[]'))) ORDER BY e.id FOR SHARE;
 IF NOT uss.site_content_references_valid(p,operation='publish') THEN RETURN 'SITE_CONTENT_INVALID_REFERENCE'; END IF;
 END IF;
 IF operation='create' THEN
 INSERT INTO uss.site_content(key,content,status,schema_version,updated_by) VALUES(slot,p,'draft',1,actor) RETURNING * INTO c;
 ELSE
 UPDATE uss.site_content SET content=p,version=version+1,updated_by=actor WHERE id=c.id RETURNING * INTO c;
 END IF;
 revision_status=CASE WHEN operation='publish' THEN 'published' WHEN operation='archive' THEN 'archived' ELSE 'draft' END;
 INSERT INTO uss.site_content_revisions(site_content_id,version,content,status,created_by,change_note) VALUES(c.id,c.version,p,revision_status,actor,operation) RETURNING id INTO rid;
 IF operation='publish' THEN UPDATE uss.site_content SET status='published',published_revision_id=rid WHERE id=c.id;
 ELSIF operation IN ('unpublish','archive') THEN UPDATE uss.site_content SET status=revision_status,published_revision_id=NULL WHERE id=c.id;
 END IF;
 act='site_content.'||CASE operation WHEN 'create' THEN 'created' WHEN 'update' THEN 'updated' WHEN 'publish' THEN 'published' WHEN 'unpublish' THEN 'unpublished' ELSE 'archived' END;
 INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary) VALUES(actor,act,'site_content',c.id,rid,jsonb_build_object('slot',slot,'changedFields',CASE WHEN operation IN ('create','update') THEN ARRAY(SELECT jsonb_object_keys(p)) ELSE ARRAY[operation] END));
 RETURN 'OK';
END $$;
REVOKE ALL ON FUNCTION uss.site_content_references_valid(jsonb,boolean),uss.mutate_site_content(uuid,text,text,integer,jsonb) FROM PUBLIC;
