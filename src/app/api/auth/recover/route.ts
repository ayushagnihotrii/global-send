import { NextResponse } from 'next/server';

/**
 * Legacy recovery route.
 * Global Send key recovery is now handled via:
 * - POST /api/auth/recovery/question (retrieves security question)
 * - POST /api/auth/recovery/reset (verifies answer and updates key)
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'This legacy endpoint has been deprecated. Please use POST /api/auth/recovery/question and POST /api/auth/recovery/reset.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error:
        'This legacy endpoint has been deprecated. Please use POST /api/auth/recovery/question and POST /api/auth/recovery/reset.',
    },
    { status: 410 }
  );
}
