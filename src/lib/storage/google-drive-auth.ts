/**
 * Global Send: Google Drive Server-Side OAuth & Token Manager
 * Manages OAuth2 tokens, automatic refresh, and folder initialization.
 * Keeps all client secrets and refresh tokens strictly server-side.
 */

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

export function getGoogleOAuthConfig() {
  const clientId = process.env.GDRIVE_CLIENT_ID?.trim();
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET?.trim();
  const redirectUri =
    process.env.GDRIVE_REDIRECT_URI?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/gdrive/callback`;

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
export function generateGoogleAuthUrl(state: string = 'admin_connect'): string {
  const { clientId, redirectUri, isConfigured } = getGoogleOAuthConfig();
  if (!isConfigured) {
    throw new Error('GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be configured');
  }

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GDRIVE_OAUTH_SCOPE,
    access_type: 'offline', // Required to receive a refresh token
    prompt: 'consent', // Forces refresh token issuance even if previously granted
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchanges the one-time authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
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

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code');
  }

  const tokens: GoogleTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - 60000, // 1 min buffer
  };

  memoryTokenCache = tokens;

  // Persist refresh token to database with AES-256-GCM encryption at rest
  if (data.refresh_token) {
    await setSetting('gdrive_refresh_token', encryptToken(data.refresh_token));
  }

  return tokens;
}

/**
 * Retrieves the stored refresh token from database or environment.
 */
export async function getStoredRefreshToken(): Promise<string | null> {
  // 1. Check environment variable override
  if (process.env.GDRIVE_REFRESH_TOKEN) {
    return process.env.GDRIVE_REFRESH_TOKEN.trim();
  }

  // 2. Check database settings
  try {
    const dbToken = await getSetting('gdrive_refresh_token');
    if (dbToken) {
      return decryptToken(dbToken);
    }
  } catch (err: any) {
    console.error('[Global Send] Failed to retrieve or decrypt stored refresh token:', err.message);
  }

  return null;
}

/**
 * Retrieves a valid Google Drive access token, automatically refreshing if expired.
 */
export async function getValidAccessToken(): Promise<string> {
  const now = Date.now();
  if (memoryTokenCache && memoryTokenCache.accessToken && memoryTokenCache.expiresAt > now) {
    return memoryTokenCache.accessToken;
  }

  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) {
    throw new Error('Google Drive is not connected. Administrator must connect Google Drive in Settings.');
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  if (!clientId || !clientSecret) {
    throw new Error('GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET are required to refresh Google Drive tokens');
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

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    // If token was revoked or expired in Testing mode
    if (data.error === 'invalid_grant') {
      memoryTokenCache = null;
      throw new Error(
        'Google Drive authorization expired or revoked (invalid_grant). If your Google OAuth app is in "Testing" mode, refresh tokens expire after 7 days. Please reconnect in Settings.'
      );
    }
    throw new Error(data.error_description || data.error || 'Failed to refresh Google Drive token');
  }

  memoryTokenCache = {
    accessToken: data.access_token,
    refreshToken,
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
  // Check cached / stored folder ID
  const storedFolderId = await getSetting('gdrive_root_folder_id').catch(() => null);
  if (storedFolderId) {
    return storedFolderId;
  }

  // 1. Search for existing folder
  const query = encodeURIComponent("name = 'Global Send' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
  const searchRes = await fetch(`${GOOGLE_DRIVE_API}/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

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
      description: 'Dedicated storage folder for Global Send cloud clipboard and file locker.',
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.id) {
    throw new Error(`Failed to create Global Send folder in Google Drive: ${createData.error?.message || 'Unknown error'}`);
  }

  await setSetting('gdrive_root_folder_id', createData.id);
  return createData.id;
}
