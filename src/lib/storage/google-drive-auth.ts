/**
 * Global Send: Google Drive Server-Side OAuth & Token Manager
 * Manages OAuth2 tokens, signed CSRF state parameters, automatic refresh, and folder initialization.
 * Keeps all client secrets and refresh tokens strictly server-side.
 */

import crypto from 'crypto';
import { getSetting, setSetting, deleteSetting } from '@/lib/db';
import { encryptToken, decryptToken } from '@/lib/crypto';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';

// Narrowest scope: Only access files and folders created or opened by Global Send
export const GDRIVE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp ms
}

let memoryTokenCache: GoogleTokens | null = null;

function cleanEnvValue(val?: string): string | undefined {
  if (!val) return undefined;
  return val.trim().replace(/^['"]+|['"]+$/g, '').trim() || undefined;
}

function getOAuthStateSecret(): string {
  return (
    cleanEnvValue(process.env.TOKEN_ENCRYPTION_KEY) ||
    cleanEnvValue(process.env.JWT_SECRET) ||
    'globalsend_default_dev_secret_32bytes!!'
  );
}

/**
 * Creates an HMAC-SHA-256 signed OAuth state token bound to the admin userId and a 15-minute expiry.
 */
export function createOAuthStateToken(adminUserId: string): string {
  const expiresAt = Date.now() + 15 * 60 * 1000;
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${adminUserId}.${expiresAt}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', getOAuthStateSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

/**
 * Verifies an HMAC-SHA-256 signed OAuth state token and confirms it belongs to the active admin user.
 */
export function verifyOAuthStateToken(
  stateToken: string | null | undefined,
  expectedUserId: string
): boolean {
  if (!stateToken || !expectedUserId) return false;
  const parts = stateToken.split('.');
  if (parts.length !== 4) return false;

  const [userId, expiresAtStr, nonce, providedSig] = parts;
  if (userId !== expectedUserId) return false;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return false;
  }

  const payload = `${userId}.${expiresAtStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac('sha256', getOAuthStateSecret())
    .update(payload)
    .digest('hex');

  try {
    const a = Buffer.from(providedSig, 'utf8');
    const b = Buffer.from(expectedSig, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function getGoogleOAuthConfig(requestOrigin?: string) {
  const clientId = cleanEnvValue(
    process.env.GDRIVE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  );
  const clientSecret = cleanEnvValue(
    process.env.GDRIVE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  );

  const explicitRedirectUri = cleanEnvValue(process.env.GDRIVE_REDIRECT_URI);
  const appBaseUrl =
    cleanEnvValue(process.env.NEXT_PUBLIC_APP_URL)?.replace(/\/+$/, '') ||
    (requestOrigin ? requestOrigin.replace(/\/+$/, '') : undefined) ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : undefined) ||
    'http://localhost:3000';

  const redirectUri = explicitRedirectUri || `${appBaseUrl}/api/admin/gdrive/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: Boolean(clientId && clientSecret),
  };
}

/**
 * Generates the Google OAuth authorization URL for the administrator to connect Drive.
 */
export function generateGoogleAuthUrl(
  adminUserId: string,
  requestOrigin?: string
): string {
  const { clientId, redirectUri, isConfigured } = getGoogleOAuthConfig(requestOrigin);
  if (!isConfigured || !clientId) {
    throw new Error('GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be configured');
  }

  const state = createOAuthStateToken(adminUserId);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GDRIVE_OAUTH_SCOPE,
    access_type: 'offline', // Required to receive a refresh token
    prompt: 'consent', // Forces refresh token issuance even if previously granted
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the one-time authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  requestOrigin?: string
): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(requestOrigin);
  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth client credentials');
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Failed to exchange authorization code'
    );
  }

  // Persist refresh token to database with AES-256-GCM encryption at rest
  let effectiveRefreshToken: string | undefined = data.refresh_token;
  if (effectiveRefreshToken) {
    await setSetting('gdrive_refresh_token', encryptToken(effectiveRefreshToken));
  } else {
    const existingRefresh = await getStoredRefreshToken();
    if (!existingRefresh) {
      throw new Error(
        'Google did not return a refresh_token. Please revoke previous app access at myaccount.google.com/permissions and reconnect.'
      );
    }
    effectiveRefreshToken = existingRefresh;
  }

  const tokens: GoogleTokens = {
    accessToken: data.access_token,
    refreshToken: effectiveRefreshToken,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60000, // 1 min buffer
  };

  memoryTokenCache = tokens;
  return tokens;
}

