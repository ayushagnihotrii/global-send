import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStoredRefreshToken, getGoogleOAuthConfig } from '@/lib/storage/google-drive-auth';
import { GoogleDriveStorageProvider } from '@/lib/storage/google-drive-provider';
import { getSetting } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { isConfigured } = getGoogleOAuthConfig();
  const refreshToken = await getStoredRefreshToken();
  const rootFolderId = await getSetting('gdrive_root_folder_id').catch(() => null);

  if (!refreshToken) {
    return NextResponse.json({
      connected: false,
      isConfigured,
      message: isConfigured
        ? 'Google Drive credentials configured in environment. Connect account to authorize storage.'
        : 'Google Drive client credentials (GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET) not yet configured.',
    });
  }

  // If connected, fetch live quota info
  try {
    const provider = new GoogleDriveStorageProvider();
    const quota = await provider.getQuota();

    return NextResponse.json({
      connected: true,
      isConfigured: true,
      rootFolderId,
      quota,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: true,
      isConfigured: true,
      rootFolderId,
      error: err.message,
    });
  }
}
