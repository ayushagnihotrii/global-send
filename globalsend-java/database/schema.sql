-- ============================================================================
-- GLOBALSEND DATABASE SCHEMA (MySQL 8.0+ Compatible)
-- Advanced Java End-Term Project
-- ============================================================================

CREATE DATABASE IF NOT EXISTS globalsend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE globalsend;

-- Drop tables in reverse foreign key order if needed during reset
DROP TABLE IF EXISTS user_blocks;
DROP TABLE IF EXISTS item_shares;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS item_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS users;

-- 1. USERS TABLE
-- Stores single secret key authenticated accounts
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    key_fingerprint VARCHAR(64) NOT NULL,
    storage_used_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_fingerprint (key_fingerprint)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. ITEMS TABLE (Vault items: text notes, web links, documents, media)
CREATE TABLE items (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'text', 'link', 'image', 'video', 'file'
    title VARCHAR(255) NOT NULL,
    content TEXT,
    url TEXT,
    storage_key VARCHAR(500),
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    expiration_duration_sec INT DEFAULT 86400, -- Default 24 hours (86400s)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_expires_at (expires_at),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. FILES METADATA TABLE
-- Tracks local / cloud file objects linked to vault items
CREATE TABLE files (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    item_id VARCHAR(36) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    sanitized_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_files_user (user_id),
    INDEX idx_files_item (item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. TAGS TABLE
CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. ITEM_TAGS JUNCTION TABLE (Many-to-Many)
CREATE TABLE item_tags (
    item_id VARCHAR(36) NOT NULL,
    tag_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (item_id, tag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. CONVERSATIONS TABLE (1-to-1 secure direct messaging)
CREATE TABLE conversations (
    id VARCHAR(36) PRIMARY KEY,
    user1_id VARCHAR(36) NOT NULL,
    user2_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pair (user1_id, user2_id),
    INDEX idx_conv_user1 (user1_id),
    INDEX idx_conv_user2 (user2_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. MESSAGES TABLE
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'item_share'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_msg_conv (conversation_id),
    INDEX idx_msg_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. ITEM_SHARES TABLE (Sharing vault items directly between users)
CREATE TABLE item_shares (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) NOT NULL,
    shared_by_user_id VARCHAR(36) NOT NULL,
    shared_with_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. USER_BLOCKS TABLE
CREATE TABLE user_blocks (
    id VARCHAR(36) PRIMARY KEY,
    blocker_id VARCHAR(36) NOT NULL,
    blocked_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_block (blocker_id, blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
