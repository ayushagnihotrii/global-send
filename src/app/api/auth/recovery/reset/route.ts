import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getUserByUsername,
  recordFailedRecoveryAttempt,
  resetUserKeyViaRecovery,
  checkPersistentRateLimit,
} from '@/lib/db';
import {
  validateUsername,
  validateLoginKey,
  validateSecurityAnswer,
  normalizeSecurityAnswer,
  verifySecurityAnswer,
  performDummyAnswerVerification,
  hashLoginKey,
} from '@/lib/auth';

const GENERIC_RECOVERY_ERROR = 'Recovery failed. Invalid recovery answer or username.';
const ACCOUNT_LOCKED_ERROR = 'Too many failed recovery attempts. Account recovery is temporarily locked. Please try again later.';

const resetInputSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  answer: z.string().min(1, 'Security answer is required'),
  newKey: z.string().min(1, 'New login key is required'),
  confirmKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';

    // 1. Persistent IP-based rate limiting on recovery endpoints
    const ipAllowed = await checkPersistentRateLimit(`recovery_ip_${ip}`, 15, 60000);
    if (!ipAllowed) {
      return NextResponse.json(
        { error: 'Too many recovery attempts. Please wait a minute and try again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = resetInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid recovery request.' },
        { status: 400 }
      );
    }

    const { username, answer, newKey, confirmKey } = parseResult.data;

    // Optional confirmation check
    if (confirmKey !== undefined && confirmKey !== newKey) {
      return NextResponse.json(
        { error: 'New login key and confirmation do not match.' },
        { status: 400 }
      );
    }

    const usernameValidation = validateUsername(username);
    const normalizedUsername = usernameValidation.normalized;

    // Validate new key rules (8-128 chars, must not equal username)
    const keyCheck = validateLoginKey(newKey, usernameValidation.display);
    if (!keyCheck.valid) {
      return NextResponse.json(
        { error: keyCheck.error || 'Invalid new login key' },
        { status: 400 }
      );
    }

    // Validate answer format and that answer != newKey and answer != username
    const answerCheck = validateSecurityAnswer(answer, usernameValidation.display, newKey);
    if (!answerCheck.valid) {
      return NextResponse.json(
        { error: answerCheck.error || 'Invalid security answer' },
        { status: 400 }
      );
    }

    const normalizedAnswer = normalizeSecurityAnswer(answer);

    // Look up user by normalized username
    const user = await getUserByUsername(normalizedUsername);

    // If user does not exist, run dummy verification to equalize timing, then fail generically
    if (!user) {
      await performDummyAnswerVerification(normalizedAnswer);
      return NextResponse.json({ error: GENERIC_RECOVERY_ERROR }, { status: 400 });
    }

    // Check account-level lockout: enforced across all sessions, devices, and IPs
    if (user.recovery_locked_until && new Date(user.recovery_locked_until).getTime() > Date.now()) {
      return NextResponse.json({ error: ACCOUNT_LOCKED_ERROR }, { status: 429 });
    }

    // If account has no security answer set, equalize timing and fail generically
    if (!user.security_answer_hash) {
      await performDummyAnswerVerification(normalizedAnswer);
      return NextResponse.json({ error: GENERIC_RECOVERY_ERROR }, { status: 400 });
    }

    // Verify security answer with constant-time comparison
    const isAnswerCorrect = await verifySecurityAnswer(normalizedAnswer, user.security_answer_hash);

    if (!isAnswerCorrect) {
      const { lockedUntil } = await recordFailedRecoveryAttempt(
        user.id,
        user.recovery_failed_attempts || 0
      );

      if (lockedUntil) {
        return NextResponse.json({ error: ACCOUNT_LOCKED_ERROR }, { status: 429 });
      }

      return NextResponse.json({ error: GENERIC_RECOVERY_ERROR }, { status: 400 });
    }

    // On successful verification:
    // 1. Hash the new key with Argon2id
    const newKeyHash = await hashLoginKey(newKey);

    // 2. Atomically update password_hash, increment session_version (invalidates all active sessions),
    //    reset recovery counters, and record key_reset_at timestamp
    await resetUserKeyViaRecovery(user.id, newKeyHash);

    // 3. Require a fresh login: do NOT auto-login or create session cookies
    return NextResponse.json({
      success: true,
      message: 'Your login key has been reset successfully. Please sign in with your new key.',
    });
  } catch (err: any) {
    console.error('[Global Send Recovery Reset Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to reset login key. Please try again.' },
      { status: 500 }
    );
  }
}
