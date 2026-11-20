import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createReport, listReports, getUserById } from '@/lib/db';
import { checkRateLimit, getRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const reportSchema = z.object({
  targetType: z.enum(['share', 'file', 'user']),
  targetId: z.string().min(1, 'Target ID or link is required'),
  reason: z.enum(['copyright', 'malware', 'illegal', 'harassment', 'other']),
  details: z.string().max(2000).optional().nullable(),
  reporterEmail: z.string().email().optional().nullable().or(z.literal('')),
});

export async function POST(req: NextRequest) {
  // Rate limit: 5 reports per 10 minutes per IP
  const rateLimit = checkRateLimit(req, {
    maxRequests: 5,
    windowMs: 600000,
    prefix: 'report',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many reports submitted. Please wait before submitting another report.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await req.json();
    const parsed = reportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input data' },
        { status: 400, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { targetType, targetId, reason, details, reporterEmail } = parsed.data;
    const clientIp = getClientIp(req);

    // Normalize targetId if a full URL was pasted
    let cleanTargetId = targetId.trim();
    if (cleanTargetId.includes('/s/')) {
      const match = cleanTargetId.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        cleanTargetId = match[1];
      }
    }

    const report = await createReport({
      targetType,
      targetId: cleanTargetId,
      reason,
      details: details || null,
      reporterEmail: reporterEmail || null,
      reporterIp: clientIp,
    });

    return NextResponse.json(
      {
        success: true,
        reportId: report.id,
        message: 'Report submitted successfully. Our trust & safety team investigates all reports promptly.',
      },
      { status: 201, headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (err: any) {
    console.error('Error creating abuse report:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to submit report. Please try again later.' },
      { status: 500, headers: getRateLimitHeaders(rateLimit) }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.userId);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const reports = await listReports({ status, limit });
    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    console.error('Error listing abuse reports:', err?.message || err);
    return NextResponse.json(
      { error: 'Failed to retrieve abuse reports' },
      { status: 500 }
    );
  }
}
