import { NextRequest, NextResponse } from 'next/server';
import { getSession, clearSessionCookie, verifyLoginKey } from '@/lib/auth';
import { getRawUserById, deleteUserAccount } from '@/lib/db';
import { deleteStorageFile } from '@/lib/storage';
import { executeFullCleanup } from '@/lib/cleanup';

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const key = body.key || body.loginKey || body.password;

    if (!key) {
      return NextResponse.json(
        { error: 'Login key confirmation is required to delete your account' },
        { status: 400 }
      );
    }

    const user = await getRawUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await verifyLoginKey(key, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Login key verification failed' },
        { status: 400 }
      );
    }

    // Delete user account and enqueue all storage files + avatar for permanent deletion
    const storageKeys = await deleteUserAccount(session.userId);
    await Promise.allSettled(storageKeys.map((k) => deleteStorageFile(k)));
    await executeFullCleanup().catch(() => {});
    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: 'Account and all associated files permanently deleted',
    });
  } catch (err: any) {
    console.error('Delete account error:', err?.message || 'Error');
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
