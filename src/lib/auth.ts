import bcrypt from 'bcryptjs';
import { argon2id } from '@noble/hashes/argon2.js';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { AuthSession } from './types';
import { SITE_CONFIG, RESERVED_USERNAMES } from '@/config/site';

const COOKIE_NAME = 'qv_session';
const DEFAULT_SECRET = 'quickvault-local-dev-secret-key-change-in-production-min32chars';

function getAuthSecretString(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.JWT_SECRET ||
    process.env.TOKEN_ENCRYPTION_KEY ||
    DEFAULT_SECRET
  );
}

function getFingerprintSecret(): string {
  return (
    process.env.KEY_FINGERPRINT_SECRET ||
    `globalsend-key-fp-v1:${getAuthSecretString()}`
  );
}

const SECRET_KEY = new TextEncoder().encode(getAuthSecretString());

// Rate limiting map for authentication & lookup endpoints
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxAttempts = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
}

export function resetRateLimitsForTest(): void {
  if (process.env.NODE_ENV !== 'production') {
    rateLimitMap.clear();
  }
}

/**
 * Validates and normalizes a Global Send username.
 * Rules:
 * - 3 to 24 characters
 * - Letters, numbers, underscores, and periods
 * - Cannot start or end with a period or contain consecutive periods
 * - Case-insensitive uniqueness; not a reserved word
 */
export function validateUsername(rawUsername: string): {
  valid: boolean;
  normalized: string;
  display: string;
  error?: string;
} {
  if (typeof rawUsername !== 'string') {
    return { valid: false, normalized: '', display: '', error: 'Username is required' };
  }

  const display = rawUsername.trim();
  const normalized = display.toLowerCase();

  if (display.length < 3) {
    return {
      valid: false,
      normalized,
      display,
      error: 'Username must be at least 3 characters',
    };
  }

  if (display.length > 24) {
    return {
      valid: false,
      normalized,
      display,
      error: 'Username must be at most 24 characters',
    };
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(display)) {
    return {
      valid: false,
      normalized,
      display,
      error: 'Username may only contain letters, numbers, underscores (_), and periods (.)',
    };
  }

  if (display.startsWith('.') || display.endsWith('.') || display.includes('..')) {
    return {
      valid: false,
      normalized,
      display,
      error: 'Username cannot start or end with a period or contain consecutive periods',
    };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return {
      valid: false,
      normalized,
      display,
      error: 'This username is reserved. Please choose a different username.',
    };
  }

  return { valid: true, normalized, display };
}

/**
 * Validates a user's private login key.
 * Rules:
 * - 8 to 128 characters
 * - Supports numbers only, letters only, symbols, combinations, or Unicode characters
 * - Must not equal the username
 */
export function validateLoginKey(
  rawKey: string,
  usernameForComparison?: string
): { valid: boolean; error?: string } {
  if (typeof rawKey !== 'string' || rawKey.length === 0) {
    return { valid: false, error: 'Login key is required' };
  }

  // Do not trim intentional leading/trailing characters in keys, but disallow whitespace-only keys
  if (rawKey.trim().length === 0) {
    return { valid: false, error: 'Login key cannot consist only of spaces' };
  }

  const charCount = Array.from(rawKey).length;
  if (charCount < 8) {
    return {
      valid: false,
      error: 'Login key must be at least 8 characters long',
    };
  }

  if (charCount > 128) {
    return {
      valid: false,
      error: 'Login key must be at most 128 characters long',
    };
  }

  if (
    usernameForComparison &&
    rawKey.trim().toLowerCase() === usernameForComparison.trim().toLowerCase()
  ) {
    return {
      valid: false,
      error: 'Your login key must not be the same as your username',
    };
  }

  return { valid: true };
}

/**
 * Evaluates login key strength for UI feedback without enforcing restrictive character classes.
 */
export function evaluateKeyStrength(key: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: 'Too short' | 'Basic' | 'Moderate' | 'Strong' | 'Very strong';
} {
  const len = Array.from(key || '').length;
  if (len < 8) return { score: 0, label: 'Too short' };

  let variety = 0;
  if (/[a-z]/.test(key)) variety++;
  if (/[A-Z]/.test(key)) variety++;
  if (/[0-9]/.test(key)) variety++;
  if (/[^a-zA-Z0-9]/.test(key)) variety++;

  const uniqueChars = new Set(Array.from(key)).size;

  if (len >= 20 && uniqueChars >= 10) return { score: 4, label: 'Very strong' };
  if (len >= 14 && (variety >= 2 || uniqueChars >= 8)) return { score: 3, label: 'Strong' };
  if (len >= 10 && uniqueChars >= 5) return { score: 2, label: 'Moderate' };
  return { score: 1, label: 'Basic' };
}

/**
 * Generates a deterministic, keyed HMAC-SHA-256 fingerprint from the exact submitted login key.
 * Used as a unique database lookup identifier so login requires ONLY the key.
 */
export function computeKeyFingerprint(loginKey: string): string {
  return crypto
    .createHmac('sha256', getFingerprintSecret())
    .update(loginKey, 'utf8')
    .digest('hex');
}

