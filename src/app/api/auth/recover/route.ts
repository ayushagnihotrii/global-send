import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByUsername, updateUserPassword } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth';

const recoverSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  recoveryCode: z.string().min(1, 'Recovery code is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = recoverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { username, recoveryCode, newPassword } = result.data;
    const user = await getUserByUsername(username);

    if (!user || !user.recovery_code_hash) {
      return NextResponse.json(
        { error: 'Invalid recovery code or username' },
        { status: 400 }
      );
    }

    const normalizedCode = recoveryCode.trim().toUpperCase();
    const isValid = await verifyPassword(normalizedCode, user.recovery_code_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid recovery code or username' },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await updateUserPassword(user.id, newHash);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (err: any) {
    console.error('Password recovery error:', err);
    return NextResponse.json(
      { error: 'Failed to recover account. Please try again.' },
      { status: 500 }
    );
  }
}
