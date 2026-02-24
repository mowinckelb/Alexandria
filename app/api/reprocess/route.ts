import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * POST /api/reprocess
 * Resets editor_processed flag on all entries for a user,
 * so the Editor re-processes everything on its next cycles.
 * Useful when models improve and can extract more signal.
 */
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Count entries first
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Reset all entries to unprocessed
    const { error } = await supabase
      .from('entries')
      .update({
        metadata: {
          editor_processed: false,
          reprocess_requested_at: new Date().toISOString(),
        }
      })
      .eq('user_id', userId);

    if (error) {
      console.error('[Reprocess] Failed:', error);
      return NextResponse.json({ error: 'Failed to reset entries' }, { status: 500 });
    }

    console.log(`[Reprocess] Reset ${count} entries for user ${userId}`);

    return NextResponse.json({
      success: true,
      entriesReset: count || 0,
      message: `${count || 0} entries queued for re-processing. the editor will work through them gradually.`,
    });
  } catch (error) {
    console.error('[Reprocess] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
