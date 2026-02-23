import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  includeChannels: z.boolean().optional().default(false),
  resolveBlockers: z.boolean().optional().default(false)
});

function getBaseUrl(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return request.nextUrl.origin;
}

async function requestJson(
  method: 'GET' | 'POST',
  url: string,
  payload?: Record<string, unknown>,
  timeoutMs = 20000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data, elapsedMs: Date.now() - startedAt, timedOut: false };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: timedOut ? 408 : 500,
      data: { error: timedOut ? `Timed out after ${timeoutMs}ms` : (error instanceof Error ? error.message : 'Unknown error') },
      elapsedMs: Date.now() - startedAt,
      timedOut
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, includeChannels, resolveBlockers } = parsed.data;
    const baseUrl = getBaseUrl(request);
    const startedAt = Date.now();

    const bootstrap = await requestJson('POST', `${baseUrl}/api/machine/bootstrap`, { userId }, 12000);
    const cycle = await requestJson(
      'POST',
      `${baseUrl}/api/cron/machine-cycle?userId=${encodeURIComponent(userId)}${includeChannels ? '&includeChannels=1' : ''}`,
      {},
      35000
    );
    const blockers = resolveBlockers
      ? await requestJson('POST', `${baseUrl}/api/machine/resolve-blockers`, { userId }, 30000)
      : null;
    const status = await requestJson('GET', `${baseUrl}/api/machine/status?userId=${encodeURIComponent(userId)}`, undefined, 12000);
    const cycleBody = (cycle.data as { success?: boolean } | null) || null;
    const statusBody = (status.data as { success?: boolean } | null) || null;
    const blockersOk = blockers ? blockers.ok : true;
    const success = bootstrap.ok && cycle.ok && blockersOk && status.ok && cycleBody?.success !== false && statusBody?.success !== false;

    return NextResponse.json({
      success,
      elapsedMs: Date.now() - startedAt,
      steps: {
        bootstrap,
        cycle,
        blockers,
        status
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
