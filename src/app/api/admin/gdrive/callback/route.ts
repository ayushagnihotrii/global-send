import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isUserAdmin } from '@/lib/db';
import {
  exchangeCodeForTokens,
  getOrCreateGlobalSendFolder,
  verifyOAuthStateToken,
} from '@/lib/storage/google-drive-auth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // 1. Verify active administrator session
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(
      new URL(
        '/?gdrive_error=' +
          encodeURIComponent('Unauthorized: Administrator session required to connect Google Drive.'),
        req.url
      )
    );
  }

  const admin = await isUserAdmin(session.userId);
  if (!admin) {
    return NextResponse.redirect(
      new URL(
        '/?gdrive_error=' +
          encodeURIComponent('Forbidden: Only the storage administrator can connect Google Drive.'),
        req.url
      )
    );
  }

  if (error) {
    console.error('Google OAuth error callback:', error);
    return NextResponse.redirect(
      new URL('/?gdrive_error=' + encodeURIComponent(error), req.url)
    );
  }

  if (!code) {
    return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  // 2. Verify signed OAuth state token bound to this administrator
  if (!verifyOAuthStateToken(state, session.userId)) {
    return NextResponse.redirect(
      new URL(
        '/?gdrive_error=' +
          encodeURIComponent('Invalid or expired OAuth state parameter. Please try connecting again.'),
        req.url
      )
    );
  }

  try {
    // 3. Exchange code for access & refresh tokens using matching redirect_uri
    const tokens = await exchangeCodeForTokens(code, origin);

    // 4. Ensure dedicated Global Send folder exists
    await getOrCreateGlobalSendFolder(tokens.accessToken);

    return NextResponse.redirect(new URL('/?gdrive=connected', req.url));
  } catch (err: any) {
    console.error('Google Drive OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(
        '/?gdrive_error=' + encodeURIComponent(err.message || 'Authorization failed'),
        req.url
      )
    );
  }
}
