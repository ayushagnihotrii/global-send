import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { updateFileThumbnail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, thumbnailData } = body;

    if (!itemId || !thumbnailData || typeof thumbnailData !== 'string') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Safety: ensure thumbnailData is a valid data URL and not too large (< 150KB)
    if (!thumbnailData.startsWith('data:image/') || thumbnailData.length > 200000) {
      return NextResponse.json({ error: 'Thumbnail too large or invalid format' }, { status: 400 });
    }

    await updateFileThumbnail(itemId, thumbnailData);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
