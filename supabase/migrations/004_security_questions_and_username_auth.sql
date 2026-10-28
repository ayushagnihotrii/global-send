-- Global Send: Migration 004 - Username + Key Auth & Security-Question Key Recovery
-- Safe, idempotent, non-destructive migration.
-- 1. Drops unique constraint/index on key_fingerprint so two users may have the same key.
-- 2. Adds security question, hashed answer, recovery counters, lockout, and key reset tracking.
-- 3. Creates a persistent rate_limits table for serverless authentication & recovery protection.

-- 1. Remove unique constraint and index on key_fingerprint
DROP INDEX IF EXISTS idx_users_key_fingerprint;
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_key_fingerprint_key;
  ALTER TABLE users DROP CONSTRAINT IF EXISTS idx_users_key_fingerprint;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- 2. Add security question and recovery columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS security_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Persistent rate limits table for serverless environments (Vercel)
CREATE TABLE IF NOT EXISTS rate_limits (
  key VARCHAR(255) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);
