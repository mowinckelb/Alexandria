import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getChannelAdapter } from '@/lib/channels';

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

export async function POST(request: NextRequest) {
  try {
    if (!authorizeCron(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const { data: failedRows, error } = await supabase
      .from('channel_messages')
      .select('*')
      .eq('direction', 'outbound')
      .eq('status', 'failed')
      .order('updated_at', { ascending: true })
      .limit(25);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let retried = 0;
    let succeeded = 0;
    let skipped = 0;

    for (const row of failedRows || []) {
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      const attempts = Number(metadata.retryAttempts || 0);
      if (attempts >= 3) {
        skipped += 1;
        continue;
      }

      retried += 1;
      await supabase
        .from('channel_messages')
        .update({
          status: 'processing',
          metadata: {
            ...metadata,
            retryAttempts: attempts + 1,
            lastRetryAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', row.id);

      try {
        const adapter = getChannelAdapter(row.channel);
        const result = await adapter.send({
          channel: row.channel,
          userId: row.user_id,
          externalContactId: row.external_contact_id,
          text: row.content,
          audience: row.audience
        });

        await supabase
          .from('channel_messages')
          .update({
            status: result.success ? 'sent' : 'failed',
            external_message_id: result.providerMessageId || row.external_message_id,
            error: result.error || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);

        if (result.success) succeeded += 1;
      } catch (retryError) {
        await supabase
          .from('channel_messages')
          .update({
            status: 'failed',
            error: retryError instanceof Error ? retryError.message : 'Retry failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', row.id);
      }
    }

    return NextResponse.json({
      success: true,
      scanned: (failedRows || []).length,
      retried,
      succeeded,
      skipped
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
