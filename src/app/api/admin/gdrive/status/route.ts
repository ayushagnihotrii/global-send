import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStoredRefreshToken, getGoogleOAuthConfig } from '@/lib/storage/google-drive-auth';
import { GoogleDriveStorageProvider } from '@/lib/storage/google-drive-provider';
import { getSetting, isUserAdmin } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isUserAdmin(session.userId);
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the storage administrator can access storage connection status.' },
      { status: 403 }
    );
  }

  const origin = new URL(req.url).origin;
  const { isConfigured, redirectUri } = getGoogleOAuthConfig(origin);
  const refreshToken = await getStoredRefreshToken();
  const rootFolderId = await getSetting('gdrive_root_folder_id').catch(() => null);

  if (!refreshToken) {
    return NextResponse.json({
      connected: false,
      isConfigured,
      redirectUri,
      message: isConfigured
        ? 'Google Drive credentials configured in environment. Connect account to authorize storage.'
        : 'Google Drive client credentials (GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET) not yet configured.',
    });
  }

  try {
    const provider = new GoogleDriveStorageProvider();
    const quota = await provider.getQuota();

    if (quota.note?.startsWith('Google Drive quota check error:')) {
      return NextResponse.json({
        connected: false,
        isConfigured: true,
        redirectUri,
        error: quota.note,
      });
    }

    return NextResponse.json({
      connected: true,
      isConfigured: true,
      redirectUri,
      rootFolderId: rootFolderId ? 'configured' : null,
      quota: {
        provider: quota.provider,
        usedBytes: quota.usedBytes,
        limitBytes: quota.limitBytes,
        availableBytes: quota.availableBytes,
        accountEmail: quota.accountEmail,
        note: quota.note,
      },
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      isConfigured: true,
      redirectUri,
      error: err.message,
    });
  }
}
