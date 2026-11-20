-- Migration 007: Trust & Safety Reports Table
-- Supports abuse/copyright/malware reporting and DMCA tracking

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type VARCHAR(20) NOT NULL, -- 'share', 'file', 'user'
  target_id TEXT NOT NULL,
  reason VARCHAR(50) NOT NULL,      -- 'copyright', 'malware', 'illegal', 'harassment', 'other'
  details TEXT,
  reporter_email TEXT,
  reporter_ip_masked TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
