import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

function getBaseUrl(request: NextRequest): string {
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return request.nextUrl.origin;
}

async function runEndpoint(baseUrl: string, path: string, authHeader?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  const startedAt = Date.now();
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: authHeader ? { authorization: authHeader } : undefined,
    signal: controller.signal
  }).finally(() => clearTimeout(timeout));
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return {
    path,
    ok: res.ok,
    status: res.status,
    elapsedMs: Date.now() - startedAt,
    body
  };
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function hasStepFailure(step: { ok: boolean; body: unknown }): boolean {
  if (!step.ok) return true;
  if (typeof step.body !== 'object' || step.body === null) {
    return false;
  }

  const body = step.body as { success?: boolean; failed?: number; results?: Array<{ action?: string }> };
  if (body.success === false) return true;
  if (typeof body.failed === 'number' && body.failed > 0) return true;
  if (
    Array.isArray(body.results) &&
    body.results.some(
      (item) =>
        item.action === 'training_failed' ||
        item.action === 'training_error' ||
        item.action === 'constitution_failed'
    )
  ) {
    return true;
  }

  return false;
}

async function maybeQueueBlueprintProposal(userId: string | null, results: Array<{ path: string; ok: boolean; status: number; elapsedMs: number | null; body: unknown }>) {
  if (!userId) return null;
  const failed = results.filter((step) => hasStepFailure(step));
  if (failed.length === 0) return null;
  const nonChannelFailed = failed.filter((step) => !step.path.startsWith('/api/cron/channel-'));
  // Channel transport failures are common operational noise and should be handled by channel recovery flows.
  if (nonChannelFailed.length === 0) return null;
  const supabase = getSupabase();
  if (!supabase) return null;

  // Avoid proposal spam: only one queued machine-cycle proposal in the last hour.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('blueprint_proposals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'machine-cycle')
    .eq('status', 'queued')
    .gte('created_at', oneHourAgo);
  if ((count || 0) > 0) return null;

  const proposal = {
    user_id: userId,
    source: 'machine-cycle',
    proposal_type: 'policy',
    title: `machine cycle failures (${nonChannelFailed.length} step${nonChannelFailed.length > 1 ? 's' : ''})`,
    rationale: 'At least one loop step failed or returned success:false. Review evidence and adjust blueprint policy/config.',
    evidence: {
      failedSteps: failed,
      generatedAt: new Date().toISOString()
    },
    proposal: {
      recommendedActions: [
        'Inspect failing step payloads',
        'Adjust loop order/timeouts/retry policy',
        'Promote chronic failures to dedicated remediation tasks'
      ]
    },
    impact_level: 'high',
    status: 'queued'
  };

  const { data } = await supabase.from('blueprint_proposals').insert(proposal).select('id').maybeSingle();
  return data?.id || null;
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getBaseUrl(request);
    const defaultUserId = process.env.MACHINE_USER_ID || null;
    const userId = request.nextUrl.searchParams.get('userId') || defaultUserId;
    const includeChannelsDefault = process.env.MACHINE_INCLUDE_CHANNELS === '1';
    const includeChannels = request.nextUrl.searchParams.get('includeChannels')
      ? request.nextUrl.searchParams.get('includeChannels') === '1'
      : includeChannelsDefault;
    const secret = process.env.CRON_SECRET;
    const authHeader = secret ? `Bearer ${secret}` : undefined;

    const scoped = (path: string) => (userId && path !== '/api/process-queue')
      ? `${path}?userId=${encodeURIComponent(userId)}`
      : path;
    const coreSteps = [
      scoped('/api/process-queue'),
      scoped('/api/cron/editor-cycle'),
      scoped('/api/cron/constitution-refresh'),
      scoped('/api/cron/auto-train')
    ];
    const channelSteps = [
      scoped('/api/cron/channel-flush'),
      scoped('/api/cron/channel-retry')
    ];
    const steps = includeChannels ? [...coreSteps, ...channelSteps] : coreSteps;

    const results = await Promise.all(
      steps.map(async (path) => {
        try {
          return await runEndpoint(baseUrl, path, authHeader);
        } catch (error) {
          return {
            path,
            ok: false,
            status: error instanceof Error && error.name === 'AbortError' ? 408 : 500,
            elapsedMs: null as number | null,
            body: { error: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      })
    );

    const proposalId = await maybeQueueBlueprintProposal(userId, results);

    return NextResponse.json({
      success: !results.some((step) => hasStepFailure(step)),
      ranAt: new Date().toISOString(),
      includeChannels,
      results,
      proposalId
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
