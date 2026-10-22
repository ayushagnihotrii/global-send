import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByUsername, createUser, getUserCount } from '@/lib/db';
import { hashPassword, generateRecoveryCode, setSessionCookie, checkRateLimit, createSessionToken } from '@/lib/auth';

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
  inviteCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    if (!checkRateLimit(`reg_${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 1. Storage Protection Policy: Enforce Owner-Only or Invitation-Only in production
    const allowRegistration = process.env.ALLOW_REGISTRATION;
    const inviteCodeConfig = process.env.INVITE_CODE?.trim();
    const isOwnerOnly = process.env.REGISTRATION_MODE === 'owner_only';

    if (allowRegistration === 'false') {
      return NextResponse.json(
        { error: 'Public registration is disabled on this private Global Send instance.' },
        { status: 403 }
      );
    }

    if (isOwnerOnly) {
      const userCount = await getUserCount();
      if (userCount > 0) {
        return NextResponse.json(
          { error: 'Registration is closed. This Global Send instance is restricted to the owner.' },
          { status: 403 }
        );
      }
    }

    if (inviteCodeConfig) {
      const providedInvite = body.inviteCode?.trim();
      if (providedInvite !== inviteCodeConfig) {
        return NextResponse.json(
          { error: 'Invalid or missing invitation code.' },
          { status: 403 }
        );
      }
    }

    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { username, password } = result.data;
    const existing = await getUserByUsername(username);

    if (existing) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const recovery = generateRecoveryCode();
    const recoveryCodeHash = await recovery.hash;

    const user = await createUser(userId, username, passwordHash, recoveryCodeHash);

    // Create session
    const token = await createSessionToken({ userId: user.id, username: user.username }, true);
    await setSessionCookie({ userId: user.id, username: user.username }, true);

    return NextResponse.json({
      success: true,
      token,
      user,
      recoveryCode: recovery.plain,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
