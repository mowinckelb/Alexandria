import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  userId: z.string().uuid(),
  includeChannels: z.boolean().optional().default(false)
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
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function getJson(url: string) {
  const res = await fetch(url);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 });
    }

    const { userId, includeChannels } = parsed.data;
    const baseUrl = getBaseUrl(request);
    const startedAt = Date.now();

    const bootstrap = await postJson(`${baseUrl}/api/machine/bootstrap`, { userId });
    const cycle = await postJson(
      `${baseUrl}/api/cron/machine-cycle?userId=${encodeURIComponent(userId)}${includeChannels ? '&includeChannels=1' : ''}`,
      {}
    );
    const status = await getJson(`${baseUrl}/api/machine/status?userId=${encodeURIComponent(userId)}`);

    return NextResponse.json({
      success: bootstrap.ok && cycle.ok && status.ok,
      elapsedMs: Date.now() - startedAt,
      steps: {
        bootstrap,
        cycle,
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
