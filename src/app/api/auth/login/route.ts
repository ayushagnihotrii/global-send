import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserByUsername,
  updateUserLastLogin,
  getUserById,
  checkPersistentRateLimit,
} from '@/lib/db';
import {
  validateUsername,
  verifyLoginKey,
  performDummyKeyVerification,
  setSessionCookie,
  createSessionToken,
} from '@/lib/auth';

const GENERIC_LOGIN_ERROR = 'Invalid username or key.';

const loginInputSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  key: z.string().min(1, 'Login key is required'),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

    // 1. Persistent IP-based rate limiting
    const ipAllowed = await checkPersistentRateLimit(`login_ip_${ip}`, 20, 60000);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawUsername = typeof body.username === 'string' ? body.username.trim() : '';
    const rawKey =
      typeof body.key === 'string'
        ? body.key
        : typeof body.loginKey === 'string'
        ? body.loginKey
        : typeof body.password === 'string'
        ? body.password
        : '';

    // Login with key alone must no longer work: both username and key are strictly required
    const parseResult = loginInputSchema.safeParse({
      username: rawUsername,
      key: rawKey,
      rememberMe: Boolean(body.rememberMe),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Username and login key are both required to sign in.' },
        { status: 400 }
      );
    }

    const { username, key, rememberMe } = parseResult.data;
    const usernameValidation = validateUsername(username);
    const normalizedUsername = usernameValidation.normalized;

    // 2. Persistent Username-based rate limiting
    const userAllowed = await checkPersistentRateLimit(`login_user_${normalizedUsername}`, 10, 60000);
    if (!userAllowed) {
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // 3. Look up user by normalized username (case-insensitive)
    const userRow = await getUserByUsername(normalizedUsername);

    if (!userRow) {
      // Dummy Argon2id verification to equalize timing side-channels
      await performDummyKeyVerification(key);
      return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
    }

    // 4. Constant-time Argon2id key verification
    const isValid = await verifyLoginKey(key, userRow.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
    }

    // Check if a key reset occurred since the user's prior login to notify owner
    let keyResetNotice: string | null = null;
    if (userRow.key_reset_at) {
      const resetTime = new Date(userRow.key_reset_at).getTime();
      const lastLoginTime = userRow.last_login_at ? new Date(userRow.last_login_at).getTime() : 0;
      if (resetTime >= lastLoginTime) {
        keyResetNotice = `Your login key was reset on ${new Date(userRow.key_reset_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}.`;
      }
    }

    await updateUserLastLogin(userRow.id);
    const fullUser = await getUserById(userRow.id);

    const sessionPayload = {
      userId: userRow.id,
      username: userRow.username,
      sessionVersion: Number(userRow.session_version || 1),
    };

    const token = await createSessionToken(sessionPayload, rememberMe);
    await setSessionCookie(sessionPayload, rememberMe);

    return NextResponse.json({
      success: true,
      token,
      user: fullUser,
      keyResetNotice,
      needsSecurityQuestion: !fullUser?.hasSecurityQuestion,
    });
  } catch (err: any) {
    console.error('[Global Send Login Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    );
  }
}
