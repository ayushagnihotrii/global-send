-- Global Send: Migration 003 - Complete Web Application Schema
-- Adds key-only authentication fingerprinting, item expiration, upload sessions,
-- deletion retry queue, user profile avatars, 1-to-1 private chat, item sharing, and blocking.

-- 1. ENHANCE USERS TABLE
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(50) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_size_bytes INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

UPDATE users SET display_username = username WHERE display_username IS NULL;

-- Promote the earliest registered user to storage administrator if no admin exists yet
UPDATE users
SET is_admin = TRUE
WHERE id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE);

ALTER TABLE users ALTER COLUMN storage_limit_bytes SET DEFAULT 524288000;

DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT chk_users_avatar_size CHECK (avatar_size_bytes >= 0 AND avatar_size_bytes <= 102400);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_key_fingerprint ON users(key_fingerprint) WHERE key_fingerprint IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- 2. ENHANCE ITEMS TABLE WITH MANDATORY EXPIRATION
ALTER TABLE items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS expiration_duration_sec INTEGER DEFAULT 86400;
ALTER TABLE items ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(30) DEFAULT 'active';

UPDATE items SET expires_at = created_at + INTERVAL '24 hours' WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_expires_at ON items(expires_at, deletion_status);
CREATE INDEX IF NOT EXISTS idx_items_user_active ON items(user_id, deletion_status, expires_at);

-- 3. ENHANCE FILES TABLE
ALTER TABLE files ADD COLUMN IF NOT EXISTS sanitized_filename TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(30) DEFAULT 'google_drive';
ALTER TABLE files ADD COLUMN IF NOT EXISTS provider_file_id TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(30) DEFAULT 'active';
ALTER TABLE files ADD COLUMN IF NOT EXISTS deletion_attempts INTEGER DEFAULT 0;
ALTER TABLE files ADD COLUMN IF NOT EXISTS last_deletion_error TEXT DEFAULT NULL;
ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_from_storage_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

UPDATE files SET sanitized_filename = original_filename WHERE sanitized_filename IS NULL;

-- 4. UPLOAD SESSIONS TABLE (Resumable Uploads & Quota Reservation)
CREATE TABLE IF NOT EXISTS upload_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    title TEXT,
    original_filename TEXT NOT NULL,
    sanitized_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    reserved_bytes BIGINT NOT NULL DEFAULT 0,
    expiration_duration_sec INTEGER NOT NULL DEFAULT 86400,
    storage_provider VARCHAR(30) NOT NULL DEFAULT 'google_drive',
    storage_key TEXT,
    provider_upload_url TEXT,
    provider_file_id TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'completed', 'cancelled', 'failed', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON upload_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_expires ON upload_sessions(status, expires_at);

-- 5. DELETION RETRY QUEUE TABLE
CREATE TABLE IF NOT EXISTS deletion_queue (
    id TEXT PRIMARY KEY,
    storage_key TEXT NOT NULL UNIQUE,
    storage_provider VARCHAR(30) NOT NULL DEFAULT 'google_drive',
    reason VARCHAR(50) NOT NULL DEFAULT 'expired',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT DEFAULT NULL,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deletion_queue_pending ON deletion_queue(status, next_retry_at);

-- 6. CONVERSATIONS TABLE (Private 1-to-1 Messaging)
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    participant_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_by_a_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    deleted_by_b_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(participant_a, participant_b),
    CHECK (participant_a < participant_b)
);

CREATE INDEX IF NOT EXISTS idx_conversations_part_a ON conversations(participant_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_part_b ON conversations(participant_b, last_message_at DESC);

-- 7. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'attachment')),
    text_content TEXT DEFAULT NULL,
    shared_item_id TEXT DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL,
    attachment_snapshot_title TEXT DEFAULT NULL,
    attachment_snapshot_type VARCHAR(20) DEFAULT NULL,
    attachment_snapshot_size BIGINT DEFAULT NULL,
    attachment_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    deleted_by_sender BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_shared_item ON messages(shared_item_id);

-- 8. ITEM SHARES TABLE (Explicit Sharing Authorization)
CREATE TABLE IF NOT EXISTS item_shares (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_shares_item_recipient ON item_shares(item_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_item_shares_conversation ON item_shares(conversation_id);

-- 9. USER BLOCKS TABLE
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
