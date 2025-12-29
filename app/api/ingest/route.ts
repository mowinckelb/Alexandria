import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools, getEditorTools } from '@/lib/factory';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { refiner, extractor, indexer } = getIngestionTools();
const { editorNotes } = getEditorTools();

export async function POST(req: Request) {
  try {
    const { text, userId } = await req.json();

    const results = {
      facts_indexed: 0,
      memory_items_stored: 0,
      training_pairs_saved: 0,
      editor_notes_generated: 0,
      errors: [] as string[]
    };

    // 1. Save Raw Entry (Axiomatic preservation)
    let entryId: string | null = null;
    try {
      const { data, error: entryError } = await supabase
        .from('entries')
        .insert({ user_id: userId, content: text, source: 'api:ingest' })
        .select('id')
        .single();

      if (entryError) throw entryError;
      entryId = data?.id || null;
    } catch (e) {
      results.errors.push(`Entry storage: ${e instanceof Error ? e.message : e}`);
    }

    // 2. Objective Path - Extract and index
    try {
      const structure = await extractor.structure(text);
      results.facts_indexed = structure.facts.length;

      const memoryItems = extractor.toMemoryItems(structure);
      for (const item of memoryItems) {
        try {
          await indexer.ingest(item, userId, {
            entities: structure.entities,
            importance: structure.importance
          });
          results.memory_items_stored++;
        } catch (e) {
          results.errors.push(`Memory store: ${e instanceof Error ? e.message : e}`);
        }
      }
    } catch (e) {
      results.errors.push(`Extraction: ${e instanceof Error ? e.message : e}`);
    }

    // 3. Subjective Path - Save training pairs (Soul)
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
        const { error } = await supabase.from('training_pairs').insert(rows);
        if (error) throw error;
        results.training_pairs_saved = pairs.length;
      }
    } catch (e) {
      results.errors.push(`Training: ${e instanceof Error ? e.message : e}`);
    }

    // 4. Editor Notes (Questions, Observations, Gaps)
    try {
      const notes = await editorNotes.analyzeAndGenerateNotes(text, userId, entryId || undefined);
      results.editor_notes_generated = notes.length;
    } catch (e) {
      // Non-critical
      console.error('[Ingest] Editor Notes error:', e);
    }

    return NextResponse.json({
      success: true,
      summary: {
        storage: {
          entries: entryId ? 1 : 0,
          memoryItems: results.memory_items_stored,
          trainingPairs: results.training_pairs_saved,
          editorNotes: results.editor_notes_generated
        },
        errors: results.errors.length > 0 ? results.errors : undefined
      }
    });
  } catch (error) {
    console.error('Ingest error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
