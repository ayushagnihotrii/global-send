import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createShare, listUserShares, getItemById } from '@/lib/db';

const createShareSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  password: z.string().optional().nullable(),
  maxDownloads: z.number().int().positive().optional().nullable(),
  expirationDurationSec: z.number().int().positive().optional().default(86400),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const body = await req.json();
    const parsed = createShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input parameters' },
        { status: 400 }
      );
    }

    const { itemId, password, maxDownloads, expirationDurationSec } = parsed.data;

    // Verify item exists and check authorization
    const item = await getItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.deletedAt || item.deletionStatus === 'deleted' || item.deletionStatus === 'expired') {
      return NextResponse.json({ error: 'Item is no longer accessible' }, { status: 410 });
    }

    // If item belongs to a specific user, ensure requesting user owns it (if session present)
    if (item.userId && (!session || session.userId !== item.userId)) {
      return NextResponse.json({ error: 'Unauthorized to share this item' }, { status: 403 });
    }

    const share = await createShare({
      userId: session?.userId || null,
      itemId,
      password: password?.trim() || null,
      maxDownloads: maxDownloads || null,
      expirationDurationSec: expirationDurationSec || 86400,
    });

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        itemId: share.itemId,
        hasPassword: share.hasPassword,
        maxDownloads: share.maxDownloads,
        downloadCount: share.downloadCount,
        expiresAt: share.expiresAt,
        createdAt: share.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Error creating share link:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shares = await listUserShares(session.userId);
    return NextResponse.json({
      success: true,
      shares,
    });
  } catch (err: any) {
    console.error('Error listing user shares:', err?.message || err);
    return NextResponse.json(
      { error: err?.message || 'Failed to list share links' },
      { status: 500 }
    );
  }
}
