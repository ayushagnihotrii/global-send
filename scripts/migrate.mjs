/**
 * QuickVault Database Migration Runner
 * Supports PostgreSQL (Supabase) and local SQLite.
 * 
 * Usage:
 *   node scripts/migrate.mjs           # Apply all pending migrations
 *   node scripts/migrate.mjs --status  # Check migration status
 *   node scripts/migrate.mjs --local   # Explicitly target local SQLite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local if present
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^['"](.*)['"]$/, '$1');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const args = process.argv.slice(2);
const isStatusCheck = args.includes('--status');
const forceLocal = args.includes('--local');

const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error(`Migrations directory not found: ${migrationsDir}`);
  process.exit(1);
}

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

async function runPostgresMigrations(dbUrl) {
  const { Client } = pg;
  const client = new Client({
    connectionString: dbUrl,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[PostgreSQL] Connected successfully to database');

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get applied migrations
    const res = await client.query(`SELECT name, applied_at FROM _migrations ORDER BY id ASC`);
    const appliedMap = new Map(res.rows.map(r => [r.name, r.applied_at]));

    if (isStatusCheck) {
      console.log('\n--- PostgreSQL Migration Status ---');
      for (const file of migrationFiles) {
        const appliedAt = appliedMap.get(file);
        if (appliedAt) {
          console.log(`  [APPLIED]  ${file} (${new Date(appliedAt).toISOString()})`);
        } else {
          console.log(`  [PENDING]  ${file}`);
        }
      }
      console.log('-----------------------------------\n');
      return;
    }

    let appliedCount = 0;
    for (const file of migrationFiles) {
      if (appliedMap.has(file)) {
        console.log(`  [SKIP] ${file} (already applied)`);
        continue;
      }

      console.log(`  [APPLYING] ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO _migrations (name) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        console.log(`  [SUCCESS] ${file} applied successfully.`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [FAILED] ${file} failed:`, err.message);
        throw err;
      }
    }

    console.log(`\nMigration run completed: ${appliedCount} migration(s) applied.\n`);
  } finally {
    await client.end();
  }
}

async function runSqliteMigrations() {
  const dataDir = path.join(rootDir, '.data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'quickvault.db');
  const client = createClient({ url: `file:${dbPath}` });

  console.log(`[SQLite] Connected to local database at ${dbPath}`);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const res = await client.execute(`SELECT name, applied_at FROM _migrations ORDER BY id ASC`);
  const appliedMap = new Map(res.rows.map(r => [r[0], r[1]]));

  if (isStatusCheck) {
    console.log('\n--- SQLite Migration Status ---');
    for (const file of migrationFiles) {
      const appliedAt = appliedMap.get(file);
      if (appliedAt) {
        console.log(`  [APPLIED]  ${file} (${appliedAt})`);
      } else {
        console.log(`  [PENDING]  ${file}`);
      }
    }
    console.log('-------------------------------\n');
    return;
  }

  // SQLite migrations
  console.log('\nNote: Primary PostgreSQL migrations are in supabase/migrations.');
  console.log('Local SQLite baseline schema is also managed by initDb().');
  console.log(`Local SQLite is tracking ${appliedMap.size} migration(s).\n`);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (dbUrl && !forceLocal) {
    await runPostgresMigrations(dbUrl);
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Cannot run migrations without DATABASE_URL in production.');
      process.exit(1);
    }
    await runSqliteMigrations();
  }
}

main().catch(err => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
