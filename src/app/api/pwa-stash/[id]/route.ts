import { NextRequest, NextResponse } from 'next/server';
import { consumePwaStash } from '@/lib/pwa-stash';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = consumePwaStash(id);

    if (!entry) {
      return NextResponse.json({ error: 'Staged files expired or not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry,
    });
  } catch (err: any) {
    console.error('Error consuming PWA stash:', err);
    return NextResponse.json({ error: 'Failed to retrieve staged files' }, { status: 500 });
  }
}
