-- Optional deployment privilege template, NOT an automatic migration.
-- Apply with psql using a pre-created non-owner server role:
-- psql "$DATABASE_URL_UNPOOLED" -v app_role=uss_app -f database/runtime-grants.sql
-- psql's identifier quoting is required; never concatenate a role from public input.
GRANT USAGE ON SCHEMA uss TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA uss TO :"app_role";
REVOKE UPDATE ON uss.site_content_revisions,uss.story_revisions,uss.partner_revisions,uss.event_revisions,uss.audit_logs,uss.check_ins FROM :"app_role";
-- No DELETE/TRUNCATE, schema CREATE, migration-ledger access or credential grants.
-- New migrations must deliberately grant needed privileges on their new tables.

-- BE-03 operations are invoker functions, requiring the table privileges above.
GRANT EXECUTE ON FUNCTION uss.issue_email_verification(uuid,text,integer,integer,integer,integer),uss.consume_email_verification(text) TO :"app_role";

-- BE-13 gallery history is append-only; invoker mutation needs no DELETE.
REVOKE UPDATE ON uss.gallery_revisions FROM :"app_role";
GRANT EXECUTE ON FUNCTION uss.mutate_gallery(uuid,uuid,text,integer,jsonb,text) TO :"app_role";

-- BE-14 invoker writes use existing partner/event relation privileges, no DELETE.
GRANT EXECUTE ON FUNCTION uss.mutate_partner(uuid,uuid,text,integer,jsonb,text),uss.mutate_sponsorship(uuid,uuid,text,jsonb) TO :"app_role";

-- BE-15 invoker mutations retain append-only history privileges.
GRANT EXECUTE ON FUNCTION uss.site_content_references_valid(jsonb,boolean),uss.mutate_site_content(uuid,text,text,integer,jsonb) TO :"app_role";
