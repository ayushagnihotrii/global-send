import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { disconnectGoogleDrive } from '@/lib/storage/google-drive-auth';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await disconnectGoogleDrive();
    return NextResponse.json({ success: true, message: 'Google Drive disconnected' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to disconnect' }, { status: 500 });
  }
}
