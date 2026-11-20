-- Global Send: Migration 005 - Vault Folders, Storage Quotas, and 30-Day Trash Lifecycle
-- Supports hierarchical folder structure, permanent items (expires_at = null), and automated 30-day trash auto-purge.

-- 1. ENHANCE ITEMS TABLE WITH FOLDERS & RETENTION
ALTER TABLE items ADD COLUMN IF NOT EXISTS parent_folder_id TEXT DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE;
ALTER TABLE items ADD COLUMN IF NOT EXISTS purge_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add foreign key constraint to parent_folder_id referencing items(id) with cascade delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_items_parent_folder'
  ) THEN
    ALTER TABLE items ADD CONSTRAINT fk_items_parent_folder
      FOREIGN KEY (parent_folder_id) REFERENCES items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_items_parent_folder ON items(user_id, parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_items_is_folder ON items(user_id, is_folder);
CREATE INDEX IF NOT EXISTS idx_items_trash_purge ON items(deletion_status, purge_at);
CREATE INDEX IF NOT EXISTS idx_items_permanent ON items(user_id, is_permanent);
