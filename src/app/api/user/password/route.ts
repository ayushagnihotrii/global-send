import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  verifyLoginKey,
  hashLoginKey,
  validateLoginKey,
  computeKeyFingerprint,
  setSessionCookie,
} from '@/lib/auth';
import {
  getRawUserById,
  getUserByKeyFingerprint,
  updateUserPassword,
} from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const currentKey = body.currentKey || body.currentPassword || '';
    const newKey = body.newKey || body.newPassword || '';

    if (!currentKey) {
      return NextResponse.json(
        { error: 'Current login key is required' },
        { status: 400 }
      );
    }

    const user = await getRawUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const validCheck = validateLoginKey(newKey, user.username);
    if (!validCheck.valid) {
      return NextResponse.json(
        { error: validCheck.error || 'Invalid new login key' },
        { status: 400 }
      );
    }

    const isMatch = await verifyLoginKey(currentKey, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Current login key is incorrect' },
        { status: 400 }
      );
    }

    const newFingerprint = computeKeyFingerprint(newKey);
    const existingOwner = await getUserByKeyFingerprint(newFingerprint);
    if (existingOwner && existingOwner.id !== session.userId) {
      return NextResponse.json(
        { error: 'This login key is already in use. Please choose a different key.' },
        { status: 409 }
      );
    }

    const newHash = await hashLoginKey(newKey);
    await updateUserPassword(session.userId, newHash, newFingerprint);

    const updatedUser = await getRawUserById(session.userId);
    await setSessionCookie({
      userId: session.userId,
      username: session.username,
      sessionVersion: Number(updatedUser?.session_version || 1),
    });

    return NextResponse.json({
      success: true,
      message: 'Login key updated successfully',
    });
  } catch (err: any) {
    console.error('Change key error:', err?.message || 'Error');
    return NextResponse.json(
      { error: 'Failed to update login key' },
      { status: 500 }
    );
  }
}
