import { Pool } from 'pg';
import { createClient, Client as LibsqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  Item,
  FileMetadata,
  User,
  Tag,
  StorageUsage,
  PublicUserProfile,
  ConversationSummary,
  ChatMessage,
  SharedAttachmentInfo,
  ShareLink,
  ShareAccessLog,
  AbuseReport,
} from './types';
import { getStorageConfig } from './env-config';
import { SITE_CONFIG } from '@/config/site';

// Global cache for connection pooling across hot-reloads and serverless invocations
declare global {
  var __quickvault_pg_pool: Pool | undefined;
  var __quickvault_sqlite_client: LibsqlClient | undefined;
}

let initialized = false;

export function isPostgres(): boolean {
  try {
    const config = getStorageConfig();
    return config.database.driver === 'postgres';
  } catch {
    return false;
  }
}

export function resetDbInitializationForTest(): void {
  initialized = false;
  globalThis.__quickvault_sqlite_client = undefined;
}

function getDatabase() {
  const config = getStorageConfig();

  if (config.database.driver === 'postgres') {
    if (!globalThis.__quickvault_pg_pool) {
      globalThis.__quickvault_pg_pool = new Pool({
        connectionString: config.database.connectionString,
        ssl: config.database.ssl,
        max: process.env.DATABASE_MAX_CONNECTIONS
          ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
          : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      globalThis.__quickvault_pg_pool.on('error', (err) => {
        console.error('[Global Send Database Pool Error]:', err.message);
      });
    }
    return { type: 'postgres' as const, client: globalThis.__quickvault_pg_pool };
  } else {
    if (!globalThis.__quickvault_sqlite_client) {
      const dataDir = path.join(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbFile = process.env.SQLITE_DB_FILE || 'quickvault.db';
      const dbPath = path.join(dataDir, dbFile);
      globalThis.__quickvault_sqlite_client = createClient({
        url: `file:${dbPath}`,
      });
    }
    return { type: 'sqlite' as const, client: globalThis.__quickvault_sqlite_client };
  }
}

/**
 * Health check that verifies actual query execution on the active database adapter.
 */
export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  type: 'postgres' | 'sqlite';
  latencyMs: number;
  error?: string;
}> {
  const start = performance.now();
  try {
    const config = getStorageConfig();
    const rows = await query<{ result: number }>(`SELECT 1 as result`);
    const latencyMs = Math.round(performance.now() - start);
    const ok = rows.length > 0 && (rows[0].result === 1 || Number(rows[0].result) === 1);
    return {
      ok,
      type: config.database.driver,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: false,
      type: isPostgres() ? 'postgres' : 'sqlite',
      latencyMs,
      error: err?.message || 'Database query failed',
    };
  }
}

export async function initDb(): Promise<void> {
  if (initialized) return;

  const db = getDatabase();
  if (db.type === 'sqlite') {
    const client = db.client;
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_username TEXT,
        password_hash TEXT NOT NULL,
        key_fingerprint TEXT,
        recovery_code_hash TEXT,
        storage_limit_bytes INTEGER DEFAULT 2147483648,
        avatar_storage_key TEXT DEFAULT NULL,
        avatar_mime_type TEXT DEFAULT NULL,
        avatar_size_bytes INTEGER DEFAULT 0,
        avatar_data TEXT DEFAULT NULL,
        is_admin INTEGER DEFAULT 0,
        last_login_at TEXT DEFAULT NULL,
        session_version INTEGER DEFAULT 1,
        security_question TEXT DEFAULT NULL,
        security_answer_hash TEXT DEFAULT NULL,
        recovery_failed_attempts INTEGER DEFAULT 0,
        recovery_locked_until TEXT DEFAULT NULL,
        security_updated_at TEXT DEFAULT NULL,
        key_reset_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        text_content TEXT,
        url TEXT,
        note TEXT,
        is_favourite INTEGER DEFAULT 0,
        expires_at TEXT,
        expiration_duration_sec INTEGER DEFAULT 86400,
        deletion_status TEXT DEFAULT 'active',
        parent_folder_id TEXT DEFAULT NULL,
        is_folder INTEGER DEFAULT 0,
        is_permanent INTEGER DEFAULT 0,
        deleted_at TEXT DEFAULT NULL,
        purge_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_folder_id) REFERENCES items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        storage_key TEXT UNIQUE NOT NULL,
        original_filename TEXT NOT NULL,
        sanitized_filename TEXT,
        mime_type TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        storage_provider TEXT DEFAULT 'local',
        provider_file_id TEXT,
        upload_status TEXT DEFAULT 'completed',
        deletion_status TEXT DEFAULT 'active',
        deletion_attempts INTEGER DEFAULT 0,
        last_deletion_error TEXT DEFAULT NULL,
        deleted_from_storage_at TEXT DEFAULT NULL,
        thumbnail_data TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, name),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS item_tags (
        item_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (item_id, tag_id),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS storage_blobs (
        storage_key TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL,
        filename TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        data_base64 TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS upload_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        title TEXT,
        original_filename TEXT NOT NULL,
        sanitized_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        reserved_bytes INTEGER NOT NULL DEFAULT 0,
        expiration_duration_sec INTEGER NOT NULL DEFAULT 86400,
        storage_provider TEXT NOT NULL DEFAULT 'local',
        storage_key TEXT,
        provider_upload_url TEXT,
        provider_file_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS deletion_queue (
        id TEXT PRIMARY KEY,
        storage_key TEXT NOT NULL UNIQUE,
        storage_provider TEXT NOT NULL DEFAULT 'local',
        reason TEXT NOT NULL DEFAULT 'expired',
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT DEFAULT NULL,
        next_retry_at TEXT DEFAULT (datetime('now')),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        participant_a TEXT NOT NULL,
        participant_b TEXT NOT NULL,
        last_message_at TEXT DEFAULT (datetime('now')),
        deleted_by_a_at TEXT DEFAULT NULL,
        deleted_by_b_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(participant_a, participant_b),
        FOREIGN KEY (participant_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (participant_b) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        text_content TEXT DEFAULT NULL,
        shared_item_id TEXT DEFAULT NULL,
        attachment_snapshot_title TEXT DEFAULT NULL,
        attachment_snapshot_type TEXT DEFAULT NULL,
        attachment_snapshot_size INTEGER DEFAULT NULL,
        attachment_expires_at TEXT DEFAULT NULL,
        deleted_by_sender INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (shared_item_id) REFERENCES items(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS item_shares (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        revoked_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (blocker_id, blocked_id),
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT NULL,
        item_id TEXT NOT NULL,
        password_hash TEXT DEFAULT NULL,
        max_downloads INTEGER DEFAULT NULL,
        download_count INTEGER DEFAULT 0,
        expires_at TEXT NOT NULL,
        revoked_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS share_access_logs (
        id TEXT PRIMARY KEY,
        share_id TEXT NOT NULL,
        action TEXT NOT NULL DEFAULT 'download',
        ip_masked TEXT DEFAULT NULL,
        user_agent TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (share_id) REFERENCES shares(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        details TEXT DEFAULT NULL,
        reporter_email TEXT DEFAULT NULL,
        reporter_ip_masked TEXT DEFAULT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Ensure columns exist if upgrading an older SQLite file
    const alterStatements = [
      `ALTER TABLE users ADD COLUMN display_username TEXT`,
      `ALTER TABLE users ADD COLUMN key_fingerprint TEXT`,
      `ALTER TABLE users ADD COLUMN avatar_storage_key TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN avatar_mime_type TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN avatar_size_bytes INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN avatar_data TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN last_login_at TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN session_version INTEGER DEFAULT 1`,
      `ALTER TABLE items ADD COLUMN expires_at TEXT`,
      `ALTER TABLE items ADD COLUMN expiration_duration_sec INTEGER DEFAULT 86400`,
      `ALTER TABLE items ADD COLUMN deletion_status TEXT DEFAULT 'active'`,
      `ALTER TABLE items ADD COLUMN parent_folder_id TEXT DEFAULT NULL`,
      `ALTER TABLE items ADD COLUMN is_folder INTEGER DEFAULT 0`,
      `ALTER TABLE items ADD COLUMN is_permanent INTEGER DEFAULT 0`,
      `ALTER TABLE items ADD COLUMN purge_at TEXT DEFAULT NULL`,
      `CREATE INDEX IF NOT EXISTS idx_items_parent_folder ON items(user_id, parent_folder_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_is_folder ON items(user_id, is_folder)`,
      `CREATE INDEX IF NOT EXISTS idx_items_trash_purge ON items(deletion_status, purge_at)`,
      `CREATE INDEX IF NOT EXISTS idx_items_permanent ON items(user_id, is_permanent)`,
      `ALTER TABLE files ADD COLUMN sanitized_filename TEXT`,
      `ALTER TABLE files ADD COLUMN storage_provider TEXT DEFAULT 'local'`,
      `ALTER TABLE files ADD COLUMN provider_file_id TEXT`,
      `ALTER TABLE files ADD COLUMN deletion_status TEXT DEFAULT 'active'`,
      `ALTER TABLE files ADD COLUMN deletion_attempts INTEGER DEFAULT 0`,
      `ALTER TABLE files ADD COLUMN last_deletion_error TEXT DEFAULT NULL`,
      `ALTER TABLE files ADD COLUMN deleted_from_storage_at TEXT DEFAULT NULL`,
      `ALTER TABLE files ADD COLUMN thumbnail_data TEXT DEFAULT NULL`,
      `DROP INDEX IF EXISTS idx_users_key_fp_sqlite`,
      `ALTER TABLE users ADD COLUMN security_question TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN security_answer_hash TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN recovery_failed_attempts INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN recovery_locked_until TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN security_updated_at TEXT DEFAULT NULL`,
      `ALTER TABLE users ADD COLUMN key_reset_at TEXT DEFAULT NULL`,
      `CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 1,
        reset_at INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at)`,
    ];
    for (const stmt of alterStatements) {
      await client.execute(stmt).catch(() => {});
    }
  } else {
    // Ensure PostgreSQL schema has all baseline and migration tables/columns idempotently
    try {
      await db.client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          recovery_code_hash TEXT,
          storage_limit_bytes BIGINT DEFAULT 2147483648,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
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

        CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
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

        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, name)
        );
        CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);

        CREATE TABLE IF NOT EXISTS item_tags (
          item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
          tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
          PRIMARY KEY (item_id, tag_id)
        );
        CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id);
        CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

        CREATE TABLE IF NOT EXISTS app_settings (
          key VARCHAR(100) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS display_username VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS key_fingerprint VARCHAR(128);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_mime_type VARCHAR(50) DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_size_bytes INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_data TEXT DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;
        DROP INDEX IF EXISTS idx_users_key_fingerprint;
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_key_fingerprint_key;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS security_question TEXT DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS security_answer_hash TEXT DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_failed_attempts INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS security_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS key_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

        CREATE TABLE IF NOT EXISTS rate_limits (
          key VARCHAR(255) PRIMARY KEY,
          count INTEGER NOT NULL DEFAULT 1,
          reset_at BIGINT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_at);

        ALTER TABLE items ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE items ADD COLUMN IF NOT EXISTS expiration_duration_sec INTEGER DEFAULT 86400;
        ALTER TABLE items ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(30) DEFAULT 'active';
        ALTER TABLE items ADD COLUMN IF NOT EXISTS parent_folder_id TEXT DEFAULT NULL;
        ALTER TABLE items ADD COLUMN IF NOT EXISTS is_folder BOOLEAN DEFAULT FALSE;
        ALTER TABLE items ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT FALSE;
        ALTER TABLE items ADD COLUMN IF NOT EXISTS purge_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        CREATE INDEX IF NOT EXISTS idx_items_parent_folder ON items(user_id, parent_folder_id);
        CREATE INDEX IF NOT EXISTS idx_items_is_folder ON items(user_id, is_folder);
        CREATE INDEX IF NOT EXISTS idx_items_trash_purge ON items(deletion_status, purge_at);
        CREATE INDEX IF NOT EXISTS idx_items_permanent ON items(user_id, is_permanent);

        ALTER TABLE files ADD COLUMN IF NOT EXISTS sanitized_filename TEXT;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(30) DEFAULT 'google_drive';
        ALTER TABLE files ADD COLUMN IF NOT EXISTS provider_file_id TEXT;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS deletion_status VARCHAR(30) DEFAULT 'active';
        ALTER TABLE files ADD COLUMN IF NOT EXISTS deletion_attempts INTEGER DEFAULT 0;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS last_deletion_error TEXT DEFAULT NULL;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_from_storage_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        ALTER TABLE files ADD COLUMN IF NOT EXISTS thumbnail_data TEXT DEFAULT NULL;

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
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS deletion_queue (
          id TEXT PRIMARY KEY,
          storage_key TEXT NOT NULL UNIQUE,
          storage_provider VARCHAR(30) NOT NULL DEFAULT 'google_drive',
          reason VARCHAR(50) NOT NULL DEFAULT 'expired',
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT DEFAULT NULL,
          next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS conversations (
          id TEXT PRIMARY KEY,
          participant_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          participant_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_by_a_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          deleted_by_b_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(participant_a, participant_b)
        );

        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          message_type VARCHAR(20) NOT NULL DEFAULT 'text',
          text_content TEXT DEFAULT NULL,
          shared_item_id TEXT DEFAULT NULL REFERENCES items(id) ON DELETE SET NULL,
          attachment_snapshot_title TEXT DEFAULT NULL,
          attachment_snapshot_type VARCHAR(20) DEFAULT NULL,
          attachment_snapshot_size BIGINT DEFAULT NULL,
          attachment_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
          deleted_by_sender BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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

        CREATE TABLE IF NOT EXISTS user_blocks (
          blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (blocker_id, blocked_id)
        );

        CREATE TABLE IF NOT EXISTS storage_blobs (
          storage_key TEXT PRIMARY KEY,
          mime_type TEXT NOT NULL,
          filename TEXT NOT NULL,
          size_bytes BIGINT NOT NULL,
          data_base64 TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

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

        CREATE TABLE IF NOT EXISTS share_access_logs (
          id TEXT PRIMARY KEY,
          share_id TEXT NOT NULL REFERENCES shares(id) ON DELETE CASCADE,
          action TEXT NOT NULL DEFAULT 'download',
          ip_masked TEXT DEFAULT NULL,
          user_agent TEXT DEFAULT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_share_access_logs_share ON share_access_logs(share_id);

        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          target_type VARCHAR(20) NOT NULL,
          target_id TEXT NOT NULL,
          reason VARCHAR(50) NOT NULL,
          details TEXT DEFAULT NULL,
          reporter_email TEXT DEFAULT NULL,
          reporter_ip_masked TEXT DEFAULT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_reports_target ON reports(target_type, target_id);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
        CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
      `);
    } catch (e: any) {
      console.warn('[Global Send DB Schema Ensure]:', e.message);
    }
  }
  initialized = true;
}

// Low-level query function supporting standard $1, $2 syntax across both Postgres and SQLite
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  await initDb();
  const db = getDatabase();

  if (db.type === 'postgres') {
    const res = await db.client.query(sql, params);
    return res.rows as T[];
  } else {
    const sqliteSql = sql.replace(/\$(\d+)/g, '?$1');
    const res = await db.client.execute({ sql: sqliteSql, args: params });
    return res.rows.map((row) => {
      const obj: any = {};
      res.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj as T;
    });
  }
}

export async function execute(sql: string, params: any[] = []): Promise<void> {
  await query(sql, params);
}

// ============================================================================
// EXPIRATION HELPERS
// ============================================================================

export function validateExpirationDuration(requestedSeconds?: number | null): {
  valid: boolean;
  durationSec: number;
  expiresAtIso: string | null;
  error?: string;
} {
  if (requestedSeconds === undefined || requestedSeconds === null) {
    const sec = SITE_CONFIG.defaultExpirationSeconds;
    return {
      valid: true,
      durationSec: sec,
      expiresAtIso: new Date(Date.now() + sec * 1000).toISOString(),
    };
  }

  const num = Number(requestedSeconds);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      durationSec: SITE_CONFIG.defaultExpirationSeconds,
      expiresAtIso: '',
      error: 'Expiration duration must be a whole number of seconds',
    };
  }

  // 0 means Permanent Vault Storage (no expiration)
  if (num === 0) {
    return {
      valid: true,
      durationSec: 0,
      expiresAtIso: null,
    };
  }

  if (num < SITE_CONFIG.minExpirationSeconds) {
    return {
      valid: false,
      durationSec: num,
      expiresAtIso: '',
      error: `Expiration duration must be at least ${SITE_CONFIG.minExpirationSeconds} seconds`,
    };
  }

  if (num > SITE_CONFIG.maxExpirationSeconds) {
    return {
      valid: false,
      durationSec: num,
      expiresAtIso: '',
      error: `Expiration duration cannot exceed ${Math.round(SITE_CONFIG.maxExpirationSeconds / 86400)} days`,
    };
  }

  return {
    valid: true,
    durationSec: num,
    expiresAtIso: new Date(Date.now() + num * 1000).toISOString(),
  };
}

export function isTimestampExpired(expiresAt?: string | Date | null): boolean {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts <= Date.now();
}

export function sanitizeFilenameForDisplay(rawFilename: string): string {
  const base = path.basename(rawFilename || 'file').replace(/[\x00-\x1f\x80-\x9f]/g, '');
  const cleaned = base.replace(/[<>:"/\\|?*]/g, '_').trim();
  return cleaned.slice(0, 200) || 'file';
}

// ============================================================================
// USER REPOSITORY
// ============================================================================

function formatAvatarUrl(userRow: any): string | null {
  if (userRow.avatar_data || userRow.avatar_storage_key) {
    return `/api/user/avatar/${encodeURIComponent(userRow.username)}`;
  }
  return null;
}

export async function getUserByUsername(username: string): Promise<any | null> {
  const normalized = username.trim().toLowerCase();
  const rows = await query(`SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1`, [normalized]);
  return rows[0] || null;
}

export async function getUserByKeyFingerprint(keyFingerprint: string): Promise<any | null> {
  const rows = await query(`SELECT * FROM users WHERE key_fingerprint = $1 LIMIT 1`, [
    keyFingerprint,
  ]);
  return rows[0] || null;
}

export async function getUsersWithoutKeyFingerprint(): Promise<any[]> {
  return query(`SELECT * FROM users WHERE key_fingerprint IS NULL LIMIT 50`);
}

export async function setUserKeyFingerprint(userId: string, keyFingerprint: string): Promise<void> {
  await execute(`UPDATE users SET key_fingerprint = $1 WHERE id = $2`, [keyFingerprint, userId]);
}

export async function getRawUserById(id: string): Promise<any | null> {
  const rows = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  const adminStatus = await isUserAdmin(r.id);
  return {
    id: r.id,
    username: r.username,
    displayUsername: r.display_username || r.username,
    storageLimitBytes: Number(r.storage_limit_bytes || SITE_CONFIG.defaultUserStorageLimitBytes),
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at || null,
    avatarUrl: formatAvatarUrl(r),
    avatarSizeBytes: Number(r.avatar_size_bytes || 0),
    isAdmin: adminStatus,
    hasSecurityQuestion: Boolean(r.security_question && r.security_answer_hash),
    securityQuestionUpdatedAt: r.security_updated_at || null,
    keyResetAt: r.key_reset_at || null,
  };
}

export async function createUser(
  id: string,
  username: string,
  passwordHash: string,
  recoveryCodeHash: string | null = null,
  options?: {
    displayUsername?: string;
    keyFingerprint?: string;
    isAdmin?: boolean;
    securityQuestion?: string;
    securityAnswerHash?: string;
  }
): Promise<User> {
  const normalized = username.trim().toLowerCase();
  const displayUsername = options?.displayUsername?.trim() || username.trim();
  const keyFingerprint = options?.keyFingerprint || null;
  const securityQuestion = options?.securityQuestion || null;
  const securityAnswerHash = options?.securityAnswerHash || null;

  const configuredAdminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const count = await getUserCount();
  const isAdmin =
    options?.isAdmin !== undefined
      ? options.isAdmin
      : configuredAdminUsername
      ? normalized === configuredAdminUsername
      : count === 0;
  const isAdminParam = isPostgres() ? isAdmin : isAdmin ? 1 : 0;
  const defaultLimit = SITE_CONFIG.defaultUserStorageLimitBytes;
  const nowIso = new Date().toISOString();
  const securityUpdatedAt = securityQuestion && securityAnswerHash ? nowIso : null;

  await execute(
    `INSERT INTO users (
      id, username, display_username, password_hash, key_fingerprint,
      recovery_code_hash, storage_limit_bytes, is_admin, last_login_at,
      security_question, security_answer_hash, security_updated_at,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)`,
    [
      id,
      normalized,
      displayUsername,
      passwordHash,
      keyFingerprint,
      recoveryCodeHash,
      defaultLimit,
      isAdminParam,
      nowIso,
      securityQuestion,
      securityAnswerHash,
      securityUpdatedAt,
      nowIso,
    ]
  );

  return {
    id,
    username: normalized,
    displayUsername,
    storageLimitBytes: defaultLimit,
    createdAt: nowIso,
    lastLoginAt: nowIso,
    avatarUrl: null,
    avatarSizeBytes: 0,
    isAdmin,
    hasSecurityQuestion: Boolean(securityQuestion && securityAnswerHash),
    securityQuestionUpdatedAt: securityUpdatedAt,
    keyResetAt: null,
  };
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await execute(`UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2`, [
    nowIso,
    userId,
  ]);
}

export async function updateUserPassword(
  userId: string,
  newPasswordHash: string,
  newKeyFingerprint?: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  if (newKeyFingerprint) {
    await execute(
      `UPDATE users SET password_hash = $1, key_fingerprint = $2, session_version = COALESCE(session_version, 1) + 1, updated_at = $3 WHERE id = $4`,
      [newPasswordHash, newKeyFingerprint, nowIso, userId]
    );
  } else {
    await execute(
      `UPDATE users SET password_hash = $1, session_version = COALESCE(session_version, 1) + 1, updated_at = $2 WHERE id = $3`,
      [newPasswordHash, nowIso, userId]
    );
  }
}

export async function updateUserSecurityQuestion(
  userId: string,
  question: string,
  answerHash: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE users
     SET security_question = $1, security_answer_hash = $2, security_updated_at = $3, updated_at = $3
     WHERE id = $4`,
    [question, answerHash, nowIso, userId]
  );
}

export async function recordFailedRecoveryAttempt(
  userId: string,
  currentFailedAttempts: number
): Promise<{ lockedUntil: string | null; failedAttempts: number }> {
  const newAttempts = currentFailedAttempts + 1;
  let lockedUntil: string | null = null;

  if (newAttempts >= 5) {
    // 5 attempts = 30m, 6 = 60m, 7 = 120m, 8 = 240m ... max 24 hours (1440m)
    const multiplier = Math.pow(2, Math.max(0, newAttempts - 5));
    const durationMinutes = Math.min(24 * 60, 30 * multiplier);
    lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  }

  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE users
     SET recovery_failed_attempts = $1, recovery_locked_until = $2, updated_at = $3
     WHERE id = $4`,
    [newAttempts, lockedUntil, nowIso, userId]
  );

  return { lockedUntil, failedAttempts: newAttempts };
}

export async function resetRecoveryAttempts(userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE users
     SET recovery_failed_attempts = 0, recovery_locked_until = NULL, updated_at = $1
     WHERE id = $2`,
    [nowIso, userId]
  );
}

export async function resetUserKeyViaRecovery(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE users
     SET password_hash = $1,
         session_version = COALESCE(session_version, 1) + 1,
         recovery_failed_attempts = 0,
         recovery_locked_until = NULL,
         key_reset_at = $2,
         updated_at = $2
     WHERE id = $3`,
    [newPasswordHash, nowIso, userId]
  );
}

export async function checkPersistentRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60000
): Promise<boolean> {
  const now = Date.now();
  const reset = now + windowMs;

  try {
    const rows = await query<{ count: number | string; reset_at: number | string }>(
      `INSERT INTO rate_limits (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at < $3 THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at < $4 THEN $5 ELSE rate_limits.reset_at END
       RETURNING count, reset_at`,
      [key, reset, now, now, reset]
    );

    if (rows && rows.length > 0) {
      const count = Number(rows[0].count);
      return count <= maxAttempts;
    }
    return true;
  } catch (err: any) {
    console.warn('[PersistentRateLimit Warning]:', err?.message);
    return true;
  }
}

export async function resetPersistentRateLimitsForTest(): Promise<void> {
  await execute(`DELETE FROM rate_limits`).catch(() => {});
}

export async function incrementUserSessionVersion(userId: string): Promise<void> {
  await execute(
    `UPDATE users SET session_version = COALESCE(session_version, 1) + 1 WHERE id = $1`,
    [userId]
  );
}

export async function updateUserAvatar(
  userId: string,
  avatar: {
    storageKey: string | null;
    mimeType: string | null;
    sizeBytes: number;
    avatarData: string | null;
  }
): Promise<{ previousStorageKey: string | null }> {
  const existing = await getRawUserById(userId);
  const previousStorageKey = existing?.avatar_storage_key || null;
  const nowIso = new Date().toISOString();

  await execute(
    `UPDATE users
     SET avatar_storage_key = $1, avatar_mime_type = $2, avatar_size_bytes = $3, avatar_data = $4, updated_at = $5
     WHERE id = $6`,
    [
      avatar.storageKey,
      avatar.mimeType,
      avatar.sizeBytes,
      avatar.avatarData,
      nowIso,
      userId,
    ]
  );

  return { previousStorageKey };
}

export async function deleteUserAccount(userId: string): Promise<string[]> {
  // Gather all storage keys for user's files and avatar so they can be permanently deleted
  const fileRows = await query<{ storage_key: string }>(
    `SELECT storage_key FROM files WHERE user_id = $1`,
    [userId]
  );
  const userRow = await getRawUserById(userId);
  const keys = fileRows.map((r) => r.storage_key).filter(Boolean);
  if (userRow?.avatar_storage_key) {
    keys.push(userRow.avatar_storage_key);
  }

  for (const key of keys) {
    await enqueueStorageDeletion(
      key,
      key.startsWith('gdrive://') ? 'google_drive' : 'local',
      'account_deleted'
    );
  }

  await execute(`DELETE FROM users WHERE id = $1`, [userId]);
  return keys;
}

export async function getUserCount(): Promise<number> {
  const rows = await query<any>(`SELECT COUNT(*) as count FROM users`);
  return Number(rows[0]?.count || 0);
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await getRawUserById(userId);
  if (!user) return false;
  if (Boolean(user.is_admin)) return true;

  // 1. Check explicit ADMIN_USERNAME environment variable if configured
  const configuredAdminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  if (configuredAdminUsername && String(user.username).toLowerCase() === configuredAdminUsername) {
    await execute(`UPDATE users SET is_admin = $1 WHERE id = $2`, [
      isPostgres() ? true : 1,
      userId,
    ]).catch(() => {});
    return true;
  }

  // 2. If no admin exists yet in the database, bootstrap the earliest registered account
  const existingAdmins = await query<{ id: string }>(
    `SELECT id FROM users WHERE is_admin = $1 LIMIT 1`,
    [isPostgres() ? true : 1]
  );
  if (existingAdmins.length === 0) {
    const oldest = await query<{ id: string }>(
      `SELECT id FROM users ORDER BY created_at ASC LIMIT 1`
    );
    if (oldest[0]?.id === userId) {
      await execute(`UPDATE users SET is_admin = $1 WHERE id = $2`, [
        isPostgres() ? true : 1,
        userId,
      ]).catch(() => {});
      return true;
    }
  }

  return false;
}

/**
 * Searches users by normalized username prefix or substring.
 * Never returns a full directory on empty query.
 * Reveals ONLY public username and avatarUrl.
 */
export async function searchPublicUsers(
  rawQuery: string,
  excludeUserId: string,
  limit = 10
): Promise<PublicUserProfile[]> {
  const q = (rawQuery || '').trim().toLowerCase();
  if (q.length < 2) return [];

  const pattern = `%${q}%`;
  const rows = await query(
    `SELECT username, display_username, avatar_data, avatar_storage_key
     FROM users
     WHERE id <> $1 AND LOWER(username) LIKE $2
     ORDER BY CASE WHEN LOWER(username) = $3 THEN 0 WHEN LOWER(username) LIKE $4 THEN 1 ELSE 2 END, username ASC
     LIMIT ${Math.min(25, Math.max(1, limit))}`,
    [excludeUserId, pattern, q, `${q}%`]
  );

  return rows.map((r) => ({
    username: r.display_username || r.username,
    avatarUrl: formatAvatarUrl(r),
  }));
}

// ============================================================================
// ITEMS REPOSITORY (WITH STRICT EXPIRATION ENFORCEMENT)
// ============================================================================

function mapRowToItem(row: any, tags: string[] = []): Item {
  const nowMs = Date.now();
  const isPermanent = Boolean(
    row.is_permanent ||
    Number(row.expiration_duration_sec) === 0 ||
    row.expires_at === null ||
    row.is_folder
  );
  const expiresAtIso = isPermanent
    ? null
    : (row.expires_at ||
      new Date(
        new Date(row.created_at || nowMs).getTime() + SITE_CONFIG.defaultExpirationSeconds * 1000
      ).toISOString());
  const isExpired = isPermanent
    ? false
    : (expiresAtIso ? new Date(expiresAtIso).getTime() <= nowMs : false) || row.deletion_status === 'expired';

  let file: FileMetadata | null = null;
  if (row.file_id) {
    file = {
      id: row.file_id,
      itemId: row.id,
      userId: row.user_id,
      storageKey: row.storage_key,
      originalFilename: row.original_filename,
      sanitizedFilename:
        row.sanitized_filename || sanitizeFilenameForDisplay(row.original_filename),
      mimeType: row.mime_type,
      fileSize: Number(row.file_size || 0),
      storageProvider:
        row.storage_provider || (row.storage_key?.startsWith('gdrive://') ? 'google_drive' : 'local'),
      uploadStatus: row.upload_status,
      deletionStatus: row.file_deletion_status || 'active',
      thumbnailData: row.thumbnail_data || null,
      thumbnailUrl: row.thumbnail_data || (row.file_id ? `/api/storage/file/${row.id}` : null),
      createdAt: row.created_at,
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    textContent: row.text_content,
    url: row.url,
    note: row.note,
    isFavourite: Boolean(row.is_favourite),
    expiresAt: expiresAtIso,
    expirationDurationSec: Number(
      row.expiration_duration_sec || 0
    ),
    isExpired,
    isPermanent,
    parentFolderId: row.parent_folder_id || null,
    isFolder: Boolean(row.is_folder),
    deletionStatus: row.deletion_status || 'active',
    deletedAt: row.deleted_at || null,
    purgeAt: row.purge_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
    file,
  };
}

export async function createItem(item: {
  id?: string;
  userId: string;
  type: string;
  title: string;
  textContent?: string | null;
  url?: string | null;
  note?: string | null;
  isFavourite?: boolean;
  expirationDurationSec?: number;
  expiresAt?: string | null;
  parentFolderId?: string | null;
  isFolder?: boolean;
  isPermanent?: boolean;
}): Promise<Item> {
  const itemId = item.id || crypto.randomUUID();
  const isPermanent = Boolean(
    item.isPermanent ||
    item.expirationDurationSec === 0 ||
    item.expiresAt === null ||
    item.isFolder
  );
  const durationSec = isPermanent ? 0 : (item.expirationDurationSec || SITE_CONFIG.defaultExpirationSeconds);
  const nowIso = new Date().toISOString();
  const expiresAtIso = isPermanent
    ? null
    : (item.expiresAt !== undefined ? item.expiresAt : new Date(Date.now() + durationSec * 1000).toISOString());

  const isFolderParam = isPostgres() ? (item.isFolder ? true : false) : (item.isFolder ? 1 : 0);
  const isPermanentParam = isPostgres() ? (isPermanent ? true : false) : (isPermanent ? 1 : 0);
  const isFavParam = item.isFavourite ? (isPostgres() ? true : 1) : (isPostgres() ? false : 0);

  await execute(
    `INSERT INTO items (
      id, user_id, type, title, text_content, url, note, is_favourite,
      expires_at, expiration_duration_sec, deletion_status,
      parent_folder_id, is_folder, is_permanent, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, $13, $14, $14)`,
    [
      itemId,
      item.userId,
      item.type,
      item.title,
      item.textContent || null,
      item.url || null,
      item.note || null,
      isFavParam,
      expiresAtIso,
      durationSec,
      item.parentFolderId || null,
      isFolderParam,
      isPermanentParam,
      nowIso,
    ]
  );

  const created = await getItemById(itemId, item.userId);
  return created!;
}

export async function getItemById(
  id: string,
  userId?: string,
  options?: { includeExpired?: boolean }
): Promise<Item | null> {
  const whereClauses = ['i.id = $1'];
  const params: any[] = [id];
  if (userId) {
    whereClauses.push('i.user_id = $2');
    params.push(userId);
  }

  const rows = await query(
    `SELECT i.*, 
            f.id as file_id, f.storage_key, f.original_filename, f.sanitized_filename,
            f.mime_type, f.file_size, f.storage_provider, f.upload_status,
            f.deletion_status as file_deletion_status, f.thumbnail_data
     FROM items i
     LEFT JOIN files f ON f.item_id = i.id
     WHERE ${whereClauses.join(' AND ')}
     LIMIT 1`,
    params
  );

  if (!rows[0]) return null;
  const row = rows[0];

  const tagRows = await query(
    `SELECT t.name FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = $1`,
    [id]
  );

  const item = mapRowToItem(
    row,
    tagRows.map((t) => t.name)
  );

  if (!options?.includeExpired) {
    if (item.isExpired || item.deletedAt || item.deletionStatus !== 'active') {
      return null;
    }
  }

  return item;
}

export async function getItems(params: {
  userId: string;
  type?: string;
  isFavourite?: boolean;
  inTrash?: boolean;
  tag?: string;
  search?: string;
  parentFolderId?: string | null | 'all';
  sortBy?: 'created_desc' | 'created_asc' | 'title_asc';
  limit?: number;
  offset?: number;
}): Promise<Item[]> {
  const conditions: string[] = ['i.user_id = $1'];
  const values: any[] = [params.userId];
  let pIdx = 2;

  if (params.inTrash) {
    conditions.push('i.deleted_at IS NOT NULL');
  } else {
    conditions.push('i.deleted_at IS NULL');
    conditions.push(`(i.deletion_status IS NULL OR i.deletion_status = 'active')`);

    // Folder filtering: when not searching, not in favorites, and not in tag filter
    if (!params.search && !params.isFavourite && !params.tag) {
      if (params.parentFolderId === undefined || params.parentFolderId === null || params.parentFolderId === 'root') {
        conditions.push('i.parent_folder_id IS NULL');
      } else if (params.parentFolderId !== 'all') {
        conditions.push(`i.parent_folder_id = $${pIdx++}`);
        values.push(params.parentFolderId);
      }
    }
  }

  if (params.type && params.type !== 'all') {
    conditions.push(`i.type = $${pIdx++}`);
    values.push(params.type);
  }

  if (params.isFavourite) {
    conditions.push(`i.is_favourite = $${pIdx++}`);
    values.push(isPostgres() ? true : 1);
  }

  if (params.search) {
    const term = `%${params.search.toLowerCase()}%`;
    conditions.push(
      `(LOWER(i.title) LIKE $${pIdx} OR LOWER(COALESCE(i.text_content, '')) LIKE $${pIdx} OR LOWER(COALESCE(i.url, '')) LIKE $${pIdx} OR LOWER(COALESCE(i.note, '')) LIKE $${pIdx} OR LOWER(COALESCE(f.original_filename, '')) LIKE $${pIdx})`
    );
    values.push(term);
    pIdx++;
  }

  let orderBy = 'i.created_at DESC';
  if (params.sortBy === 'created_asc') orderBy = 'i.created_at ASC';
  if (params.sortBy === 'title_asc') orderBy = 'i.title ASC';

  const limitVal = params.limit || 100;
  const offsetVal = params.offset || 0;

  const sql = `
    SELECT i.*, 
           f.id as file_id, f.storage_key, f.original_filename, f.sanitized_filename,
           f.mime_type, f.file_size, f.storage_provider, f.upload_status,
           f.deletion_status as file_deletion_status, f.thumbnail_data
    FROM items i
    LEFT JOIN files f ON f.item_id = i.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ${limitVal} OFFSET ${offsetVal}
  `;

  const rows = await query(sql, values);
  if (!rows.length) return [];

  const itemIds = rows.map((r) => r.id);
  const tagPlaceholders = itemIds.map((_, i) => `$${i + 1}`).join(',');
  const tagRows = await query(
    `SELECT it.item_id, t.name FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id IN (${tagPlaceholders})`,
    itemIds
  );

  const tagMap = new Map<string, string[]>();
  for (const t of tagRows) {
    if (!tagMap.has(t.item_id)) tagMap.set(t.item_id, []);
    tagMap.get(t.item_id)!.push(t.name);
  }

  const mapped = rows.map((row) => mapRowToItem(row, tagMap.get(row.id) || []));

  // Enforce strict real-time expiration check on every listing
  if (!params.inTrash) {
    return mapped.filter((item) => !item.isExpired);
  }

  return mapped;
}

export async function createFolder(params: {
  id?: string;
  userId: string;
  name: string;
  parentFolderId?: string | null;
}): Promise<Item> {
  const id = params.id || crypto.randomUUID();
  await createItem({
    id,
    userId: params.userId,
    type: 'file',
    title: params.name.trim(),
    parentFolderId: params.parentFolderId || null,
    isFolder: true,
    isPermanent: true,
    expirationDurationSec: 0,
    expiresAt: null,
  });
  const item = await getItemById(id, params.userId, { includeExpired: true });
  return item!;
}

export async function getFolders(userId: string, parentFolderId?: string | null): Promise<Item[]> {
  const isPostgresVal = isPostgres();
  const conditions = ['user_id = $1', 'is_folder = $2', 'deleted_at IS NULL'];
  const values: any[] = [userId, isPostgresVal ? true : 1];
  let pIdx = 3;

  if (parentFolderId === undefined || parentFolderId === null || parentFolderId === 'root') {
    conditions.push('parent_folder_id IS NULL');
  } else if (parentFolderId !== 'all') {
    conditions.push(`parent_folder_id = $${pIdx++}`);
    values.push(parentFolderId);
  }

  const sql = `SELECT * FROM items WHERE ${conditions.join(' AND ')} ORDER BY title ASC`;
  const rows = await query(sql, values);
  return rows.map((r) => mapRowToItem(r));
}

export async function moveItemToFolder(
  itemId: string,
  userId: string,
  targetFolderId: string | null
): Promise<void> {
  if (targetFolderId && itemId === targetFolderId) {
    throw new Error('Cannot move a folder into itself');
  }
  if (targetFolderId) {
    const folder = await getItemById(targetFolderId, userId, { includeExpired: true });
    if (!folder || !folder.isFolder) {
      throw new Error('Target folder not found');
    }
  }
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE items SET parent_folder_id = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
    [targetFolderId || null, nowIso, itemId, userId]
  );
}

export async function moveMultipleItemsToFolder(
  itemIds: string[],
  userId: string,
  targetFolderId: string | null
): Promise<number> {
  if (!itemIds.length) return 0;
  if (targetFolderId) {
    const folder = await getItemById(targetFolderId, userId, { includeExpired: true });
    if (!folder || !folder.isFolder) {
      throw new Error('Target folder not found');
    }
  }
  const validIds = targetFolderId ? itemIds.filter((id) => id !== targetFolderId) : itemIds;
  if (!validIds.length) return 0;

  const nowIso = new Date().toISOString();
  let updatedCount = 0;
  for (const id of validIds) {
    await execute(
      `UPDATE items SET parent_folder_id = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
      [targetFolderId || null, nowIso, id, userId]
    );
    updatedCount++;
  }
  return updatedCount;
}

export async function getFolderPath(
  folderId: string,
  userId: string
): Promise<Array<{ id: string; name: string }>> {
  const path: Array<{ id: string; name: string }> = [];
  let currentId: string | null = folderId;
  let depth = 0;
  while (currentId && depth < 20) {
    const item = await getItemById(currentId, userId, { includeExpired: true });
    if (!item) break;
    path.unshift({ id: item.id, name: item.title });
    currentId = item.parentFolderId || null;
    depth++;
  }
  return path;
}

export async function updateItem(
  id: string,
  userId: string,
  data: {
    title?: string;
    textContent?: string;
    url?: string;
    note?: string;
    isFavourite?: boolean;
    parentFolderId?: string | null;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const fields: string[] = [`updated_at = $1`];
  const values: any[] = [nowIso];
  let pIdx = 2;

  if (data.title !== undefined) {
    fields.push(`title = $${pIdx++}`);
    values.push(data.title);
  }
  if (data.textContent !== undefined) {
    fields.push(`text_content = $${pIdx++}`);
    values.push(data.textContent);
  }
  if (data.url !== undefined) {
    fields.push(`url = $${pIdx++}`);
    values.push(data.url);
  }
  if (data.note !== undefined) {
    fields.push(`note = $${pIdx++}`);
    values.push(data.note);
  }
  if (data.isFavourite !== undefined) {
    fields.push(`is_favourite = $${pIdx++}`);
    values.push(data.isFavourite ? (isPostgres() ? true : 1) : isPostgres() ? false : 0);
  }
  if (data.parentFolderId !== undefined) {
    fields.push(`parent_folder_id = $${pIdx++}`);
    values.push(data.parentFolderId);
  }

  values.push(id, userId);
  const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = $${pIdx++} AND user_id = $${pIdx}`;
  await execute(sql, values);
}

export async function softDeleteItem(id: string, userId: string): Promise<void> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const purgeAtIso = new Date(now + 30 * 24 * 3600 * 1000).toISOString(); // 30-day trash retention
  await execute(
    `UPDATE items SET deleted_at = $1, purge_at = $2, deletion_status = 'deleted', updated_at = $1 WHERE (id = $3 OR parent_folder_id = $3) AND user_id = $4`,
    [nowIso, purgeAtIso, id, userId]
  );
  // Revoke any active chat shares for this item
  await execute(`UPDATE item_shares SET revoked_at = $1 WHERE item_id = $2`, [nowIso, id]);
}

export async function restoreItem(id: string, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE items SET deleted_at = NULL, purge_at = NULL, deletion_status = 'active', updated_at = $1 WHERE (id = $2 OR parent_folder_id = $2) AND user_id = $3`,
    [nowIso, id, userId]
  );
}

export async function permanentDeleteItem(id: string, userId: string): Promise<string | null> {
  const fileRows = await query(
    `SELECT f.storage_key, f.storage_provider FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE (i.id = $1 OR i.parent_folder_id = $1) AND i.user_id = $2`,
    [id, userId]
  );

  for (const r of fileRows) {
    if (r.storage_key) {
      await enqueueStorageDeletion(
        r.storage_key,
        r.storage_provider || (r.storage_key.startsWith('gdrive://') ? 'google_drive' : 'local'),
        'user_deleted'
      );
    }
  }

  await execute(`DELETE FROM items WHERE (id = $1 OR parent_folder_id = $1) AND user_id = $2`, [id, userId]);
  return fileRows[0]?.storage_key || null;
}

export async function emptyTrash(userId: string): Promise<string[]> {
  const fileRows = await query(
    `SELECT f.storage_key, f.storage_provider FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE i.user_id = $1 AND i.deleted_at IS NOT NULL`,
    [userId]
  );
  const keys: string[] = [];
  for (const r of fileRows) {
    if (r.storage_key) {
      keys.push(r.storage_key);
      await enqueueStorageDeletion(
        r.storage_key,
        r.storage_provider || (r.storage_key.startsWith('gdrive://') ? 'google_drive' : 'local'),
        'user_deleted'
      );
    }
  }

  await execute(`DELETE FROM items WHERE user_id = $1 AND deleted_at IS NOT NULL`, [userId]);
  return keys;
}

export async function toggleItemFavourite(id: string, userId: string): Promise<boolean> {
  const item = await getItemById(id, userId);
  if (!item) throw new Error('Item not found or expired');
  const nextFav = !item.isFavourite;
  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE items SET is_favourite = $1, updated_at = $2 WHERE id = $3 AND user_id = $4`,
    [nextFav ? (isPostgres() ? true : 1) : isPostgres() ? false : 0, nowIso, id, userId]
  );
  return nextFav;
}

// ============================================================================
// FILE RECORD REPOSITORY & DOWNLOAD AUTHORIZATION
// ============================================================================

export async function createFileRecord(file: {
  id: string;
  itemId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  sanitizedFilename?: string;
  mimeType: string;
  fileSize: number;
  storageProvider?: string;
  providerFileId?: string;
  uploadStatus?: 'pending' | 'completed' | 'failed';
  thumbnailData?: string | null;
}): Promise<void> {
  const sanitized =
    file.sanitizedFilename || sanitizeFilenameForDisplay(file.originalFilename);
  const provider =
    file.storageProvider ||
    (file.storageKey.startsWith('gdrive://') ? 'google_drive' : 'local');
  const nowIso = new Date().toISOString();

  await execute(
    `INSERT INTO files (
      id, item_id, user_id, storage_key, original_filename, sanitized_filename,
      mime_type, file_size, storage_provider, provider_file_id, upload_status, deletion_status, thumbnail_data, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13)`,
    [
      file.id,
      file.itemId,
      file.userId,
      file.storageKey,
      file.originalFilename,
      sanitized,
      file.mimeType,
      file.fileSize,
      provider,
      file.providerFileId || null,
      file.uploadStatus || 'completed',
      file.thumbnailData || null,
      nowIso,
    ]
  );
}

export async function updateFileStatus(
  storageKey: string,
  status: 'pending' | 'completed' | 'failed'
): Promise<void> {
  await execute(`UPDATE files SET upload_status = $1 WHERE storage_key = $2`, [
    status,
    storageKey,
  ]);
}

/**
 * Authorizes a file download or preview request.
 * Enforces:
 * 1. Item exists and has not been deleted.
 * 2. Item has NOT expired (checked against exact server clock, even before cleanup runs!).
 * 3. Requesting user is either the item's owner OR an authorized recipient in an active chat share
 *    where neither participant has blocked the other.
 */
export async function authorizeFileAccess(
  itemOrFileId: string,
  requestingUserId: string
): Promise<{
  status: 'ok' | 'not_found' | 'expired' | 'forbidden';
  file?: {
    id: string;
    item_id: string;
    user_id: string;
    storage_key: string;
    original_filename: string;
    sanitized_filename: string;
    mime_type: string;
    file_size: number;
    expires_at: string;
  };
}> {
  const rows = await query(
    `SELECT f.*, i.id as item_id, i.user_id as owner_id, i.expires_at, i.deleted_at, i.deletion_status
     FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE (i.id = $1 OR f.id = $1)
     LIMIT 1`,
    [itemOrFileId]
  );

  if (!rows.length) {
    return { status: 'not_found' };
  }

  const row = rows[0];

  // Check if deleted
  if (
    row.deleted_at !== null ||
    (row.deletion_status && row.deletion_status !== 'active') ||
    (row.upload_status && row.upload_status !== 'completed')
  ) {
    return { status: 'not_found' };
  }

  // Check expiration deadline strictly
  if (isTimestampExpired(row.expires_at)) {
    return { status: 'expired' };
  }

  // Check ownership or shared recipient permission
  const isOwner = row.owner_id === requestingUserId;
  if (!isOwner) {
    const shareRows = await query(
      `SELECT s.id, s.sender_id, s.recipient_id
       FROM item_shares s
       WHERE s.item_id = $1 AND s.recipient_id = $2 AND s.revoked_at IS NULL
       LIMIT 1`,
      [row.item_id, requestingUserId]
    );

    if (!shareRows.length) {
      return { status: 'forbidden' };
    }

    // Check if blocked
    const blocked = await isEitherUserBlocked(row.owner_id, requestingUserId);
    if (blocked) {
      return { status: 'forbidden' };
    }
  }

  return {
    status: 'ok',
    file: {
      id: row.id,
      item_id: row.item_id,
      user_id: row.owner_id,
      storage_key: row.storage_key,
      original_filename: row.original_filename,
      sanitized_filename:
        row.sanitized_filename || sanitizeFilenameForDisplay(row.original_filename),
      mime_type: row.mime_type,
      file_size: Number(row.file_size || 0),
      expires_at: row.expires_at,
    },
  };
}

// ============================================================================
// STORAGE USAGE, QUOTA RESERVATION & UPLOAD SESSIONS
// ============================================================================

export async function getUserStorageUsage(
  userId: string,
  liveProviderQuota?: {
    usedBytes?: number;
    limitBytes?: number;
    availableBytes?: number;
  }
): Promise<StorageUsage> {
  const user = await getUserById(userId);
  const limitBytes = user?.storageLimitBytes || SITE_CONFIG.defaultUserStorageLimitBytes;
  const avatarBytes = user?.avatarSizeBytes || 0;
  const nowIso = new Date().toISOString();

  // Active non-expired completed files for this user
  const fileRows = await query(
    `SELECT COALESCE(SUM(f.file_size), 0) as total_bytes, COUNT(f.id) as file_count
     FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE f.user_id = $1
       AND i.deleted_at IS NULL
       AND (i.deletion_status IS NULL OR i.deletion_status = 'active')
       AND (i.expires_at IS NULL OR i.expires_at > $2)
       AND f.upload_status = 'completed'`,
    [userId, nowIso]
  );

  // Active reserved upload bytes for this user
  const reservedRows = await query(
    `SELECT COALESCE(SUM(reserved_bytes), 0) as reserved_bytes
     FROM upload_sessions
     WHERE user_id = $1 AND status IN ('pending', 'uploading') AND expires_at > $2`,
    [userId, nowIso]
  );

  // Global physical bytes across all users: includes any completed file not yet physically deleted from storage
  const globalFileRows = await query(
    `SELECT COALESCE(SUM(f.file_size), 0) as total_bytes
     FROM files f
     WHERE f.upload_status = 'completed'
       AND COALESCE(f.deletion_status, 'active') <> 'deleted'`
  );

  const globalAvatarRows = await query(
    `SELECT COALESCE(SUM(avatar_size_bytes), 0) as avatar_bytes FROM users`
  );

  const globalReservedRows = await query(
    `SELECT COALESCE(SUM(reserved_bytes), 0) as reserved_bytes
     FROM upload_sessions
     WHERE status IN ('pending', 'uploading') AND expires_at > $1`,
    [nowIso]
  );

  const breakdownRows = await query(
    `SELECT i.type, COUNT(i.id) as count
     FROM items i
     WHERE i.user_id = $1
       AND i.deleted_at IS NULL
       AND (i.deletion_status IS NULL OR i.deletion_status = 'active')
       AND (i.expires_at IS NULL OR i.expires_at > $2)
     GROUP BY i.type`,
    [userId, nowIso]
  );

  const breakdown = {
    texts: 0,
    photos: 0,
    videos: 0,
    files: 0,
    links: 0,
  };

  for (const b of breakdownRows) {
    if (b.type === 'text') breakdown.texts = Number(b.count);
    if (b.type === 'image') breakdown.photos = Number(b.count);
    if (b.type === 'video') breakdown.videos = Number(b.count);
    if (b.type === 'file') breakdown.files = Number(b.count);
    if (b.type === 'link') breakdown.links = Number(b.count);
  }

  const itemCount = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const usedBytes = Number(fileRows[0]?.total_bytes || 0) + avatarBytes;
  const reservedBytes = Number(reservedRows[0]?.reserved_bytes || 0);

  const dbGlobalUsedBytes =
    Number(globalFileRows[0]?.total_bytes || 0) +
    Number(globalAvatarRows[0]?.avatar_bytes || 0);
  const globalReservedBytes = Number(globalReservedRows[0]?.reserved_bytes || 0);

  const globalLimitBytes =
    typeof liveProviderQuota?.limitBytes === 'number' && liveProviderQuota.limitBytes > 0
      ? liveProviderQuota.limitBytes
      : SITE_CONFIG.globalStorageLimitBytes;
  const globalUsedBytes =
    typeof liveProviderQuota?.usedBytes === 'number' && liveProviderQuota.usedBytes >= 0
      ? Math.max(dbGlobalUsedBytes, liveProviderQuota.usedBytes)
      : dbGlobalUsedBytes;

  const safetyReserveBytes = SITE_CONFIG.storageSafetyReserveBytes;
  const effectiveGlobalCeiling = Math.max(0, globalLimitBytes - safetyReserveBytes);
  const dbBasedAvailable = Math.max(
    0,
    effectiveGlobalCeiling - globalUsedBytes - globalReservedBytes
  );
  const globalAvailableBytes =
    typeof liveProviderQuota?.availableBytes === 'number'
      ? Math.max(
          0,
          Math.min(
            dbBasedAvailable,
            liveProviderQuota.availableBytes - safetyReserveBytes - globalReservedBytes
          )
        )
      : dbBasedAvailable;

  return {
    usedBytes,
    reservedBytes,
    avatarBytes,
    limitBytes,
    globalUsedBytes,
    globalReservedBytes,
    globalLimitBytes,
    globalAvailableBytes,
    safetyReserveBytes,
    itemCount,
    fileCount: Number(fileRows[0]?.file_count || 0),
    breakdown,
  };
}

/**
 * Atomically checks storage budgets (per-file, per-user, and global pool with safety reserve)
 * and creates a pending upload session reserving the requested bytes.
 */
export async function reserveUploadSession(params: {
  userId: string;
  itemId: string;
  title?: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  expirationDurationSec: number;
  storageProvider: string;
  storageKey?: string;
  providerUploadUrl?: string;
  liveDriveAvailableBytes?: number;
}): Promise<{
  allowed: boolean;
  sessionId?: string;
  sanitizedFilename?: string;
  error?: string;
  statusCode?: number;
}> {
  if (params.fileSize <= 0) {
    return { allowed: false, error: 'File cannot be empty', statusCode: 400 };
  }

  if (params.fileSize > SITE_CONFIG.maxUploadSizeBytes) {
    return {
      allowed: false,
      error: `File exceeds the maximum allowed upload size of ${Math.round(
        SITE_CONFIG.maxUploadSizeBytes / (1024 * 1024)
      )} MiB.`,
      statusCode: 400,
    };
  }

  const usage = await getUserStorageUsage(params.userId);

  // 1. Check user's personal storage quota (including in-flight reserved uploads)
  if (usage.usedBytes + usage.reservedBytes + params.fileSize > usage.limitBytes) {
    return {
      allowed: false,
      error: 'Personal storage quota exceeded. Delete existing files or wait for items to expire.',
      statusCode: 403,
    };
  }

  // 2. Check global application storage budget (including safety reserve)
  if (params.fileSize > usage.globalAvailableBytes) {
    return {
      allowed: false,
      error:
        'Global application storage capacity is currently full. Please try again after temporary files expire.',
      statusCode: 507,
    };
  }

  // 3. If live Google Drive quota was supplied, also ensure we respect the real Drive available bytes minus safety reserve
  if (
    typeof params.liveDriveAvailableBytes === 'number' &&
    params.liveDriveAvailableBytes - SITE_CONFIG.storageSafetyReserveBytes - usage.globalReservedBytes <
      params.fileSize
  ) {
    return {
      allowed: false,
      error:
        'Insufficient available space in the connected Google Drive storage pool (safety reserve reached).',
      statusCode: 507,
    };
  }

  const sessionId = crypto.randomUUID();
  const sanitizedFilename = sanitizeFilenameForDisplay(params.originalFilename);
  const nowIso = new Date().toISOString();
  const sessionExpiresIso = new Date(
    Date.now() + SITE_CONFIG.uploadSessionTimeoutSeconds * 1000
  ).toISOString();

  await execute(
    `INSERT INTO upload_sessions (
      id, user_id, item_id, title, original_filename, sanitized_filename,
      mime_type, reserved_bytes, expiration_duration_sec, storage_provider,
      storage_key, provider_upload_url, status, expires_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $14)`,
    [
      sessionId,
      params.userId,
      params.itemId,
      params.title || null,
      params.originalFilename,
      sanitizedFilename,
      params.mimeType,
      params.fileSize,
      params.expirationDurationSec,
      params.storageProvider,
      params.storageKey || null,
      params.providerUploadUrl || null,
      sessionExpiresIso,
      nowIso,
    ]
  );

  return {
    allowed: true,
    sessionId,
    sanitizedFilename,
  };
}

export async function getUploadSession(sessionId: string, userId: string): Promise<any | null> {
  const rows = await query(
    `SELECT * FROM upload_sessions WHERE id = $1 AND user_id = $2 LIMIT 1`,
    [sessionId, userId]
  );
  return rows[0] || null;
}

export async function updateUploadSession(
  sessionId: string,
  userId: string,
  updates: {
    status?: 'pending' | 'uploading' | 'completed' | 'cancelled' | 'failed' | 'expired';
    storageKey?: string;
    providerUploadUrl?: string;
    providerFileId?: string;
  }
): Promise<void> {
  const nowIso = new Date().toISOString();
  const fields: string[] = [`updated_at = $1`];
  const values: any[] = [nowIso];
  let idx = 2;

  if (updates.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(updates.status);
  }
  if (updates.storageKey !== undefined) {
    fields.push(`storage_key = $${idx++}`);
    values.push(updates.storageKey);
  }
  if (updates.providerUploadUrl !== undefined) {
    fields.push(`provider_upload_url = $${idx++}`);
    values.push(updates.providerUploadUrl);
  }
  if (updates.providerFileId !== undefined) {
    fields.push(`provider_file_id = $${idx++}`);
    values.push(updates.providerFileId);
  }

  values.push(sessionId, userId);
  await execute(
    `UPDATE upload_sessions SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx}`,
    values
  );
}

// ============================================================================
// DELETION QUEUE & SCHEDULED EXPIRATION CLEANUP
// ============================================================================

export async function enqueueStorageDeletion(
  storageKey: string,
  storageProvider: string,
  reason: string
): Promise<void> {
  if (!storageKey) return;
  const nowIso = new Date().toISOString();
  const existing = await query(`SELECT id FROM deletion_queue WHERE storage_key = $1 LIMIT 1`, [
    storageKey,
  ]);
  if (existing.length > 0) {
    await execute(
      `UPDATE deletion_queue SET status = 'pending', next_retry_at = $1, updated_at = $1 WHERE storage_key = $2 AND status <> 'completed'`,
      [nowIso, storageKey]
    );
  } else {
    await execute(
      `INSERT INTO deletion_queue (id, storage_key, storage_provider, reason, status, attempts, next_retry_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', 0, $5, $5, $5)`,
      [crypto.randomUUID(), storageKey, storageProvider, reason, nowIso]
    );
  }
}

/**
 * Finds expired items, marks them inaccessible, enqueues their Drive files for permanent deletion,
 * cleans up abandoned upload sessions, and executes physical deletion with retry backoff.
 */
export async function runExpirationCleanup(callbacks: {
  deleteStorageObject: (storageKey: string) => Promise<boolean>;
  abortUploadSession?: (sessionUrl: string) => Promise<boolean>;
}): Promise<{
  expiredItemsMarked: number;
  abandonedSessionsCleaned: number;
  storageObjectsDeleted: number;
  storageDeletionsFailed: number;
}> {
  const nowIso = new Date().toISOString();
  let expiredItemsMarked = 0;
  let abandonedSessionsCleaned = 0;
  let storageObjectsDeleted = 0;
  let storageDeletionsFailed = 0;

  // 1. Find active items whose expiration time has passed
  const expiredRows = await query(
    `SELECT i.id, f.storage_key, f.storage_provider
     FROM items i
     LEFT JOIN files f ON f.item_id = i.id
     WHERE (i.deletion_status IS NULL OR i.deletion_status = 'active')
       AND i.expires_at IS NOT NULL
       AND i.expires_at <= $1
     LIMIT 200`,
    [nowIso]
  );

  for (const row of expiredRows) {
    await execute(
      `UPDATE items SET deletion_status = 'expired', updated_at = $1 WHERE id = $2`,
      [nowIso, row.id]
    );
    await execute(`UPDATE item_shares SET revoked_at = $1 WHERE item_id = $2`, [nowIso, row.id]);
    await execute(`UPDATE shares SET revoked_at = $1 WHERE item_id = $2 AND revoked_at IS NULL`, [nowIso, row.id]);

    if (row.storage_key) {
      await execute(
        `UPDATE files SET deletion_status = 'pending_deletion' WHERE item_id = $1`,
        [row.id]
      );
      await enqueueStorageDeletion(
        row.storage_key,
        row.storage_provider ||
          (row.storage_key.startsWith('gdrive://') ? 'google_drive' : 'local'),
        'expired'
      );
    }
    expiredItemsMarked++;
  }

  // 1.25. Auto-revoke expired public shares
  await execute(`UPDATE shares SET revoked_at = $1, updated_at = $1 WHERE revoked_at IS NULL AND expires_at <= $1`, [nowIso]);

  // 1.5. Clean up items in trash past their 30-day retention threshold
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const trashPurgeRows = await query(
    `SELECT i.id, f.storage_key, f.storage_provider
     FROM items i
     LEFT JOIN files f ON f.item_id = i.id
     WHERE i.deleted_at IS NOT NULL
       AND (
         (i.purge_at IS NOT NULL AND i.purge_at <= $1)
         OR
         (i.purge_at IS NULL AND i.deleted_at <= $2)
       )
     LIMIT 100`,
    [nowIso, thirtyDaysAgoIso]
  );

  for (const row of trashPurgeRows) {
    if (row.storage_key) {
      await enqueueStorageDeletion(
        row.storage_key,
        row.storage_provider || 'google_drive',
        'trash_30day_purge'
      );
    }
    await execute(`DELETE FROM items WHERE id = $1`, [row.id]);
    expiredItemsMarked++;
  }

  // 2. Clean up expired / abandoned upload sessions
  const expiredSessions = await query(
    `SELECT id, storage_key, storage_provider, provider_upload_url
     FROM upload_sessions
     WHERE status IN ('pending', 'uploading') AND expires_at <= $1
     LIMIT 100`,
    [nowIso]
  );

  for (const sess of expiredSessions) {
    await execute(
      `UPDATE upload_sessions SET status = 'expired', updated_at = $1 WHERE id = $2`,
      [nowIso, sess.id]
    );
    if (sess.provider_upload_url && callbacks.abortUploadSession) {
      await callbacks.abortUploadSession(sess.provider_upload_url).catch(() => false);
    }
    if (sess.storage_key) {
      await enqueueStorageDeletion(
        sess.storage_key,
        sess.storage_provider || 'google_drive',
        'upload_expired'
      );
    }
    abandonedSessionsCleaned++;
  }

  // 3. Process pending storage deletions (including retries)
  const queueNowIso = new Date().toISOString();
  const queueRows = await query(
    `SELECT * FROM deletion_queue
     WHERE status IN ('pending', 'failed')
       AND attempts < 10
       AND next_retry_at <= $1
     ORDER BY next_retry_at ASC
     LIMIT 100`,
    [queueNowIso]
  );

  for (const q of queueRows) {
    try {
      const deleted = await callbacks.deleteStorageObject(q.storage_key);
      if (deleted) {
        await execute(
          `UPDATE deletion_queue SET status = 'completed', updated_at = $1 WHERE id = $2`,
          [nowIso, q.id]
        );
        await execute(
          `UPDATE files SET deletion_status = 'deleted', deleted_from_storage_at = $1 WHERE storage_key = $2`,
          [nowIso, q.storage_key]
        );
        storageObjectsDeleted++;
      } else {
        const nextAttempts = Number(q.attempts || 0) + 1;
        // Exponential backoff: 1m, 2m, 4m, 8m...
        const backoffSec = Math.min(3600, Math.pow(2, nextAttempts) * 30);
        const nextRetryIso = new Date(Date.now() + backoffSec * 1000).toISOString();
        await execute(
          `UPDATE deletion_queue
           SET status = 'failed', attempts = $1, last_error = 'Provider deleteFile returned false', next_retry_at = $2, updated_at = $3
           WHERE id = $4`,
          [nextAttempts, nextRetryIso, nowIso, q.id]
        );
        await execute(
          `UPDATE files
           SET deletion_status = 'deletion_failed', deletion_attempts = $1, last_deletion_error = 'Provider deleteFile returned false'
           WHERE storage_key = $2`,
          [nextAttempts, q.storage_key]
        );
        storageDeletionsFailed++;
      }
    } catch (err: any) {
      const nextAttempts = Number(q.attempts || 0) + 1;
      const backoffSec = Math.min(3600, Math.pow(2, nextAttempts) * 30);
      const nextRetryIso = new Date(Date.now() + backoffSec * 1000).toISOString();
      const safeError = (err?.message || 'Storage deletion error').slice(0, 250);
      await execute(
        `UPDATE deletion_queue
         SET status = 'failed', attempts = $1, last_error = $2, next_retry_at = $3, updated_at = $4
         WHERE id = $5`,
        [nextAttempts, safeError, nextRetryIso, nowIso, q.id]
      );
      storageDeletionsFailed++;
    }
  }

  return {
    expiredItemsMarked,
    abandonedSessionsCleaned,
    storageObjectsDeleted,
    storageDeletionsFailed,
  };
}

// ============================================================================
// USER BLOCKING & PRIVATE 1-TO-1 MESSAGING REPOSITORY
// ============================================================================

export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) throw new Error('Cannot block yourself');
  const existing = await query(
    `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2 LIMIT 1`,
    [blockerId, blockedId]
  );
  if (!existing.length) {
    const nowIso = new Date().toISOString();
    await execute(
      `INSERT INTO user_blocks (blocker_id, blocked_id, created_at) VALUES ($1, $2, $3)`,
      [blockerId, blockedId, nowIso]
    );
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await execute(`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [
    blockerId,
    blockedId,
  ]);
}

export async function getBlockRelationship(
  userId: string,
  peerId: string
): Promise<{ isBlockedByMe: boolean; hasBlockedMe: boolean }> {
  const rows = await query(
    `SELECT blocker_id, blocked_id FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)`,
    [userId, peerId]
  );

  let isBlockedByMe = false;
  let hasBlockedMe = false;
  for (const r of rows) {
    if (r.blocker_id === userId && r.blocked_id === peerId) isBlockedByMe = true;
    if (r.blocker_id === peerId && r.blocked_id === userId) hasBlockedMe = true;
  }
  return { isBlockedByMe, hasBlockedMe };
}

export async function isEitherUserBlocked(userA: string, userB: string): Promise<boolean> {
  const rel = await getBlockRelationship(userA, userB);
  return rel.isBlockedByMe || rel.hasBlockedMe;
}

function canonicalParticipants(user1: string, user2: string): [string, string] {
  return user1 < user2 ? [user1, user2] : [user2, user1];
}

export async function getOrCreateConversation(
  currentUserId: string,
  targetUsername: string
): Promise<{
  conversation: ConversationSummary;
  peerId: string;
}> {
  const targetUser = await getUserByUsername(targetUsername);
  if (!targetUser) {
    throw new Error('User not found');
  }
  if (targetUser.id === currentUserId) {
    throw new Error('You cannot start a conversation with yourself');
  }

  const [partA, partB] = canonicalParticipants(currentUserId, targetUser.id);
  const existingRows = await query(
    `SELECT * FROM conversations WHERE participant_a = $1 AND participant_b = $2 LIMIT 1`,
    [partA, partB]
  );

  const nowIso = new Date().toISOString();
  let conv = existingRows[0];

  if (!conv) {
    const convId = crypto.randomUUID();
    await execute(
      `INSERT INTO conversations (id, participant_a, participant_b, last_message_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4, $4)`,
      [convId, partA, partB, nowIso]
    );
    conv = {
      id: convId,
      participant_a: partA,
      participant_b: partB,
      last_message_at: nowIso,
      created_at: nowIso,
    };
  } else {
    // If the user previously hid the conversation and explicitly re-opens it, clear their hide timestamp
    if (currentUserId === partA && conv.deleted_by_a_at) {
      await execute(`UPDATE conversations SET deleted_by_a_at = NULL WHERE id = $1`, [conv.id]);
    } else if (currentUserId === partB && conv.deleted_by_b_at) {
      await execute(`UPDATE conversations SET deleted_by_b_at = NULL WHERE id = $1`, [conv.id]);
    }
  }

  const blockRel = await getBlockRelationship(currentUserId, targetUser.id);

  return {
    peerId: targetUser.id,
    conversation: {
      id: conv.id,
      peer: {
        username: targetUser.display_username || targetUser.username,
        avatarUrl: formatAvatarUrl(targetUser),
      },
      isBlockedByMe: blockRel.isBlockedByMe,
      hasBlockedMe: blockRel.hasBlockedMe,
      lastMessageAt: conv.last_message_at,
      lastMessagePreview: null,
      createdAt: conv.created_at,
    },
  };
}

export async function listUserConversations(userId: string): Promise<ConversationSummary[]> {
  const rows = await query(
    `SELECT c.*,
            ua.username as a_username, ua.display_username as a_display, ua.avatar_data as a_avatar_data, ua.avatar_storage_key as a_avatar_key,
            ub.username as b_username, ub.display_username as b_display, ub.avatar_data as b_avatar_data, ub.avatar_storage_key as b_avatar_key
     FROM conversations c
     JOIN users ua ON c.participant_a = ua.id
     JOIN users ub ON c.participant_b = ub.id
     WHERE c.participant_a = $1 OR c.participant_b = $1
     ORDER BY c.last_message_at DESC
     LIMIT 100`,
    [userId]
  );

  const summaries: ConversationSummary[] = [];

  for (const r of rows) {
    const isPartA = r.participant_a === userId;
    const deletedAtForMe = isPartA ? r.deleted_by_a_at : r.deleted_by_b_at;

    // Fetch latest visible message for preview
    let msgRows: any[] = [];
    if (deletedAtForMe) {
      msgRows = await query(
        `SELECT message_type, text_content, attachment_snapshot_title, created_at
         FROM messages
         WHERE conversation_id = $1 AND created_at > $2
         ORDER BY created_at DESC LIMIT 1`,
        [r.id, deletedAtForMe]
      );
      // If user deleted the conversation and no newer messages have arrived since, hide it from their list
      if (msgRows.length === 0) {
        continue;
      }
    } else {
      msgRows = await query(
        `SELECT message_type, text_content, attachment_snapshot_title, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC LIMIT 1`,
        [r.id]
      );
    }

    const peerId = isPartA ? r.participant_b : r.participant_a;
    const peerUsername = isPartA
      ? r.b_display || r.b_username
      : r.a_display || r.a_username;
    const peerAvatarObj = isPartA
      ? { username: r.b_username, avatar_data: r.b_avatar_data, avatar_storage_key: r.b_avatar_key }
      : { username: r.a_username, avatar_data: r.a_avatar_data, avatar_storage_key: r.a_avatar_key };

    const blockRel = await getBlockRelationship(userId, peerId);
    const lastMsg = msgRows[0];
    let preview: string | null = null;
    if (lastMsg) {
      preview =
        lastMsg.message_type === 'attachment'
          ? `Shared: ${lastMsg.attachment_snapshot_title || 'Attachment'}`
          : (lastMsg.text_content || '').slice(0, 80);
    }

    summaries.push({
      id: r.id,
      peer: {
        username: peerUsername,
        avatarUrl: formatAvatarUrl(peerAvatarObj),
      },
      isBlockedByMe: blockRel.isBlockedByMe,
      hasBlockedMe: blockRel.hasBlockedMe,
      lastMessageAt: lastMsg?.created_at || r.last_message_at,
      lastMessagePreview: preview,
      createdAt: r.created_at,
    });
  }

  return summaries;
}

/**
 * Deletes/hides a conversation from the requesting user's conversation list
 * without erasing the other participant's conversation history.
 */
export async function deleteConversationForUser(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const rows = await query(`SELECT * FROM conversations WHERE id = $1 LIMIT 1`, [
    conversationId,
  ]);
  if (!rows.length) return false;
  const conv = rows[0];
  if (conv.participant_a !== userId && conv.participant_b !== userId) {
    throw new Error('Forbidden');
  }

  const nowIso = new Date().toISOString();
  if (conv.participant_a === userId) {
    await execute(`UPDATE conversations SET deleted_by_a_at = $1 WHERE id = $2`, [
      nowIso,
      conversationId,
    ]);
  } else {
    await execute(`UPDATE conversations SET deleted_by_b_at = $1 WHERE id = $2`, [
      nowIso,
      conversationId,
    ]);
  }
  return true;
}

export async function getConversationMessages(
  conversationId: string,
  requestingUserId: string
): Promise<{
  conversation: ConversationSummary;
  messages: ChatMessage[];
}> {
  const convRows = await query(
    `SELECT c.*,
            ua.username as a_username, ua.display_username as a_display, ua.avatar_data as a_avatar_data, ua.avatar_storage_key as a_avatar_key,
            ub.username as b_username, ub.display_username as b_display, ub.avatar_data as b_avatar_data, ub.avatar_storage_key as b_avatar_key
     FROM conversations c
     JOIN users ua ON c.participant_a = ua.id
     JOIN users ub ON c.participant_b = ub.id
     WHERE c.id = $1
     LIMIT 1`,
    [conversationId]
  );

  if (!convRows.length) {
    throw new Error('Conversation not found');
  }

  const conv = convRows[0];
  if (conv.participant_a !== requestingUserId && conv.participant_b !== requestingUserId) {
    throw new Error('Forbidden: You are not a participant in this conversation');
  }

  const isPartA = conv.participant_a === requestingUserId;
  const deletedAtForMe = isPartA ? conv.deleted_by_a_at : conv.deleted_by_b_at;
  const peerId = isPartA ? conv.participant_b : conv.participant_a;
  const peerUsername = isPartA
    ? conv.b_display || conv.b_username
    : conv.a_display || conv.a_username;
  const myUsername = isPartA
    ? conv.a_display || conv.a_username
    : conv.b_display || conv.b_username;
  const peerAvatarObj = isPartA
    ? { username: conv.b_username, avatar_data: conv.b_avatar_data, avatar_storage_key: conv.b_avatar_key }
    : { username: conv.a_username, avatar_data: conv.a_avatar_data, avatar_storage_key: conv.a_avatar_key };

  const blockRel = await getBlockRelationship(requestingUserId, peerId);

  const msgParams: any[] = [conversationId];
  let deletedFilter = '';
  if (deletedAtForMe) {
    deletedFilter = 'AND m.created_at > $2';
    msgParams.push(deletedAtForMe);
  }

  const msgRows = await query(
    `SELECT m.*,
            i.id as live_item_id, i.type as live_item_type, i.title as live_item_title,
            i.text_content as live_text_content, i.url as live_url,
            i.expires_at as live_expires_at, i.deleted_at as live_deleted_at,
            i.deletion_status as live_deletion_status,
            f.id as live_file_id, f.original_filename, f.sanitized_filename,
            f.mime_type, f.file_size, f.upload_status
     FROM messages m
     LEFT JOIN items i ON m.shared_item_id = i.id
     LEFT JOIN files f ON f.item_id = i.id
     WHERE m.conversation_id = $1 ${deletedFilter}
     ORDER BY m.created_at ASC
     LIMIT 300`,
    msgParams
  );

  const messages: ChatMessage[] = msgRows.map((m) => {
    const isOwn = m.sender_id === requestingUserId;
    let attachment: SharedAttachmentInfo | null = null;

    if (m.message_type === 'attachment') {
      const expiresAt = m.live_expires_at || m.attachment_expires_at || null;
      const isExpired = isTimestampExpired(expiresAt) || m.live_deletion_status === 'expired';
      const isDeleted =
        !m.live_item_id ||
        m.live_deleted_at !== null ||
        (m.live_deletion_status && m.live_deletion_status !== 'active' && m.live_deletion_status !== 'expired');
      const isAvailable = !isExpired && !isDeleted && !blockRel.isBlockedByMe && !blockRel.hasBlockedMe;

      const itemType = m.live_item_type || m.attachment_snapshot_type || 'file';
      const hasBinaryFile = Boolean(m.live_file_id);

      attachment = {
        itemId: isAvailable ? m.live_item_id : null,
        title: m.live_item_title || m.attachment_snapshot_title || 'Shared item',
        type: itemType,
        textContent: isAvailable ? m.live_text_content : null,
        url: isAvailable ? m.live_url : null,
        filename: isAvailable
          ? m.sanitized_filename || m.original_filename || m.attachment_snapshot_title
          : m.attachment_snapshot_title || 'File',
        mimeType: isAvailable ? m.mime_type : null,
        fileSize: m.file_size
          ? Number(m.file_size)
          : m.attachment_snapshot_size
          ? Number(m.attachment_snapshot_size)
          : null,
        expiresAt,
        isExpired,
        isDeleted,
        isAvailable,
        downloadUrl:
          isAvailable && hasBinaryFile ? `/api/storage/file/${m.live_item_id}` : null,
      };
    }

    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderUsername: isOwn ? myUsername : peerUsername,
      isOwnMessage: isOwn,
      messageType: m.message_type,
      textContent: m.text_content,
      attachment,
      createdAt: m.created_at,
    };
  });

  return {
    conversation: {
      id: conv.id,
      peer: {
        username: peerUsername,
        avatarUrl: formatAvatarUrl(peerAvatarObj),
      },
      isBlockedByMe: blockRel.isBlockedByMe,
      hasBlockedMe: blockRel.hasBlockedMe,
      lastMessageAt: conv.last_message_at,
      lastMessagePreview: null,
      createdAt: conv.created_at,
    },
    messages,
  };
}

/**
 * Sends a text message or shares an existing vault item in a 1-to-1 conversation.
 * Note on shared vault items:
 * - Sender must own the vault item.
 * - Item must be active and non-expired.
 * - Sharing NEVER duplicates Google Drive objects and NEVER extends the source item's expiration.
 */
export async function sendChatMessage(params: {
  conversationId: string;
  senderId: string;
  messageType: 'text' | 'attachment';
  textContent?: string | null;
  sharedItemId?: string | null;
}): Promise<ChatMessage> {
  const convRows = await query(`SELECT * FROM conversations WHERE id = $1 LIMIT 1`, [
    params.conversationId,
  ]);
  if (!convRows.length) {
    throw new Error('Conversation not found');
  }

  const conv = convRows[0];
  if (conv.participant_a !== params.senderId && conv.participant_b !== params.senderId) {
    throw new Error('Forbidden: You are not a participant in this conversation');
  }

  const recipientId =
    conv.participant_a === params.senderId ? conv.participant_b : conv.participant_a;

  // Enforce blocking rules
  const blocked = await isEitherUserBlocked(params.senderId, recipientId);
  if (blocked) {
    throw new Error('Cannot send message: communication between these accounts is blocked');
  }

  const senderUser = await getUserById(params.senderId);
  const senderUsername = senderUser?.displayUsername || senderUser?.username || 'You';
  const nowIso = new Date().toISOString();
  const messageId = crypto.randomUUID();

  if (params.messageType === 'attachment') {
    if (!params.sharedItemId) {
      throw new Error('Attachment item ID is required');
    }

    // Verify sender owns the item and that it is currently valid & non-expired
    const sourceItem = await getItemById(params.sharedItemId, params.senderId);
    if (!sourceItem) {
      throw new Error('Vault item not found, expired, or you do not have permission to share it');
    }

    const snapshotTitle =
      sourceItem.file?.sanitizedFilename ||
      sourceItem.file?.originalFilename ||
      sourceItem.title;
    const snapshotSize = sourceItem.file?.fileSize || null;

    await execute(
      `INSERT INTO messages (
        id, conversation_id, sender_id, message_type, text_content,
        shared_item_id, attachment_snapshot_title, attachment_snapshot_type,
        attachment_snapshot_size, attachment_expires_at, created_at
      ) VALUES ($1, $2, $3, 'attachment', $4, $5, $6, $7, $8, $9, $10)`,
      [
        messageId,
        params.conversationId,
        params.senderId,
        params.textContent?.trim() || null,
        sourceItem.id,
        snapshotTitle,
        sourceItem.type,
        snapshotSize,
        sourceItem.expiresAt, // Preserves original item expiration strictly!
        nowIso,
      ]
    );

    // Record sharing authorization without duplicating file storage
    await execute(
      `INSERT INTO item_shares (
        id, item_id, sender_id, recipient_id, conversation_id, message_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        crypto.randomUUID(),
        sourceItem.id,
        params.senderId,
        recipientId,
        params.conversationId,
        messageId,
        nowIso,
      ]
    );

    await execute(
      `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
      [nowIso, params.conversationId]
    );

    return {
      id: messageId,
      conversationId: params.conversationId,
      senderUsername,
      isOwnMessage: true,
      messageType: 'attachment',
      textContent: params.textContent?.trim() || null,
      attachment: {
        itemId: sourceItem.id,
        title: snapshotTitle,
        type: sourceItem.type,
        textContent: sourceItem.textContent,
        url: sourceItem.url,
        filename: sourceItem.file?.sanitizedFilename || sourceItem.file?.originalFilename || null,
        mimeType: sourceItem.file?.mimeType || null,
        fileSize: snapshotSize,
        expiresAt: sourceItem.expiresAt,
        isExpired: false,
        isDeleted: false,
        isAvailable: true,
        downloadUrl: sourceItem.file ? `/api/storage/file/${sourceItem.id}` : null,
      },
      createdAt: nowIso,
    };
  } else {
    const cleanText = (params.textContent || '').trim();
    if (!cleanText) {
      throw new Error('Message text cannot be empty');
    }
    if (cleanText.length > 10000) {
      throw new Error('Message text cannot exceed 10,000 characters');
    }

    await execute(
      `INSERT INTO messages (
        id, conversation_id, sender_id, message_type, text_content, created_at
      ) VALUES ($1, $2, $3, 'text', $4, $5)`,
      [messageId, params.conversationId, params.senderId, cleanText, nowIso]
    );

    await execute(
      `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
      [nowIso, params.conversationId]
    );

    return {
      id: messageId,
      conversationId: params.conversationId,
      senderUsername,
      isOwnMessage: true,
      messageType: 'text',
      textContent: cleanText,
      attachment: null,
      createdAt: nowIso,
    };
  }
}

// ============================================================================
// TAGS REPOSITORY
// ============================================================================

export async function getUserTags(userId: string): Promise<Tag[]> {
  const rows = await query(
    `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    createdAt: r.created_at,
  }));
}

export async function syncItemTags(
  itemId: string,
  userId: string,
  tagNames: string[]
): Promise<void> {
  await execute(`DELETE FROM item_tags WHERE item_id = $1`, [itemId]);

  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;

    let tag = (
      await query(`SELECT id FROM tags WHERE user_id = $1 AND name = $2 LIMIT 1`, [
        userId,
        name,
      ])
    )[0];
    if (!tag) {
      const tagId = crypto.randomUUID();
      await execute(`INSERT INTO tags (id, user_id, name) VALUES ($1, $2, $3)`, [
        tagId,
        userId,
        name,
      ]);
      tag = { id: tagId };
    }

    await execute(`INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)`, [itemId, tag.id]);
  }
}

// ============================================================================
// APP SETTINGS (KEY-VALUE STORE FOR SERVER SECRETS & CLOUD TOKENS)
// ============================================================================

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = $1 LIMIT 1`,
    [key]
  );
  return rows[0]?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);
  const nowIso = new Date().toISOString();
  if (existing !== null) {
    await execute(`UPDATE app_settings SET value = $1, updated_at = $2 WHERE key = $3`, [
      value,
      nowIso,
      key,
    ]);
  } else {
    await execute(`INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, $3)`, [
      key,
      value,
      nowIso,
    ]);
  }
}