// Argon2id parameters (OWASP recommendation: m=19456 KiB (19 MiB), t=2, p=1, dkLen=32)
const ARGON2_MEMORY = Number(process.env.ARGON2_MEMORY_KIB) || 19456;
const ARGON2_TIME = Number(process.env.ARGON2_TIME_COST) || 2;
const ARGON2_PARALLELISM = 1;
const ARGON2_DKLEN = 32;

/**
 * Computes a salted Argon2id hash formatted in standard PHC format:
 * $argon2id$v=19$m=19456,t=2,p=1$<salt_b64>$<hash_b64>
 */
export async function hashLoginKey(loginKey: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = argon2id(new TextEncoder().encode(loginKey), salt, {
    t: ARGON2_TIME,
    m: ARGON2_MEMORY,
    p: ARGON2_PARALLELISM,
    dkLen: ARGON2_DKLEN,
  });

  const saltB64 = Buffer.from(salt).toString('base64url');
  const hashB64 = Buffer.from(derived).toString('base64url');
  return `$argon2id$v=19$m=${ARGON2_MEMORY},t=${ARGON2_TIME},p=${ARGON2_PARALLELISM}$${saltB64}$${hashB64}`;
}

/**
 * Verifies a login key against an Argon2id PHC string (or legacy bcrypt hash).
 * Uses constant-time comparison to prevent timing side-channel attacks.
 */
export async function verifyLoginKey(loginKey: string, storedHash: string): Promise<boolean> {
  if (!loginKey || !storedHash) return false;

  if (storedHash.startsWith('$argon2id$')) {
    try {
      const parts = storedHash.split('$');
      // Format: ['', 'argon2id', 'v=19', 'm=19456,t=2,p=1', saltB64, hashB64]
      if (parts.length !== 6) return false;

      const paramStr = parts[3];
      const saltB64 = parts[4];
      const expectedHashB64 = parts[5];

      let m = ARGON2_MEMORY;
      let t = ARGON2_TIME;
      let p = ARGON2_PARALLELISM;

      for (const kv of paramStr.split(',')) {
        const [k, v] = kv.split('=');
        if (k === 'm') m = parseInt(v, 10);
        if (k === 't') t = parseInt(v, 10);
        if (k === 'p') p = parseInt(v, 10);
      }

      const salt = Buffer.from(saltB64, 'base64url');
      const expectedHash = Buffer.from(expectedHashB64, 'base64url');

      const derived = argon2id(new TextEncoder().encode(loginKey), salt, {
        t,
        m,
        p,
        dkLen: expectedHash.length,
      });

      const actualHash = Buffer.from(derived);
      if (actualHash.length !== expectedHash.length) return false;
      return crypto.timingSafeEqual(actualHash, expectedHash);
    } catch {
      return false;
    }
  }

  // Legacy bcrypt fallback for any pre-existing accounts
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
    return bcrypt.compare(loginKey, storedHash);
  }

  return false;
}

/**
 * Performs a dummy Argon2id computation when a key fingerprint does not match any user,
 * equalizing response latency to prevent key-existence timing side-channels.
 */
export async function performDummyKeyVerification(loginKey: string): Promise<void> {
  const dummySalt = crypto
    .createHash('sha256')
    .update(`dummy-salt:${getFingerprintSecret()}`)
    .digest()
    .subarray(0, 16);

  argon2id(new TextEncoder().encode(loginKey || 'invalid-key'), dummySalt, {
    t: ARGON2_TIME,
    m: ARGON2_MEMORY,
    p: ARGON2_PARALLELISM,
    dkLen: ARGON2_DKLEN,
  });
}

// Backwards-compatible aliases
export const hashPassword = hashLoginKey;
export const verifyPassword = verifyLoginKey;

export async function createSessionToken(
  session: AuthSession,
  rememberMe: boolean = false
): Promise<string> {
  const expiration = rememberMe
    ? `${SITE_CONFIG.sessionDurationDays}d`
    : `${SITE_CONFIG.shortSessionDurationHours}h`;
  return new SignJWT({
    userId: session.userId,
    username: session.username,
    sessionVersion: session.sessionVersion ?? 1,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiration)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (!payload.userId || !payload.username) return null;
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      sessionVersion:
        typeof payload.sessionVersion === 'number' ? payload.sessionVersion : 1,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  session: AuthSession,
  rememberMe: boolean = false
): Promise<void> {
  const token = await createSessionToken(session, rememberMe);
  const cookieStore = await cookies();
  const maxAge = rememberMe
    ? SITE_CONFIG.sessionDurationDays * 24 * 60 * 60
    : SITE_CONFIG.shortSessionDurationHours * 60 * 60;

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getSession(): Promise<AuthSession | null> {
  // 1. Check Authorization header: Bearer <token>
  try {
    const headerList = await headers();
    const authHeader = headerList.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken) {
        const session = await verifySessionToken(bearerToken);
        if (session) return session;
      }
    }
  } catch {
    // ignore if headers() not accessible
  }

  // 2. Fall back to HTTP-only Cookie
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
