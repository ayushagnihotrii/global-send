import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getOrCreateGlobalSendFolder } from '@/lib/storage/google-drive-auth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('Google OAuth error callback:', error);
    return NextResponse.redirect(new URL('/?gdrive_error=' + encodeURIComponent(error), req.url));
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  try {
    // 1. Exchange code for access & refresh tokens
    const tokens = await exchangeCodeForTokens(code);

    // 2. Ensure dedicated Global Send folder exists
    await getOrCreateGlobalSendFolder(tokens.accessToken);

    return NextResponse.redirect(new URL('/?gdrive=connected', req.url));
  } catch (err: any) {
    console.error('Google Drive OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/?gdrive_error=' + encodeURIComponent(err.message || 'Authorization failed'), req.url)
    );
  }
}