export async function deleteSetting(key: string): Promise<void> {
  await execute(`DELETE FROM app_settings WHERE key = $1`, [key]);
}

// ============================================================================
// DATABASE BLOB FALLBACK STORAGE (FOR SERVERLESS WHEN DRIVE OAUTH UNCONNECTED)
// ============================================================================

export async function putDatabaseBlob(params: {
  storageKey: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const b64 = params.buffer.toString('base64');
  await execute(`DELETE FROM storage_blobs WHERE storage_key = $1`, [params.storageKey]);
  await execute(
    `INSERT INTO storage_blobs (storage_key, mime_type, filename, size_bytes, data_base64, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      params.storageKey,
      params.mimeType,
      params.filename,
      params.buffer.length,
      b64,
      nowIso,
    ]
  );
}

export async function getDatabaseBlob(storageKey: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  filename: string;
  sizeBytes: number;
} | null> {
  const rows = await query<any>(
    `SELECT mime_type, filename, size_bytes, data_base64 FROM storage_blobs WHERE storage_key = $1 LIMIT 1`,
    [storageKey]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  const buffer = Buffer.from(r.data_base64, 'base64');
  return {
    buffer,
    mimeType: r.mime_type,
    filename: r.filename,
    sizeBytes: Number(r.size_bytes || buffer.length),
  };
}

export async function deleteDatabaseBlob(storageKey: string): Promise<boolean> {
  await execute(`DELETE FROM storage_blobs WHERE storage_key = $1`, [storageKey]);
  return true;
}

// ============================================================================
// SEND MODE SHARES & ACCESS AUDIT REPOSITORY
// ============================================================================

export function hashSharePassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export function verifySharePasswordHash(password: string, storedHash: string): boolean {
  try {
    const [salt, expectedHash] = storedHash.split(':');
    if (!salt || !expectedHash) return false;
    const computed = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

function mapRowToShare(row: any): ShareLink {
  const nowMs = Date.now();
  const expiresAtMs = new Date(row.expires_at).getTime();
  const isExpired = expiresAtMs <= nowMs;
  const isRevoked = Boolean(row.revoked_at);
  const maxDownloads = row.max_downloads !== null && row.max_downloads !== undefined ? Number(row.max_downloads) : null;
  const downloadCount = Number(row.download_count || 0);
  const isExhausted = maxDownloads !== null && downloadCount >= maxDownloads;

  let itemSummary: ShareLink['item'] = undefined;
  if (row.item_title) {
    itemSummary = {
      id: row.item_id,
      title: row.item_title,
      type: row.item_type,
      fileSize: row.file_size ? Number(row.file_size) : undefined,
      mimeType: row.mime_type || undefined,
      sanitizedFilename: row.sanitized_filename || row.original_filename || undefined,
    };
  }

  return {
    id: row.id,
    userId: row.user_id || null,
    itemId: row.item_id,
    hasPassword: Boolean(row.password_hash),
    maxDownloads,
    downloadCount,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at || null,
    isExpired,
    isRevoked,
    isExhausted,
    createdAt: row.created_at,
    item: itemSummary,
  };
}

export async function createShare(params: {
  id?: string;
  userId?: string | null;
  itemId: string;
  password?: string | null;
  maxDownloads?: number | null;
  expirationDurationSec?: number;
}): Promise<ShareLink> {
  const id = params.id || crypto.randomBytes(6).toString('base64url'); // Short URL slug
  const durationSec = params.expirationDurationSec || 86400;
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + durationSec * 1000).toISOString();
  const passwordHash = params.password?.trim() ? hashSharePassword(params.password.trim()) : null;
  const maxDownloads = params.maxDownloads && params.maxDownloads > 0 ? params.maxDownloads : null;

  await execute(
    `INSERT INTO shares (
      id, user_id, item_id, password_hash, max_downloads, download_count,
      expires_at, revoked_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, 0, $6, NULL, $7, $7)`,
    [
      id,
      params.userId || null,
      params.itemId,
      passwordHash,
      maxDownloads,
      expiresAtIso,
      nowIso,
    ]
  );

  const share = await getShareById(id);
  if (!share) throw new Error('Failed to create share record');
  return share;
}

export async function getShareById(id: string): Promise<ShareLink | null> {
  const rows = await query(
    `SELECT s.*,
            i.title as item_title, i.type as item_type,
            f.file_size, f.mime_type, f.original_filename, f.sanitized_filename
     FROM shares s
     JOIN items i ON s.item_id = i.id
     LEFT JOIN files f ON f.item_id = i.id
     WHERE s.id = $1
     LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return mapRowToShare(rows[0]);
}

export async function getShareByItemId(itemId: string, userId?: string): Promise<ShareLink | null> {
  const conditions = ['s.item_id = $1', 's.revoked_at IS NULL'];
  const values: any[] = [itemId];
  if (userId) {
    conditions.push('s.user_id = $2');
    values.push(userId);
  }

  const rows = await query(
    `SELECT s.*,
            i.title as item_title, i.type as item_type,
            f.file_size, f.mime_type, f.original_filename, f.sanitized_filename
     FROM shares s
     JOIN items i ON s.item_id = i.id
     LEFT JOIN files f ON f.item_id = i.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.created_at DESC
     LIMIT 1`,
    values
  );
  if (!rows[0]) return null;
  return mapRowToShare(rows[0]);
}

export async function listUserShares(userId: string): Promise<ShareLink[]> {
  const rows = await query(
    `SELECT s.*,
            i.title as item_title, i.type as item_type,
            f.file_size, f.mime_type, f.original_filename, f.sanitized_filename
     FROM shares s
     JOIN items i ON s.item_id = i.id
     LEFT JOIN files f ON f.item_id = i.id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT 100`,
    [userId]
  );
  return rows.map(mapRowToShare);
}

export async function verifySharePassword(shareId: string, passwordAttempt: string): Promise<boolean> {
  const rows = await query(`SELECT password_hash FROM shares WHERE id = $1 LIMIT 1`, [shareId]);
  if (!rows[0] || !rows[0].password_hash) return true; // not password protected
  return verifySharePasswordHash(passwordAttempt, rows[0].password_hash);
}

export async function recordShareAccess(params: {
  shareId: string;
  action?: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  let ipMasked: string | null = null;
  if (params.ip) {
    const parts = params.ip.split('.');
    if (parts.length === 4) {
      ipMasked = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    } else {
      ipMasked = 'masked-ip';
    }
  }

  const cleanUa = params.userAgent ? params.userAgent.slice(0, 255) : null;
  const nowIso = new Date().toISOString();

  await execute(
    `INSERT INTO share_access_logs (id, share_id, action, ip_masked, user_agent, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [crypto.randomUUID(), params.shareId, params.action || 'download', ipMasked, cleanUa, nowIso]
  );
}

export async function incrementShareDownload(shareId: string): Promise<{
  allowed: boolean;
  remainingDownloads?: number | null;
  error?: string;
}> {
  const share = await getShareById(shareId);
  if (!share) {
    return { allowed: false, error: 'Share link not found' };
  }
  if (share.isRevoked) {
    return { allowed: false, error: 'This share link has been revoked by the sender' };
  }
  if (share.isExpired) {
    return { allowed: false, error: 'This share link has expired' };
  }
  if (share.isExhausted) {
    return { allowed: false, error: 'Download limit has been reached for this file' };
  }

  const nowIso = new Date().toISOString();
  await execute(
    `UPDATE shares SET download_count = download_count + 1, updated_at = $1 WHERE id = $2`,
    [nowIso, shareId]
  );

  const updated = await getShareById(shareId);
  const remaining = updated?.maxDownloads ? Math.max(0, updated.maxDownloads - updated.downloadCount) : null;
  return { allowed: true, remainingDownloads: remaining };
}

export async function revokeShare(shareId: string, userId?: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  if (userId) {
    await execute(
      `UPDATE shares SET revoked_at = $1, updated_at = $1 WHERE id = $2 AND user_id = $3`,
      [nowIso, shareId, userId]
    );
  } else {
    await execute(
      `UPDATE shares SET revoked_at = $1, updated_at = $1 WHERE id = $2`,
      [nowIso, shareId]
    );
  }
  return true;
}

export async function getShareAccessLogs(shareId: string, userId?: string): Promise<ShareAccessLog[]> {
  if (userId) {
    const share = await getShareById(shareId);
    if (!share || share.userId !== userId) {
      throw new Error('Unauthorized to view access logs');
    }
  }

  const rows = await query(
    `SELECT id, share_id, action, ip_masked, user_agent, created_at
     FROM share_access_logs
     WHERE share_id = $1
     ORDER BY created_at DESC
     LIMIT 200`,
    [shareId]
  );

  return rows.map((r) => ({
    id: r.id,
    shareId: r.share_id,
    action: r.action,
    ipMasked: r.ip_masked,
    userAgent: r.user_agent,
    createdAt: r.created_at,
  }));
}

// ============================================================================
// TRUST & SAFETY: ABUSE REPORTS
// ============================================================================

export async function createReport(params: {
  id?: string;
  targetType: 'share' | 'file' | 'user';
  targetId: string;
  reason: 'copyright' | 'malware' | 'illegal' | 'harassment' | 'other';
  details?: string | null;
  reporterEmail?: string | null;
  reporterIp?: string | null;
}): Promise<AbuseReport> {
  const id = params.id || crypto.randomUUID();
  const nowIso = new Date().toISOString();

  let ipMasked: string | null = null;
  if (params.reporterIp) {
    const parts = params.reporterIp.split('.');
    if (parts.length === 4) {
      ipMasked = `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    } else {
      ipMasked = 'masked-ip';
    }
  }

  await execute(
    `INSERT INTO reports (
      id, target_type, target_id, reason, details, reporter_email,
      reporter_ip_masked, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $8)`,
    [
      id,
      params.targetType,
      params.targetId.trim(),
      params.reason,
      params.details?.trim() || null,
      params.reporterEmail?.trim() || null,
      ipMasked,
      nowIso,
    ]
  );

  const report = await getReportById(id);
  if (!report) throw new Error('Failed to create report');
  return report;
}

export async function getReportById(id: string): Promise<AbuseReport | null> {
  const rows = await query(`SELECT * FROM reports WHERE id = $1 LIMIT 1`, [id]);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    details: r.details || null,
    reporterEmail: r.reporter_email || null,
    reporterIpMasked: r.reporter_ip_masked || null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listReports(options?: {
  status?: string;
  limit?: number;
}): Promise<AbuseReport[]> {
  const limit = options?.limit || 100;
  let sql = `SELECT * FROM reports`;
  const params: any[] = [];

  if (options?.status) {
    sql += ` WHERE status = $1`;
    params.push(options.status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const rows = await query(sql, params);
  return rows.map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    details: r.details || null,
    reporterEmail: r.reporter_email || null,
    reporterIpMasked: r.reporter_ip_masked || null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateReportStatus(
  id: string,
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
): Promise<boolean> {
  const nowIso = new Date().toISOString();
  await execute(`UPDATE reports SET status = $1, updated_at = $2 WHERE id = $3`, [
    status,
    nowIso,
    id,
  ]);
  return true;
}
