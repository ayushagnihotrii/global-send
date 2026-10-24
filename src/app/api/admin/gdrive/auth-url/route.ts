import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isUserAdmin } from '@/lib/db';
import { generateGoogleAuthUrl, getGoogleOAuthConfig } from '@/lib/storage/google-drive-auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isUserAdmin(session.userId);
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the storage administrator can connect Google Drive.' },
      { status: 403 }
    );
  }

  const origin = new URL(req.url).origin;
  const { isConfigured, redirectUri } = getGoogleOAuthConfig(origin);
  if (!isConfigured) {
    return NextResponse.json(
      {
        error:
          'Google Drive OAuth is not configured. Please add GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET to environment variables.',
      },
      { status: 400 }
    );
  }

  try {
    const authUrl = generateGoogleAuthUrl(session.userId, origin);
    return NextResponse.json({ success: true, url: authUrl, redirectUri });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
