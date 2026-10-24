import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserStorageUsage } from '@/lib/db';
import { getStorageProvider } from '@/lib/storage';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const provider = getStorageProvider();
    let liveProviderQuota:
      | { usedBytes?: number; limitBytes?: number; availableBytes?: number }
      | undefined;

    if (provider.name === 'google_drive' && provider.getQuota) {
      const q = await provider.getQuota().catch(() => null);
      if (q && typeof q.limitBytes === 'number' && typeof q.availableBytes === 'number') {
        liveProviderQuota = {
          usedBytes: q.usedBytes,
          limitBytes: q.limitBytes,
          availableBytes: q.availableBytes,
        };
      }
    }

    const usage = await getUserStorageUsage(session.userId, liveProviderQuota);
    return NextResponse.json({ success: true, usage });
  } catch (err: any) {
    console.error('Storage usage error:', err);
    return NextResponse.json({ error: 'Failed to retrieve storage usage' }, { status: 500 });
  }
}
