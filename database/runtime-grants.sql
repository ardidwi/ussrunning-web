-- Optional deployment privilege template, NOT an automatic migration.
-- Apply with psql using a pre-created non-owner server role:
-- psql "$DATABASE_URL_UNPOOLED" -v app_role=uss_app -f database/runtime-grants.sql
-- psql's identifier quoting is required; never concatenate a role from public input.
GRANT USAGE ON SCHEMA uss TO :"app_role";
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA uss TO :"app_role";
REVOKE UPDATE ON uss.site_content_revisions,uss.story_revisions,uss.partner_revisions,uss.event_revisions,uss.audit_logs FROM :"app_role";
-- No DELETE/TRUNCATE, schema CREATE, migration-ledger access or credential grants.
-- New migrations must deliberately grant needed privileges on their new tables.
