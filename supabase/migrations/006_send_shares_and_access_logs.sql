-- Global Send: Migration 006 - Send Shares, Link Controls, and Access Audit Logs
-- Supports public share links with optional password protection, download limits, revocation, and download access logs.

-- 1. CREATE SHARES TABLE
CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    user_id TEXT DEFAULT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    password_hash TEXT DEFAULT NULL,
    max_downloads INTEGER DEFAULT NULL,
    download_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shares_item ON shares(item_id);
CREATE INDEX IF NOT EXISTS idx_shares_user ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_expiry ON shares(expires_at, revoked_at);

-- 2. CREATE SHARE ACCESS LOGS TABLE
CREATE TABLE IF NOT EXISTS share_access_logs (
    id TEXT PRIMARY KEY,
    share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
    action TEXT NOT NULL DEFAULT 'download',
    ip_masked TEXT DEFAULT NULL,
    user_agent TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_share_access_logs_share ON share_access_logs(share_id);
