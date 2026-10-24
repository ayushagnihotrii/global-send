import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUsername,
  getUserByKeyFingerprint,
  createUser,
} from '@/lib/db';
import {
  validateUsername,
  validateLoginKey,
  computeKeyFingerprint,
  hashLoginKey,
  setSessionCookie,
  checkRateLimit,
  createSessionToken,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!checkRateLimit(`reg_${ip}`, 10, 60000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again in a minute.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // 1. Optional instance-level registration policy
    const allowRegistration = process.env.ALLOW_REGISTRATION?.trim().toLowerCase();
    const inviteCodeConfig = process.env.INVITE_CODE?.trim();

    if (allowRegistration === 'false') {
      return NextResponse.json(
        { error: 'Public registration is disabled on this private Global Send instance.' },
        { status: 403 }
      );
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

    // 2. Validate username
    const rawUsername = typeof body.username === 'string' ? body.username : '';
    const usernameCheck = validateUsername(rawUsername);
    if (!usernameCheck.valid) {
      return NextResponse.json(
        { error: usernameCheck.error || 'Invalid username' },
        { status: 400 }
      );
    }

    // 3. Validate login key (supports 'key', 'loginKey', or 'password' field)
    const rawKey =
      typeof body.key === 'string'
        ? body.key
        : typeof body.loginKey === 'string'
        ? body.loginKey
        : typeof body.password === 'string'
        ? body.password
        : '';

    const keyCheck = validateLoginKey(rawKey, usernameCheck.display);
    if (!keyCheck.valid) {
      return NextResponse.json(
        { error: keyCheck.error || 'Invalid login key' },
        { status: 400 }
      );
    }

    // 4. Require unrecoverable-key warning acknowledgment when provided in UI
    if (body.acknowledgedWarning === false) {
      return NextResponse.json(
        {
          error:
            'You must acknowledge that your login key cannot be recovered if lost.',
        },
        { status: 400 }
      );
    }

    // 5. Enforce case-insensitive username uniqueness
    const existingUsername = await getUserByUsername(usernameCheck.normalized);
    if (existingUsername) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another.' },
        { status: 409 }
      );
    }

    // 6. Enforce unique login key across accounts via HMAC-SHA-256 fingerprint
    const keyFingerprint = computeKeyFingerprint(rawKey);
    const existingKeyOwner = await getUserByKeyFingerprint(keyFingerprint);
    if (existingKeyOwner) {
      return NextResponse.json(
        {
          error:
            'This login key is already in use. Please create a different, unique login key.',
        },
        { status: 409 }
      );
    }

    // 7. Hash login key with salted Argon2id (never store plaintext or recovery codes)
    const userId = crypto.randomUUID();
    const keyHash = await hashLoginKey(rawKey);

    let user;
    try {
      user = await createUser(userId, usernameCheck.normalized, keyHash, null, {
        displayUsername: usernameCheck.display,
        keyFingerprint,
      });
    } catch (dbErr: any) {
      const msg = String(dbErr?.message || '').toLowerCase();
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return NextResponse.json(
          {
            error:
              'Username or login key is already registered. Please choose a different value.',
          },
          { status: 409 }
        );
      }
      throw dbErr;
    }

    const sessionPayload = {
      userId: user.id,
      username: user.username,
      sessionVersion: 1,
    };

    const token = await createSessionToken(sessionPayload, false);
    await setSessionCookie(sessionPayload, false);

    return NextResponse.json(
      {
        success: true,
        token,
        user,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[Global Send Registration Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}
