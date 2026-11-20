import { NextRequest } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window store with automatic expiration cleanup
const memoryStore = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically
let cleanupTimer: NodeJS.Timeout | null = null;
function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 60000);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  prefix?: string;
  customKey?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

/**
 * Checks and increments rate limit for an incoming request.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  ensureCleanupTimer();

  const maxRequests = options.maxRequests ?? 60; // 60 requests
  const windowMs = options.windowMs ?? 60000;    // per 1 minute
  const prefix = options.prefix ?? 'api';
  const ip = options.customKey ?? getClientIp(req);
  const key = `${prefix}:${ip}`;

  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    // New rate window
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
    };
  }

  // Existing window
  record.count += 1;
  const remaining = Math.max(0, maxRequests - record.count);
  const resetSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));

  if (record.count > maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds,
    };
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining,
    resetSeconds,
  };
}

/**
 * Creates standard RateLimit response headers.
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetSeconds),
  };
}
