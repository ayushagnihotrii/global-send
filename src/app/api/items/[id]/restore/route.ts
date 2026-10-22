import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { restoreItem } from '@/lib/db';

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
    await restoreItem(id, session.userId);
    return NextResponse.json({ success: true, message: 'Item restored' });
  } catch (err: any) {
    console.error('Restore item error:', err);
    return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 });
  }
}
