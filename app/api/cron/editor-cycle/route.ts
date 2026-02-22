import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  return createClient(url, key);
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

function calculateSleepMinutes(activity: 'low' | 'medium' | 'high'): number {
  if (activity === 'high') return 5;
  if (activity === 'low') return 30;
  return 10;
}

type ActivityLevel = 'low' | 'medium' | 'high';

interface CycleSignals {
  entriesLast24h: number;
  pendingEditorMessages: number;
  pendingRlaifReviews: number;
  hoursSinceContact: number | null;
}

interface CycleDecision {
  activity: ActivityLevel;
  action: 'message' | 'maintenance';
  messageType?: 'proactive_question' | 'feedback_request';
  messageContent?: string;
  reason: string;
}

async function getActiveUsers() {
  const supabase = getSupabase();

  const { data: twins } = await supabase
    .from('twins')
    .select('user_id')
    .limit(50);

  const twinIds = (twins || []).map((t) => t.user_id).filter(Boolean);
  if (twinIds.length > 0) return twinIds;

  const { data: entries } = await supabase
    .from('entries')
    .select('user_id')
    .order('created_at', { ascending: false })
    .limit(200);

  const deduped = new Set<string>();
  for (const row of entries || []) {
    if (row.user_id && deduped.size < 50) deduped.add(row.user_id);
  }
  return [...deduped];
}

function decideActivity(signals: CycleSignals): ActivityLevel {
  if (signals.entriesLast24h >= 8 || signals.hoursSinceContact !== null && signals.hoursSinceContact < 4) {
    return 'high';
  }
  if (signals.entriesLast24h <= 1 && (signals.hoursSinceContact === null || signals.hoursSinceContact > 48)) {
    return 'low';
  }
  return 'medium';
}

function decideAction(signals: CycleSignals): CycleDecision {
  const activity = decideActivity(signals);

  if (signals.pendingRlaifReviews > 0 && signals.pendingEditorMessages === 0) {
    return {
      activity,
      action: 'message',
      messageType: 'feedback_request',
      messageContent: `you have ${signals.pendingRlaifReviews} rlaif review item${signals.pendingRlaifReviews > 1 ? 's' : ''} waiting.`,
      reason: 'pending_rlaif_reviews'
    };
  }

  if ((signals.hoursSinceContact === null || signals.hoursSinceContact > 48) && signals.pendingEditorMessages === 0) {
    return {
      activity,
      action: 'message',
      messageType: 'proactive_question',
      messageContent: 'quick check-in: any new thoughts, voice notes, or decisions worth capturing today?',
      reason: 'idle_contact'
    };
  }

  return {
    activity,
    action: 'maintenance',
    reason: signals.pendingEditorMessages > 0 ? 'pending_messages_already_exist' : 'normal_background_cycle'
  };
}

async function collectSignals(userId: string, now: Date): Promise<CycleSignals> {
  const supabase = getSupabase();

  const [{ count: entriesLast24h }, { count: pendingEditorMessages }, { count: pendingRlaifReviews }, { data: state }] = await Promise.all([
    supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from('editor_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('delivered', false),
    supabase
      .from('rlaif_evaluations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('routing', 'author_review')
      .is('author_verdict', null),
    supabase
      .from('editor_state')
      .select('last_contact_at')
      .eq('user_id', userId)
      .single()
  ]);

  const lastContact = state?.last_contact_at ? new Date(state.last_contact_at) : null;
  const hoursSinceContact = lastContact ? (now.getTime() - lastContact.getTime()) / 1000 / 3600 : null;

  return {
    entriesLast24h: entriesLast24h || 0,
    pendingEditorMessages: pendingEditorMessages || 0,
    pendingRlaifReviews: pendingRlaifReviews || 0,
    hoursSinceContact
  };
}

async function runCycle() {
  const supabase = getSupabase();
  const userIds = await getActiveUsers();
  const now = new Date();

  let processed = 0;
  for (const userId of userIds) {
    const { data: existing } = await supabase
      .from('editor_state')
      .select('activity_level, cycle_count')
      .eq('user_id', userId)
      .single();

    const signals = await collectSignals(userId, now);
    const decision = decideAction(signals);
    const sleepMinutes = calculateSleepMinutes(decision.activity);
    const nextCycle = new Date(now.getTime() + sleepMinutes * 60_000);

    await supabase
      .from('editor_state')
      .upsert({
        user_id: userId,
        last_cycle_at: now.toISOString(),
        activity_level: decision.activity,
        sleep_duration_minutes: sleepMinutes,
        next_cycle_at: nextCycle.toISOString(),
        cycle_count: (existing?.cycle_count || 0) + 1,
        metadata: {
          signals,
          decision,
          decidedAt: now.toISOString()
        },
        updated_at: now.toISOString()
      }, { onConflict: 'user_id' });

    if (decision.action === 'message' && decision.messageType && decision.messageContent) {
      await supabase.from('editor_messages').insert({
        user_id: userId,
        content: decision.messageContent,
        message_type: decision.messageType,
        priority: decision.messageType === 'feedback_request' ? 'medium' : 'low',
        metadata: {
          source: 'cron-editor-cycle',
          reason: decision.reason,
          generatedAt: now.toISOString(),
          signals
        }
      });
    }

    await supabase.from('persona_activity').insert({
      user_id: userId,
      action_type: 'editor_cycle_decision',
      summary: `Editor cycle: ${decision.action} (${decision.reason})`,
      details: {
        decision,
        signals,
        sleepMinutes
      },
      requires_attention: false
    });

    if (decision.action === 'message') {
      await supabase.from('persona_activity').insert({
        user_id: userId,
        action_type: 'editor_proactive_message_enqueued',
        summary: `Editor queued ${decision.messageType}`,
        details: { reason: decision.reason, messageType: decision.messageType },
        requires_attention: false
      });
    }

    processed += 1;
  }

  return {
    processedUsers: processed,
    totalUsers: userIds.length,
    timestamp: now.toISOString()
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const result = await runCycle();
    return NextResponse.json({ success: true, ...result });
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
