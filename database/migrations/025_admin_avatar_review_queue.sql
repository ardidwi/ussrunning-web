-- Admin UI (D2.4): additive partial index for the photo review queue (K-01 auto-approved, not yet reviewed).
-- Read-only access path; no data, constraint or function changes.
CREATE INDEX member_profiles_avatar_review_queue_idx ON uss.member_profiles(avatar_media_id)
  WHERE avatar_media_id IS NOT NULL AND avatar_reviewed_at IS NULL
    AND avatar_status IN ('approved','pending_review');
