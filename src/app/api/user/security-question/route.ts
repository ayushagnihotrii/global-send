import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, verifyLoginKey, validateSecurityQuestion, validateSecurityAnswer, hashSecurityAnswer } from '@/lib/auth';
import { getRawUserById, updateUserSecurityQuestion } from '@/lib/db';

const securityQuestionSchema = z.object({
  currentKey: z.string().optional(),
  question: z.string().min(1, 'Security question is required'),
  answer: z.string().min(1, 'Security answer is required'),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawUser = await getRawUserById(session.userId);
  if (!rawUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    hasSecurityQuestion: Boolean(rawUser.security_question && rawUser.security_answer_hash),
    securityQuestionUpdatedAt: rawUser.security_updated_at || null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawUser = await getRawUserById(session.userId);
    if (!rawUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = securityQuestionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const { currentKey, question, answer } = parseResult.data;

    // If a security question is already set, require and verify the current login key
    const hasExistingQuestion = Boolean(rawUser.security_question && rawUser.security_answer_hash);
    if (hasExistingQuestion) {
      if (!currentKey) {
        return NextResponse.json(
          { error: 'Current login key is required to update your security question.' },
          { status: 400 }
        );
      }

      const isKeyCorrect = await verifyLoginKey(currentKey, rawUser.password_hash);
      if (!isKeyCorrect) {
        return NextResponse.json(
          { error: 'Current login key is incorrect.' },
          { status: 400 }
        );
      }
    }

    // Validate security question
    const questionCheck = validateSecurityQuestion(question);
    if (!questionCheck.valid) {
      return NextResponse.json(
        { error: questionCheck.error || 'Invalid security question' },
        { status: 400 }
      );
    }

    // Validate security answer (must not equal username or current key)
    const answerCheck = validateSecurityAnswer(
      answer,
      rawUser.username,
      currentKey || undefined
    );
    if (!answerCheck.valid) {
      return NextResponse.json(
        { error: answerCheck.error || 'Invalid security answer' },
        { status: 400 }
      );
    }

    // Hash answer with salted Argon2id (never store plaintext)
    const answerHash = await hashSecurityAnswer(answerCheck.normalized);

    await updateUserSecurityQuestion(session.userId, questionCheck.question, answerHash);

    return NextResponse.json({
      success: true,
      message: 'Security question updated successfully.',
    });
  } catch (err: any) {
    console.error('[Global Send Security Question Error]:', err?.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Failed to update security question' },
      { status: 500 }
    );
  }
}
