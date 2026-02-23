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

async function postJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

async function patchJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

async function getJson(url: string) {
  const res = await fetch(url);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
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

    const actions = {
      rlaifBulkApprove: await postJson(`${baseUrl}/api/rlaif/review`, {
        action: 'bulk_approve',
        userId,
        limit: 100,
        includeFlagged: false
      }),
      resolveHighImpact: await patchJson(`${baseUrl}/api/blueprint/proposals`, {
        action: 'bulk_resolve_high_impact',
        userId,
        status: 'rejected',
        reviewNotes: 'bulk resolved from machine blocker resolver'
      }),
      drainEditorMessages: await postJson(`${baseUrl}/api/machine/drain-editor-messages`, {
        userId,
        markStaleIfNoBindings: true,
        staleHours: 72
      }),
      recoverChannels: await postJson(`${baseUrl}/api/machine/recover-channels`, {
        userId,
        requeueDeadLetters: true,
        deadLetterLimit: 50
      })
    };

    const status = await getJson(`${baseUrl}/api/machine/status?userId=${encodeURIComponent(userId)}`);
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
