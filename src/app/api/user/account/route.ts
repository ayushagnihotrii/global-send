import { NextRequest, NextResponse } from 'next/server';
import { getSession, clearSessionCookie, verifyPassword } from '@/lib/auth';
import { getUserByUsername, deleteUserAccount, emptyTrash } from '@/lib/db';
import { deleteR2Object, isR2Configured } from '@/lib/r2';

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const password = body.password;

    if (!password) {
      return NextResponse.json({ error: 'Password confirmation is required' }, { status: 400 });
    }

    const user = await getUserByUsername(session.username);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Password verification failed' }, { status: 400 });
    }

    // Clean up all R2 files first
    const storageKeys = await emptyTrash(session.userId);
    if (isR2Configured()) {
      await Promise.allSettled(storageKeys.map(key => deleteR2Object(key)));
    }

    // Delete user (cascades to items, files, tags)
    await deleteUserAccount(session.userId);
    await clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Account permanently deleted' });
  } catch (err: any) {
    console.error('Delete account error:', err);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
