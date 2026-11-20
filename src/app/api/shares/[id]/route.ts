import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getShareById, revokeShare } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const share = await getShareById(id);

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (share.isRevoked) {
      return NextResponse.json(
        {
          error: 'This share link has been revoked by the sender',
          code: 'REVOKED',
          isRevoked: true,
        },
        { status: 410 }
      );
    }

    if (share.isExpired) {
      return NextResponse.json(
        {
          error: 'This share link has expired and is no longer available',
          code: 'EXPIRED',
          isExpired: true,
        },
        { status: 410 }
      );
    }

    if (share.isExhausted) {
      return NextResponse.json(
        {
          error: 'Download limit has been reached for this file',
          code: 'EXHAUSTED',
          isExhausted: true,
        },
        { status: 410 }
      );
    }

    const remainingDownloads =
      share.maxDownloads !== null && share.maxDownloads !== undefined
        ? Math.max(0, share.maxDownloads - share.downloadCount)
        : null;

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        itemId: share.itemId,
        title: share.item?.title || 'Shared File',
        type: share.item?.type || 'file',
        fileSize: share.item?.fileSize || 0,
        mimeType: share.item?.mimeType || 'application/octet-stream',
        sanitizedFilename: share.item?.sanitizedFilename || 'file',
        hasPassword: share.hasPassword,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        downloadsRemaining: remainingDownloads,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error retrieving share metadata:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to retrieve share metadata' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await revokeShare(id, session.userId);

    return NextResponse.json({
      success: true,
      message: 'Share link revoked successfully',
    });
  } catch (err: any) {
    console.error('Error revoking share:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to revoke share link' },
      { status: 500 }
    );
  }
}
