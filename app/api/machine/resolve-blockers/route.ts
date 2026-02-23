import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid()
});

function getBaseUrl(request: NextRequest): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) return appUrl;
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return request.nextUrl.origin;
}

async function requestJson(
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  payload?: Record<string, unknown>,
  timeoutMs = 15000
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
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { ok: res.ok, status: res.status, body, elapsedMs: Date.now() - startedAt, timedOut: false };
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: timedOut ? 408 : 500,
      body: { error: timedOut ? `Timed out after ${timeoutMs}ms` : (error instanceof Error ? error.message : 'Unknown error') },
      elapsedMs: Date.now() - startedAt,
      timedOut
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = BodySchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: 'Invalid request', details: payload.error.issues }, { status: 400 });
    }

    const { userId } = payload.data;
    const baseUrl = getBaseUrl(request);
    const startedAt = Date.now();

    const [rlaifBulkApprove, resolveHighImpact, drainEditorMessages, recoverChannels] = await Promise.all([
      requestJson('POST', `${baseUrl}/api/rlaif/review`, {
        action: 'bulk_approve',
        userId,
        limit: 100,
        includeFlagged: false
      }),
      requestJson('PATCH', `${baseUrl}/api/blueprint/proposals`, {
        action: 'bulk_resolve_high_impact',
        userId,
        status: 'rejected',
        reviewNotes: 'bulk resolved from machine blocker resolver'
      }),
      requestJson('POST', `${baseUrl}/api/machine/drain-editor-messages`, {
        userId,
        markStaleIfNoBindings: true,
        staleHours: 72
      }),
      requestJson('POST', `${baseUrl}/api/machine/recover-channels`, {
        userId,
        requeueDeadLetters: true,
        deadLetterLimit: 50
      })
    ]);

    const actions = {
      rlaifBulkApprove,
      resolveHighImpact,
      drainEditorMessages,
      recoverChannels
    };

    const status = await requestJson('GET', `${baseUrl}/api/machine/status?userId=${encodeURIComponent(userId)}`, undefined, 12000);
    const ok = Object.values(actions).every((step) => step.ok) && status.ok;

    return NextResponse.json({
      success: ok,
      elapsedMs: Date.now() - startedAt,
      actions,
      status
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
