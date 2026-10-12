-- Additive foundation: legacy fields/relationships remain retained and fail closed by default.
ALTER TABLE uss.partners ADD COLUMN status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','inactive','archived')),
 ADD COLUMN visibility text NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','public')),
 ADD COLUMN partner_type text NOT NULL DEFAULT 'partner' CHECK(partner_type IN ('partner','sponsor','collaborator')),
 ADD COLUMN tier text CHECK(tier IS NULL OR tier ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
 ADD COLUMN is_global boolean NOT NULL DEFAULT false, ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
-- Preserve legacy revision numbering; no record/name/url/association is removed or reinterpreted.
UPDATE uss.partners p SET version=r.maximum FROM (SELECT partner_id,max(version) maximum FROM uss.partner_revisions GROUP BY partner_id) r WHERE p.id=r.partner_id AND r.maximum>1;
UPDATE uss.partners SET status='archived' WHERE archived_at IS NOT NULL;
ALTER TABLE uss.event_partners ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 ADD COLUMN status text NOT NULL DEFAULT 'inactive' CHECK(status IN ('active','inactive')),
 ADD COLUMN placement text NOT NULL DEFAULT 'event_page' CHECK(placement IN ('event_page','event_pass','sponsor_section')),
 ADD COLUMN active_from timestamptz, ADD COLUMN active_until timestamptz,
 ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0),
 ADD COLUMN position integer NOT NULL DEFAULT 0,
 ADD CONSTRAINT sponsorship_window CHECK(active_until IS NULL OR active_from IS NULL OR active_until>=active_from);
-- Legacy ties stay inactive; new active relation positions are unique. Existing sort_order retained.
CREATE UNIQUE INDEX event_partner_active_order_idx ON uss.event_partners(event_id,position) WHERE status='active';
CREATE INDEX partners_managed_page_idx ON uss.partners(status,created_at DESC,id DESC);
CREATE INDEX partners_global_page_idx ON uss.partners(sort_order,id) WHERE status='active' AND visibility='public' AND is_global AND archived_at IS NULL;
CREATE TRIGGER partner_identity_guard BEFORE UPDATE ON uss.partners FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','slug','created_at');
CREATE TRIGGER partner_no_delete BEFORE DELETE ON uss.partners FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER partner_no_truncate BEFORE TRUNCATE ON uss.partners FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER sponsorship_identity_guard BEFORE UPDATE ON uss.event_partners FOR EACH ROW EXECUTE FUNCTION uss.guard_event_relation_identity('id','event_id','partner_id');
CREATE TRIGGER sponsorship_no_delete BEFORE DELETE ON uss.event_partners FOR EACH ROW EXECUTE FUNCTION uss.reject_history_mutation();
CREATE TRIGGER sponsorship_no_truncate BEFORE TRUNCATE ON uss.event_partners FOR EACH STATEMENT EXECUTE FUNCTION uss.reject_history_mutation();
CREATE FUNCTION uss.mutate_partner(actor uuid,pid uuid,operation text,expected integer,payload jsonb,base text)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uss AS $$
DECLARE p uss.partners; media_row uss.media_assets; mid uuid; rid uuid; act text;
BEGIN
 PERFORM set_config('lock_timeout','15s',true);
 PERFORM id FROM uss.accounts WHERE id=actor FOR UPDATE;
 PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor FOR SHARE OF ar,r;
 IF NOT EXISTS(SELECT 1 FROM uss.accounts a WHERE a.id=actor AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor AND r.code IN ('admin','super_admin'))) THEN RETURN 'PARTNER_FORBIDDEN'; END IF;
 IF operation='create' THEN
 PERFORM pg_advisory_xact_lock(hashtextextended('partner-global-order',0));
 ELSE SELECT * INTO p FROM uss.partners WHERE id=pid FOR UPDATE;
 IF NOT FOUND THEN RETURN 'PARTNER_NOT_FOUND'; END IF;
 IF expected IS NULL OR p.version<>expected THEN RETURN 'PARTNER_CONFLICT'; END IF;
 END IF;
 IF operation='update' AND p.status NOT IN ('draft','inactive') THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 IF operation='activate' AND p.status NOT IN ('draft','inactive') THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 IF operation='deactivate' AND p.status<>'active' THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 IF operation='archive' AND p.status='archived' THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 mid=CASE WHEN operation IN ('create','update') THEN (payload->>'logoMediaId')::uuid ELSE p.logo_media_id END;
 IF mid IS NOT NULL AND operation NOT IN ('deactivate','archive') THEN
 SELECT * INTO media_row FROM uss.media_assets WHERE id=mid FOR SHARE;
 IF NOT FOUND OR media_row.status<>'active' OR media_row.mime_type NOT IN ('image/jpeg','image/png','image/webp') OR (COALESCE(payload->>'visibility',p.visibility)='public' AND media_row.visibility<>'public') THEN RETURN 'PARTNER_MEDIA_INVALID'; END IF;
 END IF;
 IF operation='activate' AND (length(btrim(p.name))=0 OR mid IS NULL) THEN RETURN 'PARTNER_NOT_PUBLISHABLE'; END IF;
 IF operation='create' THEN
 INSERT INTO uss.partners(id,name,slug,description,website_url,logo_media_id,partner_type,tier,visibility,is_global,active_from,active_until,sort_order,created_by)
 SELECT pid,payload->>'name',CASE WHEN EXISTS(SELECT 1 FROM uss.partners WHERE slug=base) THEN base||'-'||replace(pid::text,'-','') ELSE base END,payload->>'description',payload->>'websiteUrl',mid,payload->>'type',payload->>'tier',payload->>'visibility',(payload->>'isGlobal')::boolean,(payload->>'activeFrom')::timestamptz,(payload->>'activeUntil')::timestamptz,GREATEST(COALESCE(max(sort_order)+1,0),0),actor FROM uss.partners;
 ELSIF operation='update' THEN
 UPDATE uss.partners SET name=payload->>'name',description=payload->>'description',website_url=payload->>'websiteUrl',logo_media_id=mid,partner_type=payload->>'type',tier=payload->>'tier',visibility=payload->>'visibility',is_global=(payload->>'isGlobal')::boolean,active_from=(payload->>'activeFrom')::timestamptz,active_until=(payload->>'activeUntil')::timestamptz WHERE id=pid;
 ELSIF operation='activate' THEN UPDATE uss.partners SET status='active',visible=true WHERE id=pid;
 ELSIF operation='deactivate' THEN UPDATE uss.partners SET status='inactive',visible=false WHERE id=pid;
 ELSIF operation='archive' THEN UPDATE uss.partners SET status='archived',visible=false,archived_at=clock_timestamp() WHERE id=pid;
 ELSE RETURN 'PARTNER_INVALID_STATE'; END IF;
 IF operation<>'create' THEN UPDATE uss.partners SET version=version+1 WHERE id=pid; END IF;
 SELECT * INTO p FROM uss.partners WHERE id=pid;
 act='partner.'||CASE operation WHEN 'create' THEN 'created' WHEN 'update' THEN 'updated' WHEN 'activate' THEN 'activated' WHEN 'deactivate' THEN 'deactivated' ELSE 'archived' END;
 INSERT INTO uss.partner_revisions(partner_id,version,snapshot,created_by,action) VALUES(pid,p.version,jsonb_build_object('name',p.name,'slug',p.slug,'description',p.description,'websiteUrl',p.website_url,'logoMediaId',p.logo_media_id,'type',p.partner_type,'tier',p.tier,'visibility',p.visibility,'isGlobal',p.is_global,'status',p.status,'activeFrom',p.active_from,'activeUntil',p.active_until,'sortOrder',p.sort_order),actor,act) RETURNING id INTO rid;
 INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary) VALUES(actor,act,'partner',pid,rid,jsonb_build_object('changedFields',CASE WHEN operation='update' THEN ARRAY(SELECT jsonb_object_keys(payload)) ELSE ARRAY[operation] END));
 RETURN 'OK';
