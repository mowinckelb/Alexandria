import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getIngestionTools } from '@/lib/factory';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const { refiner, extractor, indexer, tuner } = getIngestionTools();

export async function POST(req: Request) {
  try {
    const { text, userId } = await req.json();

    // Track what was processed
    const results = {
      raw_saved: false,
      facts_extracted: 0,
      facts_indexed: 0,
      training_started: false,
      errors: [] as string[]
    };

    // 1. Save Raw Entry (skip FK constraint for MVP - will fail silently if user doesn't exist)
    try {
      await supabase.from('entries').insert({ user_id: userId, content: text });
      results.raw_saved = true;
    } catch (e) {
      results.errors.push(`Raw save failed: ${e}`);
    }
    
    // 2. Check existing twin state
    const { data: twin } = await supabase.from('twins').select('model_id').eq('user_id', userId).single();

    // 3. Objective Path - Extract and index facts
    try {
      const structure = await extractor.structure(text);
      results.facts_extracted = structure.facts.length;
      
      for (const fact of structure.facts) {
        try {
          await indexer.ingest(fact, userId, { 
            entities: structure.entities, 
            importance: structure.importance 
          });
          results.facts_indexed++;
        } catch (e) {
          results.errors.push(`Indexing failed for fact: ${e}`);
        }
      }
    } catch (e) {
      results.errors.push(`Extraction failed: ${e}`);
    }

    // 4. Subjective Path - Generate training data (MVP: log only, no actual training)
    try {
      const jsonl = await refiner.extractStyle(text);
      const fileId = await tuner.upload(jsonl);
      const jobId = await tuner.train(fileId, userId, twin?.model_id);
      
      if (jobId) {
        await supabase.from('twins').upsert({ 
          user_id: userId, 
          training_job_id: jobId, 
          status: 'training' 
        });
        results.training_started = true;
      }
    } catch (e) {
      results.errors.push(`Training pipeline: ${e}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed: ${results.facts_indexed}/${results.facts_extracted} facts indexed`,
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
