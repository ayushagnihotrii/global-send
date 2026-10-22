import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';
import { getStorageConfig } from '@/lib/env-config';

export async function GET(req: NextRequest) {
  // Reading request headers ensures the route is dynamically evaluated at request time
  const _clientHost = req.headers.get('host');
  const health = await checkDatabaseHealth();
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
