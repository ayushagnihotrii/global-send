import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByKeyFingerprint,
  getUsersWithoutKeyFingerprint,
  setUserKeyFingerprint,
  updateUserLastLogin,
  getUserById,
} from '@/lib/db';
import {
  computeKeyFingerprint,
  verifyLoginKey,
  performDummyKeyVerification,
  setSessionCookie,
  checkRateLimit,
  createSessionToken,
} from '@/lib/auth';

const GENERIC_LOGIN_ERROR = 'Invalid key. Please check your key and try again.';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

    // Rate limit per IP
    if (!checkRateLimit(`login_ip_${ip}`, 12, 60000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawKey =
      typeof body.key === 'string'
        ? body.key
        : typeof body.loginKey === 'string'
        ? body.loginKey
        : typeof body.password === 'string'
        ? body.password
        : '';

    if (!rawKey || rawKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please enter your login key.' },
        { status: 400 }
      );
    }

    const keyFingerprint = computeKeyFingerprint(rawKey);

    // Rate limit per fingerprint prefix to throttle targeted guesses
    if (!checkRateLimit(`login_fp_${ip}_${keyFingerprint.slice(0, 12)}`, 8, 60000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    // 1. Primary lookup by deterministic HMAC-SHA-256 key fingerprint (no username required!)
    let userRow = await getUserByKeyFingerprint(keyFingerprint);

    if (userRow) {
      const isValid = await verifyLoginKey(rawKey, userRow.password_hash);
      if (!isValid) {
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      }
    } else {
      // 2. Fallback migration check for any pre-existing legacy user without a fingerprint
      const legacyUsers = await getUsersWithoutKeyFingerprint();
      let matchedLegacy: any = null;

      for (const candidate of legacyUsers) {
        const ok = await verifyLoginKey(rawKey, candidate.password_hash);
        if (ok) {
          matchedLegacy = candidate;
          break;
        }
      }

      if (matchedLegacy) {
        await setUserKeyFingerprint(matchedLegacy.id, keyFingerprint).catch(() => {});
        userRow = matchedLegacy;
      } else {
        // Equalize timing with a full Argon2id computation so attackers cannot probe key existence
        await performDummyKeyVerification(rawKey);
        return NextResponse.json({ error: GENERIC_LOGIN_ERROR }, { status: 401 });
      }
    }

    await updateUserLastLogin(userRow.id);
    const fullUser = await getUserById(userRow.id);

    const sessionPayload = {
      userId: userRow.id,
      username: userRow.username,
      sessionVersion: Number(userRow.session_version || 1),
    };

    const rememberMe = Boolean(body.rememberMe);
    const token = await createSessionToken(sessionPayload, rememberMe);
    await setSessionCookie(sessionPayload, rememberMe);

    return NextResponse.json({
      success: true,
      token,
      user: fullUser,
    });
  } catch (err: any) {
    console.error('[Global Send Login Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to sign in. Please try again.' },
      { status: 500 }
    );
  }
}
