import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserStorageUsage } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const usage = await getUserStorageUsage(session.userId);
    return NextResponse.json({ success: true, usage });
  } catch (err: any) {
    console.error('Storage usage error:', err);
    return NextResponse.json({ error: 'Failed to retrieve storage usage' }, { status: 500 });
  }
}
