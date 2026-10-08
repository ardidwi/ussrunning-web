-- Only extensions used by identity/token hashing and case-insensitive email.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE SCHEMA uss;
REVOKE ALL ON SCHEMA uss FROM PUBLIC;
-- Existing public.* tables and neon_auth remain untouched; see compatibility documentation.
CREATE FUNCTION uss.touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE FUNCTION uss.reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'History is append-only' USING ERRCODE = '23514'; END;
$$;
