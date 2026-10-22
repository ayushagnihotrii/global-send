-- Global Send: Migration 002 - App Settings & Storage Configuration
-- Creates table to securely persist server-side OAuth tokens and administrative settings

CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
