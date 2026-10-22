import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { toggleItemFavourite } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const isFavourite = await toggleItemFavourite(id, session.userId);
    return NextResponse.json({ success: true, isFavourite });
  } catch (err: any) {
    console.error('Toggle favourite error:', err);
    return NextResponse.json({ error: 'Failed to toggle favourite' }, { status: 500 });
  }
}
