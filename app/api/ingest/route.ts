import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools } from '@/lib/factory';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { refiner, extractor, indexer } = getIngestionTools();

export async function POST(req: Request) {
  try {
    const { text, userId } = await req.json();

    const results = {
      facts_indexed: 0,
      training_pairs_saved: 0,
      errors: [] as string[]
    };

    // 1. Save Raw Entry
    let entryId: string | null = null;
    const { data } = await supabase
      .from('entries')
      .insert({ user_id: userId, content: text })
      .select('id')
      .single();
    entryId = data?.id || null;

    // 2. Objective Path - Extract and index facts
    try {
      const structure = await extractor.structure(text);
      for (const fact of structure.facts) {
        await indexer.ingest(fact, userId, { 
          entities: structure.entities, 
          importance: structure.importance 
        });
        results.facts_indexed++;
      }
    } catch (e) {
      results.errors.push(`Extraction: ${e}`);
    }

    // 3. Subjective Path - Save training pairs
    try {
      const pairs = await refiner.extractStyle(text);
      if (pairs.length > 0) {
        const rows = pairs.map(p => ({
          user_id: userId,
          system_prompt: p.system_prompt,
          user_content: p.user_content,
          assistant_content: p.assistant_content,
          quality_score: p.quality_score,
          source_entry_id: entryId
        }));
        await supabase.from('training_pairs').insert(rows);
        results.training_pairs_saved = pairs.length;
      }
    } catch (e) {
      results.errors.push(`Training: ${e}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `${results.facts_indexed} facts, ${results.training_pairs_saved} training pairs`,
      details: results
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
