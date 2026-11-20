import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getShareAccessLogs, getShareById } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const share = await getShareById(id);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (share.userId && share.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs = await getShareAccessLogs(id, session.userId);

    return NextResponse.json({
      success: true,
      logs,
      summary: {
        totalDownloads: share.downloadCount,
        maxDownloads: share.maxDownloads,
        downloadsRemaining:
          share.maxDownloads !== null && share.maxDownloads !== undefined
            ? Math.max(0, share.maxDownloads - share.downloadCount)
            : null,
      },
    });
  } catch (err: any) {
    console.error('Error fetching share access logs:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to retrieve access logs' },
      { status: 500 }
    );
  }
}
