-- QuickVault: Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor or apply via psql / Supabase CLI

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    recovery_code_hash TEXT,
    storage_limit_bytes BIGINT DEFAULT 2147483648, -- 2 GB default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. ITEMS TABLE
CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'link', 'image', 'video', 'file')),
    title TEXT NOT NULL,
    text_content TEXT,
    url TEXT,
    note TEXT,
    is_favourite BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_user_created ON items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_user_type ON items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_items_user_favourite ON items(user_id, is_favourite);
CREATE INDEX IF NOT EXISTS idx_items_user_deleted ON items(user_id, deleted_at);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_items_fts ON items USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(text_content, '') || ' ' || coalesce(note, '') || ' ' || coalesce(url, ''))
);

-- 3. FILES TABLE
CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL UNIQUE,
    original_filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    upload_status VARCHAR(20) DEFAULT 'completed' CHECK (upload_status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_files_user_item ON files(user_id, item_id);
CREATE INDEX IF NOT EXISTS idx_files_storage_key ON files(storage_key);

-- 4. TAGS TABLE
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

-- 5. ITEM_TAGS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);
