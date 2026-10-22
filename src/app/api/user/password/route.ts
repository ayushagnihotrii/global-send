import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, verifyPassword, hashPassword } from '@/lib/auth';
import { getUserByUsername, updateUserPassword } from '@/lib/db';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = result.data;
    const user = await getUserByUsername(session.username);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(session.userId, newHash);

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    console.error('Change password error:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
