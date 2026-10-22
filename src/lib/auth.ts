import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies, headers } from 'next/headers';
import crypto from 'crypto';
import { AuthSession } from './types';
import { SITE_CONFIG } from '@/config/site';

const COOKIE_NAME = 'qv_session';
const DEFAULT_SECRET = 'quickvault-local-dev-secret-key-change-in-production-min32chars';
const SECRET_KEY = new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_SECRET);

// In-memory rate limiting map for auth attempts (IP or username based)
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

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateRecoveryCode(): { plain: string; hash: Promise<string> } {
  // Format: QV-XXXX-XXXX-XXXX
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const plain = `QV-${part1}-${part2}-${part3}`;
  return {
    plain,
    hash: hashPassword(plain),
  };
}

export async function createSessionToken(session: AuthSession, rememberMe: boolean = true): Promise<string> {
  const expiration = rememberMe ? `${SITE_CONFIG.sessionDurationDays}d` : `${SITE_CONFIG.shortSessionDurationHours}h`;
  return new SignJWT({ userId: session.userId, username: session.username })
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
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: AuthSession, rememberMe: boolean = true): Promise<void> {
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
  // 1. Check Authorization header: Bearer <token> (used by mobile apps and API clients)
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

  // 2. Fall back to HTTP-only Cookie (used by web browsers)
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}
