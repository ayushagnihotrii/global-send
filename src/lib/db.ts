import { Pool } from 'pg';
import { createClient, Client as LibsqlClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Item, FileMetadata, User, Tag, StorageUsage } from './types';
import { getStorageConfig } from './env-config';

// Global cache for connection pooling across hot-reloads and serverless invocations
declare global {
  var __quickvault_pg_pool: Pool | undefined;
  var __quickvault_sqlite_client: LibsqlClient | undefined;
}

let initialized = false;

export function isPostgres(): boolean {
  const config = getStorageConfig();
  return config.database.driver === 'postgres';
}

function getDatabase() {
  const config = getStorageConfig();

  if (config.database.driver === 'postgres') {
    if (!globalThis.__quickvault_pg_pool) {
      globalThis.__quickvault_pg_pool = new Pool({
        connectionString: config.database.connectionString,
        ssl: config.database.ssl,
        max: process.env.DATABASE_MAX_CONNECTIONS ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Avoid unhandled pool errors crashing the process
      globalThis.__quickvault_pg_pool.on('error', (err) => {
        console.error('[QuickVault Database Pool Error]:', err.message);
      });
    }
    return { type: 'postgres' as const, client: globalThis.__quickvault_pg_pool };
  } else {
    if (!globalThis.__quickvault_sqlite_client) {
      const dataDir = path.join(process.cwd(), '.data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, 'quickvault.db');
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
        password_hash TEXT NOT NULL,
        recovery_code_hash TEXT,
        storage_limit_bytes INTEGER DEFAULT 2147483648,
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
        deleted_at TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        storage_key TEXT UNIQUE NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER DEFAULT 0,
        upload_status TEXT DEFAULT 'completed',
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
    `);
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
    // Transform $1, $2 -> ?1, ?2 for SQLite numbered positional parameters
    const sqliteSql = sql.replace(/\$(\d+)/g, '?$1');
    const res = await db.client.execute({ sql: sqliteSql, args: params });
    // Transform rows to plain objects
    return res.rows.map(row => {
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

// USER REPOSITORY
export async function getUserByUsername(username: string): Promise<any | null> {
  const normalized = username.trim().toLowerCase();
  const rows = await query(
    `SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1`,
    [normalized]
  );
  return rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const rows = await query(
    `SELECT id, username, storage_limit_bytes, created_at FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    username: rows[0].username,
    storageLimitBytes: Number(rows[0].storage_limit_bytes),
    createdAt: rows[0].created_at,
  };
}

export async function createUser(id: string, username: string, passwordHash: string, recoveryCodeHash: string): Promise<User> {
  const normalized = username.trim().toLowerCase();
  await execute(
    `INSERT INTO users (id, username, password_hash, recovery_code_hash) VALUES ($1, $2, $3, $4)`,
    [id, normalized, passwordHash, recoveryCodeHash]
  );
  return {
    id,
    username: normalized,
    storageLimitBytes: 2147483648,
    createdAt: new Date().toISOString(),
  };
}

export async function updateUserPassword(userId: string, newPasswordHash: string): Promise<void> {
  await execute(
    `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [newPasswordHash, userId]
  );
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await execute(`DELETE FROM users WHERE id = $1`, [userId]);
}

export async function getUserCount(): Promise<number> {
  const rows = await query<any>(`SELECT COUNT(*) as count FROM users`);
  return Number(rows[0]?.count || 0);
}

// ITEMS REPOSITORY
export async function createItem(item: {
  id: string;
  userId: string;
  type: string;
  title: string;
  textContent?: string | null;
  url?: string | null;
  note?: string | null;
  isFavourite?: boolean;
}): Promise<void> {
  await execute(
    `INSERT INTO items (id, user_id, type, title, text_content, url, note, is_favourite, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      item.id,
      item.userId,
      item.type,
      item.title,
      item.textContent || null,
      item.url || null,
      item.note || null,
      item.isFavourite ? (isPostgres() ? true : 1) : (isPostgres() ? false : 0),
    ]
  );
}

export async function getItemById(id: string, userId: string): Promise<Item | null> {
  const rows = await query(
    `SELECT i.*, 
            f.id as file_id, f.storage_key, f.original_filename, f.mime_type, f.file_size, f.upload_status
     FROM items i
     LEFT JOIN files f ON f.item_id = i.id
     WHERE i.id = $1 AND i.user_id = $2
     LIMIT 1`,
    [id, userId]
  );

  if (!rows[0]) return null;
  const row = rows[0];

  // Fetch tags
  const tagRows = await query(
    `SELECT t.name FROM tags t
     JOIN item_tags it ON it.tag_id = t.id
     WHERE it.item_id = $1`,
    [id]
  );

  let file: FileMetadata | null = null;
  if (row.file_id) {
    file = {
      id: row.file_id,
      itemId: row.id,
      userId: row.user_id,
      storageKey: row.storage_key,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      fileSize: Number(row.file_size || 0),
      uploadStatus: row.upload_status,
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
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: tagRows.map(t => t.name),
    file,
  };
}

export async function getItems(params: {
  userId: string;
  type?: string;
  isFavourite?: boolean;
  inTrash?: boolean;
  tag?: string;
  search?: string;
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
           f.id as file_id, f.storage_key, f.original_filename, f.mime_type, f.file_size, f.upload_status
    FROM items i
    LEFT JOIN files f ON f.item_id = i.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ${limitVal} OFFSET ${offsetVal}
  `;

  const rows = await query(sql, values);
  if (!rows.length) return [];

  // Batch load tags
  const itemIds = rows.map(r => r.id);
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

  return rows.map(row => {
    let file: FileMetadata | null = null;
    if (row.file_id) {
      file = {
        id: row.file_id,
        itemId: row.id,
        userId: row.user_id,
        storageKey: row.storage_key,
        originalFilename: row.original_filename,
        mimeType: row.mime_type,
        fileSize: Number(row.file_size || 0),
        uploadStatus: row.upload_status,
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
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: tagMap.get(row.id) || [],
      file,
    };
  });
}

export async function updateItem(id: string, userId: string, data: {
  title?: string;
  textContent?: string;
  url?: string;
  note?: string;
  isFavourite?: boolean;
}): Promise<void> {
  const fields: string[] = ['updated_at = CURRENT_TIMESTAMP'];
  const values: any[] = [];
  let pIdx = 1;

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
    values.push(data.isFavourite ? (isPostgres() ? true : 1) : (isPostgres() ? false : 0));
  }

  values.push(id, userId);
  const sql = `UPDATE items SET ${fields.join(', ')} WHERE id = $${pIdx++} AND user_id = $${pIdx}`;
  await execute(sql, values);
}

export async function softDeleteItem(id: string, userId: string): Promise<void> {
  await execute(
    `UPDATE items SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function restoreItem(id: string, userId: string): Promise<void> {
  await execute(
    `UPDATE items SET deleted_at = NULL WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
}

export async function permanentDeleteItem(id: string, userId: string): Promise<string | null> {
  // Check if there is an associated file storage key
  const fileRows = await query(
    `SELECT storage_key FROM files WHERE item_id = $1 AND user_id = $2`,
    [id, userId]
  );
  const storageKey = fileRows[0]?.storage_key || null;

  await execute(`DELETE FROM items WHERE id = $1 AND user_id = $2`, [id, userId]);
  return storageKey;
}

export async function emptyTrash(userId: string): Promise<string[]> {
  const fileRows = await query(
    `SELECT f.storage_key FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE i.user_id = $1 AND i.deleted_at IS NOT NULL`,
    [userId]
  );
  const keys = fileRows.map(r => r.storage_key).filter(Boolean);

  await execute(
    `DELETE FROM items WHERE user_id = $1 AND deleted_at IS NOT NULL`,
    [userId]
  );
  return keys;
}

export async function toggleItemFavourite(id: string, userId: string): Promise<boolean> {
  const item = await getItemById(id, userId);
  if (!item) throw new Error('Item not found');
  const nextFav = !item.isFavourite;
  await execute(
    `UPDATE items SET is_favourite = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
    [nextFav ? (isPostgres() ? true : 1) : (isPostgres() ? false : 0), id, userId]
  );
  return nextFav;
}

// FILE RECORD REPOSITORY
export async function createFileRecord(file: {
  id: string;
  itemId: string;
  userId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  uploadStatus?: 'pending' | 'completed' | 'failed';
}): Promise<void> {
  await execute(
    `INSERT INTO files (id, item_id, user_id, storage_key, original_filename, mime_type, file_size, upload_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      file.id,
      file.itemId,
      file.userId,
      file.storageKey,
      file.originalFilename,
      file.mimeType,
      file.fileSize,
      file.uploadStatus || 'completed',
    ]
  );
}

export async function updateFileStatus(storageKey: string, status: 'pending' | 'completed' | 'failed'): Promise<void> {
  await execute(
    `UPDATE files SET upload_status = $1 WHERE storage_key = $2`,
    [status, storageKey]
  );
}

// STORAGE USAGE
export async function getUserStorageUsage(userId: string): Promise<StorageUsage> {
  const user = await getUserById(userId);
  const limitBytes = user?.storageLimitBytes || 2147483648;

  const fileRows = await query(
    `SELECT COALESCE(SUM(f.file_size), 0) as total_bytes, COUNT(f.id) as file_count
     FROM files f
     JOIN items i ON f.item_id = i.id
     WHERE f.user_id = $1 AND i.deleted_at IS NULL AND f.upload_status = 'completed'`,
    [userId]
  );

  const breakdownRows = await query(
    `SELECT i.type, COUNT(i.id) as count
     FROM items i
     WHERE i.user_id = $1 AND i.deleted_at IS NULL
     GROUP BY i.type`,
    [userId]
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

  return {
    usedBytes: Number(fileRows[0]?.total_bytes || 0),
    limitBytes,
    itemCount,
    fileCount: Number(fileRows[0]?.file_count || 0),
    breakdown,
  };
}

// TAGS REPOSITORY
export async function getUserTags(userId: string): Promise<Tag[]> {
  const rows = await query(
    `SELECT id, user_id, name, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC`,
    [userId]
  );
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    createdAt: r.created_at,
  }));
}

export async function syncItemTags(itemId: string, userId: string, tagNames: string[]): Promise<void> {
  // Clear existing tags
  await execute(`DELETE FROM item_tags WHERE item_id = $1`, [itemId]);

  for (const rawName of tagNames) {
    const name = rawName.trim();
    if (!name) continue;

    // Check or insert tag
    let tag = (await query(`SELECT id FROM tags WHERE user_id = $1 AND name = $2 LIMIT 1`, [userId, name]))[0];
    if (!tag) {
      const tagId = crypto.randomUUID();
      await execute(`INSERT INTO tags (id, user_id, name) VALUES ($1, $2, $3)`, [tagId, userId, name]);
      tag = { id: tagId };
    }

    await execute(`INSERT INTO item_tags (item_id, tag_id) VALUES ($1, $2)`, [itemId, tag.id]);
  }
}

// APP SETTINGS (KEY-VALUE STORE FOR SERVER SECRETS & CLOUD TOKENS)
export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ value: string }>(`SELECT value FROM app_settings WHERE key = $1 LIMIT 1`, [key]);
  return rows[0]?.value || null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);
  if (existing !== null) {
    await execute(
      `UPDATE app_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2`,
      [value, key]
    );
  } else {
    await execute(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2)`,
      [key, value]
    );
  }
}

export async function deleteSetting(key: string): Promise<void> {
  await execute(`DELETE FROM app_settings WHERE key = $1`, [key]);
}

