import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByUsername } from '@/lib/db';
import { verifyPassword, setSessionCookie, checkRateLimit, createSessionToken } from '@/lib/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'local';
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { username, password, rememberMe } = result.data;

    // Rate limiting key combining IP and username
    if (!checkRateLimit(`login_${ip}_${username.toLowerCase()}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const user = await getUserByUsername(username);

    // Timing-safe comparison to prevent username enumeration
    if (!user) {
      // Fake hash compare to prevent timing side channels
      await verifyPassword(password, '$2a$12$e8x5a3z4l5.w1h6b8o0r7u1t2e3f4o5r6g7e8r9y0s1a2m3p4l5e');
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await createSessionToken(
      { userId: user.id, username: user.username },
      rememberMe
    );

    await setSessionCookie(
      { userId: user.id, username: user.username },
      rememberMe
    );

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        storageLimitBytes: Number(user.storage_limit_bytes),
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    );
  }
}
