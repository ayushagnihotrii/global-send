import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { getStorageConfig } from '@/lib/env-config';

export async function GET(req: NextRequest) {
  // Reading request headers ensures the route is dynamically evaluated at request time
  const _clientHost = req.headers.get('host');
  let health: { ok: boolean; type: 'postgres' | 'sqlite'; latencyMs: number; error?: string } = {
    ok: false,
    type: 'postgres',
    latencyMs: 0,
    error: 'Database uninitialized',
  };
  try {
    health = await checkDatabaseHealth();
  } catch (err: any) {
    health = { ok: false, type: 'postgres' as const, latencyMs: 0, error: err?.message || 'Database error' };
  }

  let storageMode = 'unknown';
  try {
    const config = getStorageConfig();
    storageMode = config.storage.driver;
  } catch (err: any) {
    storageMode = `error: ${err.message}`;
  }

  const payload = {
    status: health.ok ? 'ok' : 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      ok: health.ok,
      type: health.type,
      latencyMs: health.latencyMs,
      ...(health.error ? { error: health.error } : {}),
    },
    storage: {
      mode: storageMode,
    },
    environment: process.env.NODE_ENV || 'development',
  };

  return NextResponse.json(payload, {
    status: health.ok ? 200 : 503,
  });
}
