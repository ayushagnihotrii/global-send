import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getSession,
  verifyLoginKey,
  hashLoginKey,
  validateLoginKey,
  setSessionCookie,
} from '@/lib/auth';
import {
  getRawUserById,
  updateUserPassword,
} from '@/lib/db';

const changeKeySchema = z.object({
  currentKey: z.string().min(1, 'Current login key is required'),
  newKey: z.string().min(1, 'New login key is required'),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawCurrentKey = body.currentKey || body.currentPassword || '';
    const rawNewKey = body.newKey || body.newPassword || '';

    const parseResult = changeKeySchema.safeParse({
      currentKey: rawCurrentKey,
      newKey: rawNewKey,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Current and new login keys are required' },
        { status: 400 }
      );
    }

    const { currentKey, newKey } = parseResult.data;

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

    // Hash new key with Argon2id (two users may have the exact same key now)
    const newHash = await hashLoginKey(newKey);
    await updateUserPassword(session.userId, newHash);

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
