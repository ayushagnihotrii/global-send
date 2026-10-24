import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isUserAdmin } from '@/lib/db';
import { disconnectGoogleDrive } from '@/lib/storage/google-drive-auth';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = await isUserAdmin(session.userId);
  if (!admin) {
    return NextResponse.json(
      { error: 'Forbidden: Only the storage administrator can disconnect Google Drive.' },
      { status: 403 }
    );
  }

  try {
    await disconnectGoogleDrive();
    return NextResponse.json({ success: true, message: 'Google Drive disconnected' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect' }, { status: 500 });
  }
}