/**
 * Retrieves the stored refresh token from database or environment.
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  // 1. Check environment variable override
  const envToken = cleanEnvValue(process.env.GDRIVE_REFRESH_TOKEN);
  if (envToken) {
    return envToken;
  }

  // 2. Check database settings
  try {
    const dbToken = await getSetting('gdrive_refresh_token');
    if (dbToken) {
      return decryptToken(dbToken);
    }
  } catch (err: any) {
    console.error(
      '[Global Send] Failed to retrieve or decrypt stored refresh token:',
      err.message
    );
  }

  return null;
}

/**
 * Retrieves a valid Google Drive access token, automatically refreshing if expired.
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  if (
    memoryTokenCache &&
    memoryTokenCache.accessToken &&
    memoryTokenCache.expiresAt > now
  ) {
    return memoryTokenCache.accessToken;
  }

  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error(
      'Google Drive is not connected. Administrator must connect Google Drive in Profile & Settings.'
    );
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error(
      'GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET are required to refresh Google Drive tokens'
    );
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    // If token was revoked or expired in Testing mode
    if (data.error === 'invalid_grant') {
      memoryTokenCache = null;
      throw new Error(
        'Google Drive authorization expired or revoked (invalid_grant). If your Google OAuth Consent Screen is in "Testing" mode, refresh tokens expire every 7 days. Publish the OAuth Consent Screen to "In production" and reconnect.'
      );
    }
    throw new Error(
      data.error_description || data.error || 'Failed to refresh Google Drive token'
    );
  }

  // If Google rotated the refresh token during refresh, persist the new one
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    await setSetting('gdrive_refresh_token', encryptToken(data.refresh_token)).catch(
      () => {}
    );
  }

  memoryTokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: now + (data.expires_in || 3600) * 1000 - 60000,
  };

  return data.access_token;
}

/**
 * Disconnects Google Drive by clearing stored tokens.
 */
export async function disconnectGoogleDrive(): Promise<void> {
  memoryTokenCache = null;
  await deleteSetting('gdrive_refresh_token');
  await deleteSetting('gdrive_root_folder_id');
}

/**
 * Ensures the dedicated "Global Send" root folder exists in the owner's Google Drive.
 */
export async function getOrCreateGlobalSendFolder(accessToken: string): Promise<string> {
  // Check cached / stored folder ID and verify it still exists & is not trashed
  const storedFolderId = await getSetting('gdrive_root_folder_id').catch(() => null);
  if (storedFolderId) {
    const checkRes = await fetch(
      `${GOOGLE_DRIVE_API}/files/${storedFolderId}?fields=id,trashed`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    ).catch(() => null);
    if (checkRes && checkRes.ok) {
      const checkData = await checkRes.json().catch(() => ({}));
      if (checkData.id && !checkData.trashed) {
        return storedFolderId;
      }
    }
  }

  // 1. Search for existing folder
  const query = encodeURIComponent(
    "name = 'Global Send' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  );
  const searchRes = await fetch(
    `${GOOGLE_DRIVE_API}/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const folderId = data.files[0].id;
      await setSetting('gdrive_root_folder_id', folderId);
      return folderId;
    }
  }

  // 2. Create dedicated folder if not found
  const createRes = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Global Send',
      mimeType: 'application/vnd.google-apps.folder',
      description:
        'Dedicated storage folder for Global Send cloud clipboard and file locker.',
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(
      `Failed to create Global Send folder in Google Drive: ${
        createData.error?.message || 'Unknown error'
      }`
    );
  }

  await setSetting('gdrive_root_folder_id', createData.id);
  return createData.id;
}
