/**
 * Automated test suite for QuickVault environment & storage configuration.
 * Validates Phase 1 requirements:
 * 1. Development allows SQLite & local storage fallback.
 * 2. Production strictly disallows silent fallback.
 * 3. Incomplete production config fails clearly and actionably.
 * 4. All required variables are checked.
 * 5. Errors never leak secrets.
 * 6. Valid configurations pass cleanly without contacting remote networks.
 */

import { validateStorageConfig, ConfigurationError } from './src/lib/env-config.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== QUICKVAULT STORAGE CONFIGURATION TEST SUITE ===\n');

// TEST 1: Development mode without any cloud credentials
console.log('Test 1: Development mode (zero cloud credentials)');
{
  const devEnv = { NODE_ENV: 'development' };
  const config = validateStorageConfig(devEnv);
  assert(config.isProduction === false, 'isProduction is false');
  assert(config.database.driver === 'sqlite', 'database falls back to SQLite in development');
  assert(config.storage.driver === 'local', 'storage falls back to local disk in development');
}

// TEST 2: Production mode with completely empty environment
console.log('\nTest 2: Production mode with missing DATABASE_URL');
{
  const prodEnv = { NODE_ENV: 'production' };
  let errorCaught = false;
  try {
    validateStorageConfig(prodEnv);
  } catch (err) {
    errorCaught = true;
    assert(err instanceof ConfigurationError, 'throws ConfigurationError');
    assert(err.missingVariables.includes('DATABASE_URL'), 'identifies DATABASE_URL as missing');
    assert(err.message.includes('Silent fallback to local SQLite is strictly disallowed') || err.message.includes('silent fallback'), 'actionable error message produced');
  }
  assert(errorCaught, 'production fails fast when DATABASE_URL is missing');
}

// TEST 3: Production mode with non-postgres DATABASE_URL
console.log('\nTest 3: Production mode with invalid connection protocol');
{
  const invalidEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'mysql://root:secret@localhost:3306/db',
  };
  let errorCaught = false;
  try {
    validateStorageConfig(invalidEnv);
  } catch (err) {
    errorCaught = true;
    assert(err instanceof ConfigurationError, 'throws ConfigurationError on invalid URI');
    assert(err.message.includes('postgres://'), 'advises proper postgres:// protocol');
    assert(!err.message.includes('secret'), 'does NOT leak secret password in error');
  }
  assert(errorCaught, 'rejects non-postgres connection URI');
}

// TEST 4A: Production mode with DATABASE_URL but missing Google Drive credentials (default provider)
console.log('\nTest 4A: Production mode with PostgreSQL but missing Google Drive credentials');
{
  const prodMissingDrive = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://postgres:mysecretpass@db.ref.supabase.co:5432/postgres',
    STORAGE_PROVIDER: 'google_drive',
  };
  let errorCaught = false;
  try {
    validateStorageConfig(prodMissingDrive);
  } catch (err) {
    errorCaught = true;
    assert(err instanceof ConfigurationError, 'throws ConfigurationError on missing Google Drive credentials');
    assert(err.missingVariables.includes('GDRIVE_CLIENT_ID'), 'reports missing GDRIVE_CLIENT_ID');
    assert(err.missingVariables.includes('GDRIVE_CLIENT_SECRET'), 'reports missing GDRIVE_CLIENT_SECRET');
    assert(!err.message.includes('mysecretpass'), 'does NOT leak DATABASE_URL password in error');
    assert(err.message.includes('Google Drive credentials missing'), 'actionable error for Google Drive');
  }
  assert(errorCaught, 'fails fast when Google Drive credentials are missing in production');
}

