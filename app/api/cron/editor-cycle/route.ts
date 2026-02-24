import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateText } from 'ai';
import { getQualityModel } from '@/lib/models';
import { getEditor } from '@/lib/factory';

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

interface ContextualMessageResult {
  content: string;
  context: {
    recentEntries: Array<{ created_at: string; content: string }>;
    recentDeliveredMessages: Array<{ created_at: string; content: string }>;
  } | null;
}

async function getActiveUsers() {
  const supabase = getSupabase();
  const deduped = new Set<string>();

  const [twins, editorState, systemConfigs, entries] = await Promise.all([
    supabase.from('twins').select('user_id').limit(100),
    supabase.from('editor_state').select('user_id').order('updated_at', { ascending: false }).limit(100),
    supabase.from('system_configs').select('user_id').order('updated_at', { ascending: false }).limit(100),
    supabase.from('entries').select('user_id').order('created_at', { ascending: false }).limit(200)
  ]);

  for (const row of twins.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of editorState.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of systemConfigs.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }
  for (const row of entries.data || []) {
    if (row.user_id && deduped.size < 100) deduped.add(row.user_id);
  }

  return [...deduped];
}

function decideActivity(signals: CycleSignals): ActivityLevel {
  if (signals.entriesLast24h >= 8 || signals.hoursSinceContact !== null && signals.hoursSinceContact < 4) {
    return 'high';
  }
  if (signals.entriesLast24h <= 1 && (signals.hoursSinceContact === null || signals.hoursSinceContact > 24)) {
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

  if ((signals.hoursSinceContact === null || signals.hoursSinceContact > 24) && signals.pendingEditorMessages === 0) {
    return {
      activity,
      action: 'message',
      messageType: 'proactive_question',
      messageContent: 'quick check-in: any new thoughts, voice notes, or decisions worth capturing today?',
      reason: signals.entriesLast24h > 0 ? 'new_data_no_contact' : 'idle_contact'
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

async function buildContextualProactiveMessage(userId: string): Promise<ContextualMessageResult> {
  const supabase = getSupabase();
  const fallback = 'been thinking about something you said — text me when you get a sec.';

  try {
    const [{ data: entries }, { data: deliveredMessages }, { data: notepad }, { data: constitution }] = await Promise.all([
      supabase
        .from('entries')
        .select('content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('editor_messages')
        .select('content, created_at')
        .eq('user_id', userId)
        .eq('delivered', true)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('editor_notes')
        .select('content, type')
        .eq('user_id', userId)
        .in('type', ['gap', 'observation', 'mental_model'])
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('active_constitutions')
        .select('constitution_id, constitutions(sections)')
        .eq('user_id', userId)
        .maybeSingle()
    ]);

    const recentEntries = (entries || []).map((entry) => ({
      created_at: entry.created_at,
      content: String(entry.content || '').slice(0, 400)
    }));
    const recentDeliveredMessages = (deliveredMessages || []).map((item) => ({
      created_at: item.created_at,
      content: String(item.content || '').slice(0, 200)
    }));

    if (recentEntries.length === 0) {
      return { content: fallback, context: null };
    }

    const gaps = (notepad || []).filter(n => n.type === 'gap').map(n => n.content).slice(0, 3);
    const observations = (notepad || []).filter(n => n.type === 'observation').map(n => n.content).slice(0, 3);

    const sections = (constitution as Record<string, unknown>)?.constitutions
      ? ((constitution as Record<string, unknown>).constitutions as Record<string, unknown>)?.sections
      : null;
    const constitutionHint = sections
      ? `Author's core values (from Constitution): ${JSON.stringify(sections).slice(0, 500)}`
      : 'No Constitution yet.';

    const { text } = await generateText({
      model: getQualityModel(),
      system: `You are the Editor — a biographer who has been working closely with this Author. You know them. You're not a notification system or a form.

Your job: write a proactive message that makes the Author want to text you back. This is the only thing that matters. If they ignore it, you failed.

PERSONALITY:
- Lowercase, casual — like texting a sharp friend.
- Be specific. Reference something concrete they said or did recently.
- Be interesting. Ask a question they'd actually enjoy thinking about, or make an observation that surprises them.
- Humour works if it's calibrated to them. Don't force it.
- You can be provocative, curious, warm — read the room from what you know about them.
- NEVER sound like a chatbot ("just checking in!", "how are you doing today?", "any updates?"). That is death.

FORMAT:
- 1-2 sentences max.
- No emojis, no markdown, no greetings.
- Ask one question OR make one observation that invites a response.`,
      prompt: `WHAT YOU KNOW ABOUT THE AUTHOR:
${constitutionHint}

YOUR NOTEPAD GAPS (things you still want to understand):
${gaps.length > 0 ? gaps.join('\n') : 'none yet'}

YOUR OBSERVATIONS:
${observations.length > 0 ? observations.join('\n') : 'none yet'}

RECENT ENTRIES (what the Author has been sharing):
${recentEntries.map((entry, idx) => `${idx + 1}. ${entry.created_at}: ${entry.content}`).join('\n')}

PREVIOUS MESSAGES YOU SENT (don't repeat yourself):
${recentDeliveredMessages.length > 0 ? recentDeliveredMessages.map((msg, idx) => `${idx + 1}. ${msg.content}`).join('\n') : 'none yet — this is your first outreach'}

Write one proactive message now.`
    });

    const cleaned = text.trim().replace(/\s+/g, ' ').slice(0, 280);
    return {
      content: cleaned || fallback,
      context: {
        recentEntries,
        recentDeliveredMessages
      }
    };
  } catch {
    return { content: fallback, context: null };
  }
}

async function runCycle(targetUserId?: string) {
  const supabase = getSupabase();
  const userIds = targetUserId ? [targetUserId] : await getActiveUsers();
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
      let content = decision.messageContent;
      let contextualSource: ContextualMessageResult['context'] = null;

      if (decision.messageType === 'proactive_question') {
        const contextual = await buildContextualProactiveMessage(userId);
        content = contextual.content;
        contextualSource = contextual.context;
      }

      await supabase.from('editor_messages').insert({
        user_id: userId,
        content,
        message_type: decision.messageType,
        priority: decision.messageType === 'feedback_request' ? 'medium' : 'low',
        metadata: {
          source: 'cron-editor-cycle',
          reason: decision.reason,
          generatedAt: now.toISOString(),
          signals,
          context: contextualSource
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

    // Process one unprocessed entry per cycle (async editor work)
    try {
      const { data: unprocessed } = await supabase
        .from('entries')
        .select('id, content, user_id')
        .eq('user_id', userId)
        .or('metadata->>editor_processed.is.null,metadata->>editor_processed.eq.false')
        .order('created_at', { ascending: true })
        .limit(1);

      if (unprocessed && unprocessed.length > 0) {
        const entry = unprocessed[0];
        const editor = getEditor();
        const entryResult = await editor.processEntry(entry.id, userId, entry.content || '');
        console.log(`[Editor Cycle] Processed entry ${entry.id} for ${userId}: ${entryResult.memoriesStored}m, ${entryResult.trainingPairsCreated}tp, ${entryResult.notesAdded}n`);

        await supabase.from('persona_activity').insert({
          user_id: userId,
          action_type: 'editor_entry_processed',
          summary: `processed entry: ${entryResult.memoriesStored} memories, ${entryResult.trainingPairsCreated} training pairs, ${entryResult.notesAdded} notes`,
          details: { entryId: entry.id, entryResult },
          requires_attention: false,
        });
      }
    } catch (entryErr) {
      console.error(`[Editor Cycle] Entry processing failed for ${userId}:`, entryErr);
      try {
        await supabase.from('persona_activity').insert({
          user_id: userId,
          action_type: 'editor_entry_failed',
          summary: `entry processing failed: ${entryErr instanceof Error ? entryErr.message : 'unknown'}`,
          details: { error: entryErr instanceof Error ? entryErr.message : String(entryErr) },
          requires_attention: true,
        });
      } catch {}
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
    const targetUserId = request.nextUrl.searchParams.get('userId') || undefined;
    const result = await runCycle(targetUserId);
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
