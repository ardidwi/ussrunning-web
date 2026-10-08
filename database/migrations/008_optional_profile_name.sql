-- Unknown provider names remain NULL; supplied names still satisfy the non-empty CHECK.
ALTER TABLE uss.member_profiles ALTER COLUMN full_name DROP NOT NULL;
