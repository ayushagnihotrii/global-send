import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { emptyTrash } from '@/lib/db';
import { deleteStorageFile } from '@/lib/r2';

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const storageKeys = await emptyTrash(session.userId);

    // Delete associated files (R2 or local disk)
    if (storageKeys.length > 0) {
      await Promise.allSettled(storageKeys.map(k => deleteStorageFile(k)));
    }

    return NextResponse.json({
      success: true,
      message: `Trash emptied (${storageKeys.length} files permanently removed)`,
    });
  } catch (err: any) {
    console.error('Empty trash error:', err);
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 });
  }
}
