import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * POST /api/bulk-ingest
 * Stores raw text as axiomatic data. Responds immediately.
 * The Editor picks up unprocessed entries in its cron cycle and
 * works through them gradually — like a human editor receiving manuscripts.
 */
export async function POST(req: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { text, userId, source = 'bulk-import' } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Store raw text — axiomatic data, never lost
    const { error: entryError } = await supabase.from('entries').insert({
      user_id: userId,
      content: text,
      source,
      metadata: {
        editor_processed: false,
        original_length: text.length,
        ingested_at: new Date().toISOString(),
      }
    });

    if (entryError) {
      console.error('[Bulk Ingest] Failed to store entry:', entryError);
      return NextResponse.json({ error: 'Failed to store data' }, { status: 500 });
    }

    console.log(`[Bulk Ingest] Stored ${text.length} chars for user ${userId}. Editor will process async.`);

    return NextResponse.json({
      success: true,
      message: 'received. the editor will work through this gradually.',
      length: text.length,
    });
  } catch (error) {
    console.error('[Bulk Ingest] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
