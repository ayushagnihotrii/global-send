/**
 * QuickVault Environment & Storage Configuration Validator
 * Enforces strict production safeguards to prevent silent fallback to ephemeral local storage.
 */

export interface DatabaseConfig {
  driver: 'postgres' | 'sqlite';
  connectionString?: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

export interface StorageConfig {
  driver: 'google_drive' | 'r2' | 'local';
  googleDrive?: {
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
  };
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
  };
  localDir?: string;
}

export interface AppStorageConfig {
  isProduction: boolean;
  database: DatabaseConfig;
  storage: StorageConfig;
}

export class ConfigurationError extends Error {
  public readonly missingVariables: string[];

  constructor(message: string, missingVariables: string[] = []) {
    super(message);
    this.name = 'ConfigurationError';
    this.missingVariables = missingVariables;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Validates environment variables for database and storage adapters.
 * Guarantees that production deployments fail fast and loudly if cloud credentials are absent.
 * Supports Google Drive (primary), Cloudflare R2 (alternative), and local disk (dev only).
 * NEVER prints secret values into logs or exception messages.
 */
function cleanEnvValue(val?: string): string | undefined {
  if (!val) return undefined;
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim() || undefined;
}

export function validateStorageConfig(env: NodeJS.ProcessEnv = process.env): AppStorageConfig {
  const isProduction = env.NODE_ENV === 'production';

  // 1. DATABASE CONFIGURATION VALIDATION
  const rawDbUrl = cleanEnvValue(env.DATABASE_URL);
  let dbConfig: DatabaseConfig;

  if (isProduction) {
    if (!rawDbUrl) {
      throw new ConfigurationError(
        'Production deployment aborted: DATABASE_URL is not set. Global Send requires a PostgreSQL database (e.g. Supabase) in production. Silent fallback to local SQLite is strictly disallowed.',
        ['DATABASE_URL']
      );
    }

    if (!rawDbUrl.startsWith('postgres://') && !rawDbUrl.startsWith('postgresql://')) {
      throw new ConfigurationError(
        'Production deployment aborted: DATABASE_URL must be a valid PostgreSQL connection URI starting with postgres:// or postgresql://.',
        ['DATABASE_URL']
      );
    }

    const sslConfig = env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };

    dbConfig = {
      driver: 'postgres',
      connectionString: rawDbUrl,
      ssl: sslConfig,
    };
  } else {
    // Development or Test mode
    if (rawDbUrl && (rawDbUrl.startsWith('postgres://') || rawDbUrl.startsWith('postgresql://'))) {
      const sslConfig = env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false };
      dbConfig = {
        driver: 'postgres',
        connectionString: rawDbUrl,
        ssl: sslConfig,
      };
    } else {
      dbConfig = {
        driver: 'sqlite',
        ssl: false,
      };
    }
  }

  // 2. PLUGGABLE STORAGE PROVIDER VALIDATION
  const requestedProvider = cleanEnvValue(env.STORAGE_PROVIDER)?.toLowerCase();
  const gdriveClientId = cleanEnvValue(env.GDRIVE_CLIENT_ID || env.GOOGLE_CLIENT_ID);
  const gdriveClientSecret = cleanEnvValue(env.GDRIVE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET);

  const r2AccountId = cleanEnvValue(env.R2_ACCOUNT_ID);
  const r2AccessKeyId = cleanEnvValue(env.R2_ACCESS_KEY_ID);
  const r2SecretAccessKey = cleanEnvValue(env.R2_SECRET_ACCESS_KEY);
  const r2BucketName = cleanEnvValue(env.R2_BUCKET_NAME) || 'globalsend';

  let storageConfig: StorageConfig;