// TEST 4B: Production mode with DATABASE_URL but missing R2 credentials
console.log('\nTest 4B: Production mode with PostgreSQL but missing R2 credentials');
{
  const prodMissingR2 = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://postgres:mysecretpass@db.ref.supabase.co:5432/postgres',
    STORAGE_PROVIDER: 'r2',
  };
  let errorCaught = false;
  try {
    validateStorageConfig(prodMissingR2);
  } catch (err) {
    errorCaught = true;
    assert(err instanceof ConfigurationError, 'throws ConfigurationError on missing R2');
    assert(err.missingVariables.includes('R2_ACCOUNT_ID'), 'reports missing R2_ACCOUNT_ID');
    assert(err.missingVariables.includes('R2_ACCESS_KEY_ID'), 'reports missing R2_ACCESS_KEY_ID');
    assert(err.missingVariables.includes('R2_SECRET_ACCESS_KEY'), 'reports missing R2_SECRET_ACCESS_KEY');
    assert(!err.message.includes('mysecretpass'), 'does NOT leak DATABASE_URL password in error');
    assert(err.message.includes('Silent fallback to local filesystem storage is strictly disallowed'), 'disallows silent local fallback');
  }
  assert(errorCaught, 'fails fast when R2 credentials are missing');
}

// TEST 5: Production mode with partial R2 credentials (e.g. missing SECRET)
console.log('\nTest 5: Production mode with partial R2 credentials');
{
  const prodPartialR2 = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres:pass@db.ref.supabase.co:6543/postgres',
    STORAGE_PROVIDER: 'r2',
    R2_ACCOUNT_ID: 'fake-account-id',
    R2_ACCESS_KEY_ID: 'fake-access-key',
  };
  let errorCaught = false;
  try {
    validateStorageConfig(prodPartialR2);
  } catch (err) {
    errorCaught = true;
    assert(err.missingVariables.includes('R2_SECRET_ACCESS_KEY'), 'correctly pinpoints missing R2_SECRET_ACCESS_KEY');
    assert(!err.missingVariables.includes('R2_ACCOUNT_ID'), 'does not flag provided R2_ACCOUNT_ID');
  }
  assert(errorCaught, 'fails fast when partial R2 credentials provided');
}

// TEST 6A: Valid Google Drive production configuration
console.log('\nTest 6A: Valid Google Drive production configuration');
{
  const validDriveEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres:safe_pass@db.example.supabase.co:6543/postgres',
    STORAGE_PROVIDER: 'google_drive',
    GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'GOCSPX-secret123',
  };
  const config = validateStorageConfig(validDriveEnv);
  assert(config.isProduction === true, 'isProduction is true');
  assert(config.database.driver === 'postgres', 'database driver is postgres');
  assert(config.storage.driver === 'google_drive', 'storage driver is google_drive');
}

// TEST 6B: Valid R2 production configuration
console.log('\nTest 6B: Valid R2 production configuration');
{
  const validProdEnv = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres:safe_pass@db.example.supabase.co:6543/postgres',
    STORAGE_PROVIDER: 'r2',
    R2_ACCOUNT_ID: 'acc1234567890abcdef',
    R2_ACCESS_KEY_ID: 'key1234567890',
    R2_SECRET_ACCESS_KEY: 'secret1234567890abcdef',
    R2_BUCKET_NAME: 'prod-vault',
  };
  const config = validateStorageConfig(validProdEnv);
  assert(config.isProduction === true, 'isProduction is true');
  assert(config.database.driver === 'postgres', 'database driver is postgres');
  assert(config.storage.driver === 'r2', 'storage driver is r2');
  assert(config.storage.r2.bucketName === 'prod-vault', 'bucket name set accurately');
}

// TEST 7: Development mode with PostgreSQL enabled
console.log('\nTest 7: Development mode with optional PostgreSQL');
{
  const devWithPg = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:pass@localhost:5432/quickvault_dev',
  };
  const config = validateStorageConfig(devWithPg);
  assert(config.isProduction === false, 'isProduction is false');
  assert(config.database.driver === 'postgres', 'database driver is postgres when provided in dev');
  assert(config.storage.driver === 'local', 'storage defaults to local disk in dev if R2 absent');
}

console.log(`\n========================================`);
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