END $$;
CREATE FUNCTION uss.mutate_sponsorship(actor uuid,eid uuid,operation text,payload jsonb)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,uss AS $$
DECLARE rel uss.event_partners; canonical uss.partners; ev uss.events; rr record; rid uuid; act text; n integer; next_position integer; expected_rows jsonb; ids uuid[];
BEGIN
 PERFORM set_config('lock_timeout','15s',true);
 PERFORM id FROM uss.accounts WHERE id=actor FOR UPDATE;
 PERFORM ar.account_id FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor FOR SHARE OF ar,r;
 IF NOT EXISTS(SELECT 1 FROM uss.accounts a WHERE a.id=actor AND a.status='active' AND a.email_verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM uss.account_roles ar JOIN uss.roles r ON r.id=ar.role_id WHERE ar.account_id=actor AND r.code IN ('admin','super_admin'))) THEN RETURN 'PARTNER_FORBIDDEN'; END IF;
 SELECT * INTO ev FROM uss.events WHERE id=eid FOR UPDATE;
 IF NOT FOUND THEN RETURN 'PARTNER_EVENT_NOT_FOUND'; END IF;
 IF ev.status IN ('cancelled','archived') AND operation<>'detach' THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 IF operation='reorder' THEN
 expected_rows=payload->'relations';
 SELECT count(*) INTO n FROM uss.event_partners WHERE event_id=eid AND status='active';
 IF n<>jsonb_array_length(expected_rows) OR n>100 OR n<>(SELECT count(DISTINCT (x->>'id')) FROM jsonb_array_elements(expected_rows) x) OR EXISTS(SELECT 1 FROM jsonb_array_elements(expected_rows) x WHERE NOT EXISTS(SELECT 1 FROM uss.event_partners WHERE id=(x->>'id')::uuid AND event_id=eid AND status='active' AND version=(x->>'expectedVersion')::int)) THEN RETURN 'PARTNER_RELATION_CONFLICT'; END IF;
 -- Serialize canonical revision numbering in UUID order, including cross-event operations.
 PERFORM p.id FROM uss.partners p JOIN uss.event_partners r ON r.partner_id=p.id WHERE r.event_id=eid AND r.status='active' ORDER BY p.id FOR UPDATE OF p;
 SELECT array_agg((value->>'id')::uuid ORDER BY ordinality) INTO ids FROM jsonb_array_elements(expected_rows) WITH ORDINALITY AS o(value,ordinality);
 UPDATE uss.event_partners SET position=-position-1 WHERE event_id=eid AND status='active';
 UPDATE uss.event_partners r SET position=o.ordinality-1,version=r.version+1 FROM unnest(ids) WITH ORDINALITY o(id,ordinality) WHERE r.id=o.id AND r.event_id=eid;
 ELSE
 IF operation='attach' THEN
 SELECT * INTO canonical FROM uss.partners WHERE id=(payload->>'partnerId')::uuid FOR UPDATE;
 IF NOT FOUND THEN RETURN 'PARTNER_NOT_FOUND'; END IF;
 IF canonical.status='archived' THEN RETURN 'PARTNER_INVALID_STATE'; END IF;
 SELECT * INTO rel FROM uss.event_partners WHERE event_id=eid AND partner_id=canonical.id FOR UPDATE;
 IF FOUND AND rel.status='active' THEN RETURN 'PARTNER_RELATION_CONFLICT'; END IF;
 SELECT count(*),COALESCE(max(position)+1,0) INTO n,next_position FROM uss.event_partners WHERE event_id=eid AND status='active';
 IF n>=100 THEN RETURN 'PARTNER_RELATION_CONFLICT'; END IF;
 INSERT INTO uss.event_partners(event_id,partner_id,tier,placement,active_from,active_until,status,position)
 VALUES(eid,canonical.id,payload->>'tier',payload->>'placement',(payload->>'activeFrom')::timestamptz,(payload->>'activeUntil')::timestamptz,'active',next_position)
 ON CONFLICT(event_id,partner_id) DO UPDATE SET tier=excluded.tier,placement=excluded.placement,active_from=excluded.active_from,active_until=excluded.active_until,status='active',position=excluded.position,version=uss.event_partners.version+1;
 ELSE
 SELECT * INTO rel FROM uss.event_partners WHERE id=(payload->>'relationId')::uuid AND event_id=eid FOR UPDATE;
 IF NOT FOUND THEN RETURN 'PARTNER_RELATION_CONFLICT'; END IF;
 IF (payload->>'expectedVersion') IS NULL OR rel.version<>(payload->>'expectedVersion')::int OR rel.status<>'active' THEN RETURN 'PARTNER_RELATION_CONFLICT'; END IF;
 PERFORM id FROM uss.partners WHERE id=rel.partner_id FOR UPDATE;
 IF operation='update' THEN UPDATE uss.event_partners SET tier=payload->>'tier',placement=payload->>'placement',active_from=(payload->>'activeFrom')::timestamptz,active_until=(payload->>'activeUntil')::timestamptz,version=version+1 WHERE id=rel.id;
 ELSIF operation='detach' THEN UPDATE uss.event_partners SET status='inactive',version=version+1 WHERE id=rel.id;
 ELSE RETURN 'PARTNER_INVALID_STATE'; END IF;
 END IF;
 END IF;
 act='partner.event.'||operation;
 FOR rr IN SELECT * FROM uss.event_partners WHERE event_id=eid AND (CASE WHEN operation='reorder' THEN id=ANY(ids) WHEN operation='attach' THEN partner_id=canonical.id ELSE id=rel.id END) ORDER BY partner_id LOOP
 UPDATE uss.partners SET version=version+1 WHERE id=rr.partner_id RETURNING * INTO canonical;
 INSERT INTO uss.partner_revisions(partner_id,version,snapshot,created_by,action) VALUES(canonical.id,canonical.version,jsonb_build_object('eventId',eid,'relationId',rr.id,'tier',rr.tier,'placement',rr.placement,'sortOrder',rr.position,'activeFrom',rr.active_from,'activeUntil',rr.active_until,'status',rr.status),actor,act) RETURNING id INTO rid;
 INSERT INTO uss.audit_logs(actor_account_id,action,entity_type,entity_id,revision_id,change_summary) VALUES(actor,act,'partner',canonical.id,rid,jsonb_build_object('eventId',eid,'relationId',rr.id,'changedFields',ARRAY[operation]));
 END LOOP;
 RETURN 'OK';
END $$;
REVOKE ALL ON FUNCTION uss.mutate_partner(uuid,uuid,text,integer,jsonb,text),uss.mutate_sponsorship(uuid,uuid,text,jsonb) FROM PUBLIC;