  // Determine target provider
  let targetProvider: 'google_drive' | 'r2' | 'local' = 'local';
  if (requestedProvider === 'google_drive' || requestedProvider === 'gdrive') {
    targetProvider = 'google_drive';
  } else if (requestedProvider === 'r2') {
    targetProvider = 'r2';
  } else if (requestedProvider === 'local') {
    targetProvider = 'local';
  } else {
    // Auto-detect based on provided credentials
    if (gdriveClientId && gdriveClientSecret) {
      targetProvider = 'google_drive';
    } else if (r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      targetProvider = 'r2';
    } else {
      targetProvider = isProduction ? 'google_drive' : 'local';
    }
  }

  if (isProduction) {
    if (targetProvider === 'local') {
      throw new ConfigurationError(
        'Production deployment aborted: Local filesystem storage cannot be used in production. Please configure Google Drive (GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET) or Cloudflare R2.',
        ['GDRIVE_CLIENT_ID', 'GDRIVE_CLIENT_SECRET']
      );
    }

    if (targetProvider === 'google_drive') {
      const missingDriveVars: string[] = [];
      if (!gdriveClientId) missingDriveVars.push('GDRIVE_CLIENT_ID');
      if (!gdriveClientSecret) missingDriveVars.push('GDRIVE_CLIENT_SECRET');

      if (missingDriveVars.length > 0) {
        throw new ConfigurationError(
          `Production deployment aborted: Google Drive credentials missing (${missingDriveVars.join(', ')}). Global Send requires cloud storage in production. Silent fallback to local storage is strictly disallowed.`,
          missingDriveVars
        );
      }

      storageConfig = {
        driver: 'google_drive',
        googleDrive: {
          clientId: gdriveClientId!,
          clientSecret: gdriveClientSecret!,
          redirectUri: env.GDRIVE_REDIRECT_URI?.trim(),
        },
      };
    } else {
      // targetProvider === 'r2'
      const missingR2Vars: string[] = [];
      if (!r2AccountId) missingR2Vars.push('R2_ACCOUNT_ID');
      if (!r2AccessKeyId) missingR2Vars.push('R2_ACCESS_KEY_ID');
      if (!r2SecretAccessKey) missingR2Vars.push('R2_SECRET_ACCESS_KEY');

      if (missingR2Vars.length > 0) {
        throw new ConfigurationError(
          `Production deployment aborted: Cloudflare R2 credentials missing (${missingR2Vars.join(', ')}). Global Send requires cloud object storage in production. Silent fallback to local filesystem storage is strictly disallowed.`,
          missingR2Vars
        );
      }

      storageConfig = {
        driver: 'r2',
        r2: {
          accountId: r2AccountId!,
          accessKeyId: r2AccessKeyId!,
          secretAccessKey: r2SecretAccessKey!,
          bucketName: r2BucketName,
        },
      };
    }
  } else {
    // Development or Test mode
    if (targetProvider === 'google_drive' && gdriveClientId && gdriveClientSecret) {
      storageConfig = {
        driver: 'google_drive',
        googleDrive: {
          clientId: gdriveClientId,
          clientSecret: gdriveClientSecret,
          redirectUri: env.GDRIVE_REDIRECT_URI?.trim(),
        },
      };
    } else if (targetProvider === 'r2' && r2AccountId && r2AccessKeyId && r2SecretAccessKey) {
      storageConfig = {
        driver: 'r2',
        r2: {
          accountId: r2AccountId,
          accessKeyId: r2AccessKeyId,
          secretAccessKey: r2SecretAccessKey,
          bucketName: r2BucketName,
        },
      };
    } else {
      storageConfig = {
        driver: 'local',
        localDir: '.data/uploads',
      };
    }
  }

  return {
    isProduction,
    database: dbConfig,
    storage: storageConfig,
  };
}

/**
 * Returns current configuration or throws immediately if production requirements are violated.
 */
let cachedConfig: AppStorageConfig | null = null;

export function getStorageConfig(): AppStorageConfig {
  if (!cachedConfig || process.env.NODE_ENV === 'test') {
    cachedConfig = validateStorageConfig(process.env);
  }
  return cachedConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}
