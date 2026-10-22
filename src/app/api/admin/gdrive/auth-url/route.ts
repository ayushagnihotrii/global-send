import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateGoogleAuthUrl, getGoogleOAuthConfig } from '@/lib/storage/google-drive-auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { isConfigured } = getGoogleOAuthConfig();
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
    const authUrl = generateGoogleAuthUrl(session.userId);
    return NextResponse.json({ success: true, url: authUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate auth URL' }, { status: 500 });
  }
}
